import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AppData, Category, Lecturer, QuestionType, Submission } from '../types';
import { getAppData, updateCategories, updateLecturers, deleteSubmission } from '../services/storageService';
import { emitDataUpdated, onDataUpdated } from '../services/socketService';
import { FACULTIES } from '../constants';
import { Settings, BarChart3, Users, BookOpen, LogOut, Plus, Trash2, Save, Loader2, Download, Upload, FileSpreadsheet, AlertTriangle, X, List, AlignLeft, CheckSquare, Search, Eye, FileText, Calendar, Filter, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'analytics' | 'questions' | 'data' | 'results';

// Modal State Interface
interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'danger' | 'success'; 
    onConfirm: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [data, setData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('questions'); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Local state for edits
  const [editedCategories, setEditedCategories] = useState<Category[]>([]);
  const [editedLecturers, setEditedLecturers] = useState<Lecturer[]>([]);
  
  // Track if user has manually edited something
  const [isCategoriesDirty, setIsCategoriesDirty] = useState(false);
  const [isLecturersDirty, setIsLecturersDirty] = useState(false);
  
  // State for Results Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // State for Analytics Tab (Visualisasi)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Modal State
  const [modal, setModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  useEffect(() => {
    loadData();

    // Listen for real-time updates from other devices
    const cleanup = onDataUpdated(() => {
      console.log("Admin: Syncing data from other device...");
      loadData(true); // Silent update
    });

    // Warning when leaving with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCategoriesDirty || isLecturersDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isCategoriesDirty, isLecturersDirty]);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    const d = await getAppData();
    setData(d);
    
    // Only overwrite local edits if they haven't been modified by the user
    if (!isCategoriesDirty || !silent) {
        setEditedCategories(d.categories);
    }
    if (!isLecturersDirty || !silent) {
        setEditedLecturers(d.lecturers);
    }

    // Default tab logic
    if (d.submissions.length > 0 && !silent) {
        setActiveTab('analytics');
    }
    
    // Set default selected question for analytics
    if (d.categories.length > 0 && d.categories[0].questions.length > 0 && !selectedQuestionId) {
        setSelectedQuestionId(d.categories[0].questions[0].id);
    }

    if (!silent) setIsLoading(false);
  };

  // Helper to trigger modal
  const confirmAction = (title: string, message: string, onConfirm: () => void, type: 'info' | 'danger' | 'success' = 'info') => {
    setModal({
        isOpen: true,
        title,
        message,
        type,
        onConfirm: () => {
            onConfirm();
            setModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const handleSaveCategories = async () => {
    confirmAction(
        "Simpan Struktur Kuesioner?",
        "Perubahan pada kategori dan pertanyaan akan disimpan ke sistem. Pastikan tipe pertanyaan dan opsi (jika ada) sudah benar.",
        async () => {
            await updateCategories(editedCategories);
            setIsCategoriesDirty(false); // Reset dirty state
            emitDataUpdated(); // Notify other devices
            alert('Pengaturan pertanyaan berhasil disimpan!');
            loadData();
        }
    );
  };

  const handleSaveData = async () => {
    if (editedLecturers.length === 0) {
        alert("Tidak ada data dosen untuk disimpan. Silakan tambah manual atau import Excel terlebih dahulu.");
        return;
    }
    
    confirmAction(
        "Simpan Data Dosen?",
        `Anda akan menyimpan ${editedLecturers.length} data dosen. Database lama akan diperbarui.`,
        async () => {
            await updateLecturers(editedLecturers);
            setIsLecturersDirty(false); // Reset dirty state
            emitDataUpdated(); // Notify other devices
            alert('Data Dosen berhasil disimpan!');
            loadData();
        }
    );
  };

  const handleDeleteSubmission = (id: string, name: string) => {
    confirmAction(
        "Hapus Laporan?",
        `Anda yakin ingin menghapus laporan dari ${name}? Tindakan ini tidak dapat dibatalkan.`,
        async () => {
            try {
                await deleteSubmission(id);
                emitDataUpdated(); // Notify other devices
                loadData();
                alert('Laporan berhasil dihapus.');
            } catch (error) {
                alert('Gagal menghapus laporan.');
            }
        },
        'danger'
    );
  };

  // --- Excel Handlers ---
  const handleExportExcel = () => {
    const dataToExport = editedLecturers.map(l => ({
      "NIP": l.nip || "",
      "Nama Lengkap": l.name,
      "Unit / Departemen": l.department,
      "ID Sistem (Jangan Ubah)": l.id
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Dosen");
    XLSX.writeFile(wb, "Data_Dosen_PDB.xlsx");
  };

  const handleExportResults = () => {
    if (!data) return;

    // Flatten data: 1 row per submission, columns for every question
    const flatData = data.submissions.map(sub => {
        const row: any = {
            "Waktu": new Date(sub.timestamp).toLocaleString('id-ID'),
            "NIP": sub.nip,
            "Nama Dosen": sub.lecturerName,
            "Mata Kuliah": sub.subject,
            "Kode Kelas": sub.classCode,
            "Semester": sub.semester,
        };

        // Add Answers
        data.categories.forEach(cat => {
            cat.questions.forEach(q => {
                // Key format: [Category] Question Text
                const key = `[${cat.title}] ${q.text}`;
                const val = sub.answers[q.id];
                // Map Likert number to text for readability in Excel
                if (q.type === 'likert' && typeof val === 'number') {
                     const labels = ["", "Sangat Kurang", "Kurang", "Cukup", "Baik", "Sangat Baik"];
                     row[key] = `${val} - ${labels[val] || ''}`; 
                } else {
                     row[key] = val || '-';
                }
            });
        });

        // Add feedback
        row["Catatan Positif"] = sub.positiveFeedback || '-';
        row["Kendala/Hambatan"] = sub.constructiveFeedback || '-';

        return row;
    });

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Monev Lengkap");
    XLSX.writeFile(wb, "Hasil_Monev_PDB_Lengkap.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      
      const importedLecturers: Lecturer[] = jsonData.map((row: any) => ({
        id: row["ID Sistem (Jangan Ubah)"] || `L${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        nip: String(row["NIP"] || row["nip"] || "").trim(),
        name: row["Nama Lengkap"] || row["name"] || "",
        department: row["Unit / Departemen"] || row["department"] || ""
      })).filter(l => l.name); 

      if (importedLecturers.length > 0) {
        confirmAction(
            "Gabungkan Data (Smart Update)?",
            `Ditemukan ${importedLecturers.length} data dosen dari Excel.\n\nSistem akan:\n1. UPDATE dosen yang NIP-nya sama.\n2. TAMBAH dosen baru jika NIP belum ada.\n3. PERTAHANKAN data lama yang tidak ada di Excel.\n\nLanjutkan proses penggabungan?`,
            () => {
                const currentLecturers = [...editedLecturers];
                let updatedCount = 0;
                let addedCount = 0;

                importedLecturers.forEach(imported => {
                    const existingIndex = imported.nip 
                        ? currentLecturers.findIndex(curr => String(curr.nip).trim() === imported.nip)
                        : -1;

                    if (existingIndex !== -1) {
                        currentLecturers[existingIndex] = {
                            ...currentLecturers[existingIndex],
                            name: imported.name,
                            department: imported.department
                        };
                        updatedCount++;
                    } else {
                        currentLecturers.push(imported);
                        addedCount++;
                    }
                });
                setEditedLecturers(currentLecturers);
                setTimeout(() => {
                    alert(`Proses Selesai!\n- Data Diperbarui: ${updatedCount}\n- Data Baru Ditambahkan: ${addedCount}`);
                }, 500);
            },
            'success'
        );
      } else {
        alert("Tidak ada data valid ditemukan dalam file Excel.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  // --- Category Management ---
  const handleAddCategory = () => {
    const newCategory: Category = {
        id: `cat_${Date.now()}`,
        title: "Judul Kategori Baru",
        description: "Deskripsi singkat kategori ini...",
        questions: [
            { id: `q_${Date.now()}_1`, text: "Pertanyaan pertama...", type: 'likert' }
        ]
    };
    setEditedCategories([...editedCategories, newCategory]);
    setIsCategoriesDirty(true);
  };

  const handleDeleteCategory = (index: number) => {
    confirmAction(
        "Hapus Kategori?",
        "Hapus seluruh kategori ini beserta semua pertanyaan di dalamnya? Tindakan ini tidak dapat dibatalkan.",
        () => {
            const newCats = editedCategories.filter((_, i) => i !== index);
            setEditedCategories(newCats);
            setIsCategoriesDirty(true);
        },
        'danger'
    );
  };

  const handleUpdateQuestionType = (catIdx: number, qIdx: number, type: QuestionType) => {
    const newCats = [...editedCategories];
    newCats[catIdx].questions[qIdx].type = type;
    // Init options if switching to choice
    if (type === 'choice' && !newCats[catIdx].questions[qIdx].options) {
        newCats[catIdx].questions[qIdx].options = ["Opsi 1", "Opsi 2"];
    }
    setEditedCategories(newCats);
    setIsCategoriesDirty(true);
  };

  const handleOptionChange = (catIdx: number, qIdx: number, optIdx: number, value: string) => {
    const newCats = [...editedCategories];
    if (newCats[catIdx].questions[qIdx].options) {
        newCats[catIdx].questions[qIdx].options![optIdx] = value;
    }
    setEditedCategories(newCats);
    setIsCategoriesDirty(true);
  };

  const handleAddOption = (catIdx: number, qIdx: number) => {
    const newCats = [...editedCategories];
    if (!newCats[catIdx].questions[qIdx].options) newCats[catIdx].questions[qIdx].options = [];
    newCats[catIdx].questions[qIdx].options!.push(`Opsi Baru`);
    setEditedCategories(newCats);
    setIsCategoriesDirty(true);
  };

  const handleRemoveOption = (catIdx: number, qIdx: number, optIdx: number) => {
    const newCats = [...editedCategories];
    if (newCats[catIdx].questions[qIdx].options) {
        newCats[catIdx].questions[qIdx].options = newCats[catIdx].questions[qIdx].options!.filter((_, i) => i !== optIdx);
    }
    setEditedCategories(newCats);
    setIsCategoriesDirty(true);
  };

  // --- Analysis Logic ---
  const getQuestionAnalysis = useMemo(() => {
    if (!data || !selectedQuestionId) return null;

    // 1. Find the question object
    let question: any = null;
    let categoryTitle = '';
    
    for (const cat of data.categories) {
        const q = cat.questions.find(fq => fq.id === selectedQuestionId);
        if (q) {
            question = q;
            categoryTitle = cat.title;
            break;
        }
    }

    if (!question) return null;

    // 2. Process Submissions for this question
    const answers = data.submissions
        .map(sub => sub.answers[selectedQuestionId])
        .filter(val => val !== undefined && val !== null && val !== '');

    const totalResponses = answers.length;

    // 3. Prepare Data based on Type
    let chartData = [];
    let stats = { avg: 0 };
    
    if (question.type === 'likert' || !question.type) {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        let count = 0;

        answers.forEach(val => {
            const num = Number(val);
            if (!isNaN(num) && num >= 1 && num <= 5) {
                counts[num] = (counts[num] || 0) + 1;
                sum += num;
                count++;
            }
        });

        stats.avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
        
        const labels = ["", "Sangat Kurang", "Kurang", "Cukup", "Baik", "Sangat Baik"];
        chartData = [1, 2, 3, 4, 5].map(score => ({
            name: labels[score],
            score: score,
            value: counts[score] || 0
        }));
    
    } else if (question.type === 'choice') {
        const counts: Record<string, number> = {};
        answers.forEach(val => {
            const str = String(val);
            counts[str] = (counts[str] || 0) + 1;
        });
        
        chartData = Object.keys(counts).map(key => ({
            name: key,
            value: counts[key]
        }));
    } else {
        // Text type just returns raw answers
        chartData = answers.map(a => ({ text: String(a) }));
    }

    return { question, categoryTitle, chartData, stats, totalResponses };

  }, [data, selectedQuestionId]);


  if (isLoading || !data) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 gap-2">
            <Loader2 className="animate-spin" /> Memuat Panel Admin...
        </div>
      );
  }

  const COLORS = ['#002060', '#FFC000', '#00C49F', '#FF8042', '#8884d8', '#ffc658'];
  
  // Filter submissions for Results Tab
  const filteredSubmissions = data.submissions.filter(s => 
    s.lecturerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 relative">
      
      {/* --- CONFIRMATION MODAL --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all">
                <div className={`px-6 py-4 flex items-center gap-3 border-b ${
                    modal.type === 'danger' ? 'bg-red-50 border-red-100' : 
                    modal.type === 'success' ? 'bg-green-50 border-green-100' :
                    'bg-blue-50 border-blue-100'
                }`}>
                    <div className={`p-2 rounded-full ${
                        modal.type === 'danger' ? 'bg-red-100 text-red-600' : 
                        modal.type === 'success' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                    }`}>
                        {modal.type === 'danger' ? <AlertTriangle size={24} /> : 
                         modal.type === 'success' ? <FileSpreadsheet size={24} /> :
                         <AlertTriangle size={24} />}
                    </div>
                    <h3 className={`text-lg font-bold ${
                        modal.type === 'danger' ? 'text-red-900' : 
                        modal.type === 'success' ? 'text-green-900' :
                        'text-blue-900'
                    }`}>
                        {modal.title}
                    </h3>
                    <button 
                        onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                        className="ml-auto text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
                        {modal.message}
                    </p>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                    <button 
                        onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                        className="px-5 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-200 transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={modal.onConfirm}
                        className={`px-5 py-2.5 rounded-lg text-white font-bold shadow-sm transition-colors flex items-center gap-2 ${
                            modal.type === 'danger' 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-unair-blue hover:bg-blue-900'
                        }`}
                    >
                       {modal.type === 'info' ? <Save size={18} /> : 
                        modal.type === 'success' ? <Upload size={18} /> :
                        <AlertTriangle size={18} />}
                       Ya, Lanjutkan
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- SUBMISSION DETAIL MODAL --- */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-unair-blue text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">Detail Hasil Monev</h3>
                        <div className="flex gap-4 text-xs text-blue-200 mt-1">
                            <span className="flex items-center gap-1"><Users size={12}/> {selectedSubmission.lecturerName}</span>
                            <span className="flex items-center gap-1"><BookOpen size={12}/> {selectedSubmission.subject}</span>
                            <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(selectedSubmission.timestamp).toLocaleDateString('id-ID')}</span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedSubmission(null)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-slate-50">
                    {data.categories.map((cat, idx) => (
                        <div key={cat.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                            <h4 className="font-bold text-unair-blue mb-4 border-b pb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs">{idx + 1}</span>
                                {cat.title}
                            </h4>
                            <div className="space-y-4">
                                {cat.questions.map((q) => {
                                    const val = selectedSubmission.answers[q.id];
                                    return (
                                        <div key={q.id} className="flex flex-col sm:flex-row gap-4 border-b border-slate-50 last:border-0 pb-3">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-700">{q.text}</p>
                                            </div>
                                            <div className="sm:w-1/3 text-right">
                                                {q.type === 'likert' && typeof val === 'number' ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        val >= 4 ? 'bg-green-100 text-green-800' :
                                                        val === 3 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        Skor: {val}/5
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-800 font-semibold bg-slate-100 px-3 py-1 rounded-lg inline-block">
                                                        {val || '-'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Admin Navbar */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="text-unair-blue" />
                Panel Admin
            </h2>
            <button onClick={onLogout} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                <LogOut size={16} /> Keluar
            </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-6 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('questions')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'questions' ? 'border-unair-blue text-unair-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <BookOpen size={18} /> Atur Kuisioner
            </button>
            <button 
                onClick={() => setActiveTab('data')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'data' ? 'border-unair-blue text-unair-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Users size={18} /> Data Dosen
            </button>
            <button 
                onClick={() => setActiveTab('results')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'results' ? 'border-unair-blue text-unair-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <FileText size={18} /> Hasil Monev
            </button>
            <button 
                onClick={() => setActiveTab('analytics')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'border-unair-blue text-unair-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <BarChart3 size={18} /> Visualisasi Data
            </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* --- ANALYTICS TAB (UPDATED) --- */}
        {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                {data.submissions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <BarChart3 className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-600">Belum Ada Data Masuk</h3>
                        <p className="text-slate-400">Visualisasi akan muncul setelah dosen mengisi laporan.</p>
                    </div>
                ) : (
                    <>
                        {/* 1. Filter Section */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                             <div className="flex items-center gap-2 mb-2 text-slate-700 font-bold">
                                <Filter size={18} className="text-unair-blue" />
                                Pilih Pertanyaan untuk Dianalisis
                             </div>
                             <select 
                                className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-unair-blue outline-none"
                                value={selectedQuestionId}
                                onChange={(e) => setSelectedQuestionId(e.target.value)}
                             >
                                 {data.categories.map(cat => (
                                     <optgroup key={cat.id} label={cat.title}>
                                         {cat.questions.map(q => (
                                             <option key={q.id} value={q.id}>
                                                 {q.text.length > 100 ? q.text.substring(0, 100) + '...' : q.text}
                                             </option>
                                         ))}
                                     </optgroup>
                                 ))}
                             </select>
                        </div>

                        {/* 2. Analysis Content */}
                        {getQuestionAnalysis ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left: Info Card */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-unair-blue">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Kategori</p>
                                        <p className="font-semibold text-slate-700 mb-4">{getQuestionAnalysis.categoryTitle}</p>
                                        
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Pertanyaan</p>
                                        <p className="font-bold text-slate-800 text-lg leading-snug">
                                            {getQuestionAnalysis.question.text}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                                         <p className="text-slate-500 font-medium mb-2">Total Responden</p>
                                         <p className="text-4xl font-bold text-slate-800">{getQuestionAnalysis.totalResponses}</p>
                                    </div>

                                    {/* Show Average only for Likert */}
                                    {(getQuestionAnalysis.question.type === 'likert' || !getQuestionAnalysis.question.type) && (
                                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                                            <p className="text-slate-500 font-medium mb-2">Rata-rata Skor</p>
                                            <div className="text-4xl font-bold text-unair-yellow flex items-center gap-2">
                                                {getQuestionAnalysis.stats.avg} 
                                                <span className="text-base text-slate-400 font-normal">/ 5.0</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Chart / List */}
                                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
                                    
                                    {/* LIKERT: Bar Chart */}
                                    {(getQuestionAnalysis.question.type === 'likert' || !getQuestionAnalysis.question.type) && (
                                        <>
                                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                                <BarChart3 size={20} className="text-unair-blue"/>
                                                Distribusi Jawaban
                                            </h3>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart 
                                                        data={getQuestionAnalysis.chartData} 
                                                        layout="vertical" 
                                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" allowDecimals={false} />
                                                        <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '12px', fontWeight: 500 }} />
                                                        <Tooltip 
                                                            cursor={{fill: 'transparent'}}
                                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        />
                                                        <Bar dataKey="value" fill="#002060" radius={[0, 4, 4, 0]} barSize={30}>
                                                            {/* Optional: Color based on score */}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </>
                                    )}

                                    {/* CHOICE: Pie Chart */}
                                    {getQuestionAnalysis.question.type === 'choice' && (
                                        <>
                                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                                <BarChart3 size={20} className="text-unair-blue"/>
                                                Persentase Jawaban
                                            </h3>
                                            <div className="h-[300px] w-full flex justify-center">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={getQuestionAnalysis.chartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={100}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                                        >
                                                            {getQuestionAnalysis.chartData.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend verticalAlign="bottom" height={36}/>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </>
                                    )}

                                    {/* TEXT: List View */}
                                    {getQuestionAnalysis.question.type === 'text' && (
                                        <>
                                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                <MessageSquare size={20} className="text-unair-blue"/>
                                                Daftar Jawaban Responden
                                            </h3>
                                            <div className="bg-slate-50 rounded-lg border border-slate-200 max-h-[400px] overflow-y-auto p-2">
                                                {getQuestionAnalysis.chartData.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {getQuestionAnalysis.chartData.map((item: any, idx: number) => (
                                                            <li key={idx} className="bg-white p-3 rounded shadow-sm border border-slate-100 text-sm text-slate-700">
                                                                "{item.text}"
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="text-center py-8 text-slate-400 italic">
                                                        Belum ada jawaban teks.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                Pilih pertanyaan di atas untuk melihat analisis detail.
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {/* --- RESULTS TAB (NEW) --- */}
        {activeTab === 'results' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder="Cari Nama Dosen / NIP / Matkul..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-unair-blue outline-none text-sm"
                        />
                    </div>
                    <button 
                        onClick={handleExportResults}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <FileSpreadsheet size={16} /> Download Laporan (Excel)
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {filteredSubmissions.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p>Tidak ada data ditemukan.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-16 text-center">No</th>
                                        <th className="p-4">Tanggal</th>
                                        <th className="p-4">Nama Dosen</th>
                                        <th className="p-4">Mata Kuliah</th>
                                        <th className="p-4">Semester</th>
                                        <th className="p-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubmissions.map((sub, idx) => (
                                        <tr key={sub.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-4 text-center text-slate-500">{idx + 1}</td>
                                            <td className="p-4 text-slate-600 whitespace-nowrap">
                                                {new Date(sub.timestamp).toLocaleDateString('id-ID')}
                                                <div className="text-xs text-slate-400">{new Date(sub.timestamp).toLocaleTimeString('id-ID')}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{sub.lecturerName}</div>
                                                <div className="text-xs text-slate-500">{sub.nip}</div>
                                            </td>
                                            <td className="p-4 text-slate-700">{sub.subject}</td>
                                            <td className="p-4 text-slate-600">{sub.semester}</td>
                                            <td className="p-4 text-center flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedSubmission(sub)}
                                                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                                                >
                                                    <Eye size={14} /> Detail
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteSubmission(sub.id, sub.lecturerName)}
                                                    className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                                                    title="Hapus Laporan"
                                                >
                                                    <Trash2 size={14} /> Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- QUESTION SETTINGS TAB --- */}
        {activeTab === 'questions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">Atur kategori dan pertanyaan. Anda bisa memilih tipe (Likert, Pilihan Ganda, atau Isian).</p>
                    <button 
                        onClick={handleSaveCategories}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                            isCategoriesDirty 
                            ? 'bg-unair-yellow text-unair-blue shadow-lg scale-105 ring-4 ring-unair-yellow/20' 
                            : 'bg-unair-blue text-white hover:bg-blue-900'
                        }`}
                    >
                        <Save size={16} /> {isCategoriesDirty ? 'SIMPAN PERUBAHAN' : 'Simpan Struktur'}
                    </button>
                </div>

                {isCategoriesDirty && (
                    <div className="bg-unair-yellow/10 border border-unair-yellow/30 p-3 rounded-lg flex items-center gap-3 animate-pulse">
                        <AlertTriangle className="text-unair-yellow" size={20} />
                        <p className="text-sm font-bold text-unair-blue">
                            Ada perubahan yang belum disimpan! Klik tombol kuning di atas untuk menyimpan ke database.
                        </p>
                    </div>
                )}

                {/* EMPTY STATE - Show Button when 0 categories */}
                {editedCategories.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <List className="text-slate-400" size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Kategori Pertanyaan</h3>
                        <p className="text-slate-500 mb-6 max-w-md">
                            Mulai dengan membuat kategori utama (misal: "Evaluasi Pembelajaran") lalu tambahkan pertanyaan di dalamnya.
                        </p>
                        <button 
                            onClick={handleAddCategory}
                            className="bg-unair-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={20} /> Buat Kategori Pertama
                        </button>
                    </div>
                )}

                {editedCategories.map((cat, catIdx) => (
                    <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 pr-16">
                            <input 
                                className="font-bold text-lg text-slate-800 bg-transparent border-none focus:ring-0 w-full placeholder:text-slate-400"
                                placeholder="Judul Kategori"
                                value={cat.title}
                                onChange={(e) => {
                                    const newCats = [...editedCategories];
                                    newCats[catIdx].title = e.target.value;
                                    setEditedCategories(newCats);
                                    setIsCategoriesDirty(true);
                                }}
                            />
                            <input 
                                className="text-sm text-slate-500 bg-transparent border-none focus:ring-0 w-full mt-1 placeholder:text-slate-400"
                                placeholder="Deskripsi kategori..."
                                value={cat.description}
                                onChange={(e) => {
                                    const newCats = [...editedCategories];
                                    newCats[catIdx].description = e.target.value;
                                    setEditedCategories(newCats);
                                    setIsCategoriesDirty(true);
                                }}
                            />
                            
                            <button 
                                onClick={() => handleDeleteCategory(catIdx)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2 bg-slate-100 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {cat.questions.map((q, qIdx) => (
                                <div key={q.id} className="flex gap-4 items-start border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                                    <div className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-1">
                                        {qIdx + 1}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {/* Question Text & Type Selector */}
                                        <div className="flex gap-2">
                                            <textarea 
                                                className="flex-1 p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                                                rows={2}
                                                placeholder="Teks Pertanyaan"
                                                value={q.text}
                                                onChange={(e) => {
                                                    const newCats = [...editedCategories];
                                                    newCats[catIdx].questions[qIdx].text = e.target.value;
                                                    setEditedCategories(newCats);
                                                    setIsCategoriesDirty(true);
                                                }}
                                            />
                                            <div className="w-40 shrink-0">
                                                <select 
                                                    className="w-full p-2 border border-slate-300 rounded-md text-xs font-medium bg-slate-50 text-slate-700"
                                                    value={q.type || 'likert'}
                                                    onChange={(e) => handleUpdateQuestionType(catIdx, qIdx, e.target.value as QuestionType)}
                                                >
                                                    <option value="likert">Skala Likert (1-5)</option>
                                                    <option value="choice">Pilihan Ganda</option>
                                                    <option value="text">Isian Singkat</option>
                                                </select>
                                                
                                                {/* Icon indicator based on type */}
                                                <div className="mt-2 text-center text-slate-400">
                                                    {(q.type === 'likert' || !q.type) && <List size={20} className="mx-auto" />}
                                                    {q.type === 'choice' && <CheckSquare size={20} className="mx-auto" />}
                                                    {q.type === 'text' && <AlignLeft size={20} className="mx-auto" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Multiple Choice Options Editor */}
                                        {q.type === 'choice' && (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Opsi Jawaban:</p>
                                                <div className="space-y-2">
                                                    {q.options?.map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex gap-2 items-center">
                                                            <div className="w-3 h-3 rounded-full border border-slate-400 bg-white shrink-0" />
                                                            <input 
                                                                className="flex-1 text-sm bg-transparent border-b border-slate-300 focus:border-unair-blue outline-none py-1"
                                                                value={opt}
                                                                onChange={(e) => handleOptionChange(catIdx, qIdx, optIdx, e.target.value)}
                                                                placeholder={`Opsi ${optIdx + 1}`}
                                                            />
                                                            <button 
                                                                onClick={() => handleRemoveOption(catIdx, qIdx, optIdx)}
                                                                className="text-slate-400 hover:text-red-500"
                                                                disabled={q.options && q.options.length <= 1}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => handleAddOption(catIdx, qIdx)}
                                                        className="text-xs text-unair-blue font-bold flex items-center gap-1 mt-2 hover:underline"
                                                    >
                                                        <Plus size={12} /> Tambah Opsi
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => {
                                            const newCats = [...editedCategories];
                                            newCats[catIdx].questions = newCats[catIdx].questions.filter((_, i) => i !== qIdx);
                                            setEditedCategories(newCats);
                                            setIsCategoriesDirty(true);
                                        }}
                                        className="text-red-300 hover:text-red-600 p-2"
                                        title="Hapus Pertanyaan"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => {
                                    const newCats = [...editedCategories];
                                    const newId = `q_new_${Date.now()}`;
                                    newCats[catIdx].questions.push({ 
                                        id: newId, 
                                        text: "Pertanyaan baru...", 
                                        type: 'likert' // Default type
                                    });
                                    setEditedCategories(newCats);
                                    setIsCategoriesDirty(true);
                                }}
                                className="text-sm text-unair-blue font-semibold hover:underline flex items-center gap-1 mt-2"
                            >
                                <Plus size={16} /> Tambah Pertanyaan
                            </button>
                        </div>
                    </div>
                ))}

                {editedCategories.length > 0 && (
                    <div className="flex justify-center pt-4">
                         <button 
                            onClick={handleAddCategory}
                            className="bg-white border-2 border-dashed border-slate-300 text-slate-500 px-6 py-3 rounded-xl text-sm font-bold hover:border-unair-blue hover:text-unair-blue flex items-center gap-2 transition-colors w-full justify-center"
                        >
                            <Plus size={20} /> Tambah Kategori Baru
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- DATA SETTINGS TAB --- */}
        {activeTab === 'data' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                
                {/* Excel Actions */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center">
                   <div className="flex items-center gap-2 text-slate-700">
                      <FileSpreadsheet size={20} className="text-green-600"/>
                      <span className="font-semibold text-sm">Manajemen Data Excel</span>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 border border-green-200 transition-colors"
                      >
                         <Download size={16} /> Export
                      </button>
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                         <Upload size={16} /> Import
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".xlsx, .xls"
                        onChange={handleImportExcel}
                      />
                   </div>
                </div>

                {/* Lecturers Table */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Daftar Dosen Pengampu</h3>
                        <button 
                            onClick={handleSaveData} 
                            disabled={editedLecturers.length === 0}
                            className={`flex items-center gap-2 text-xs text-white px-4 py-2 rounded shadow-sm transition-colors ${
                                editedLecturers.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-unair-blue hover:bg-blue-900'
                            }`}
                        >
                            <Save size={14} /> Simpan Perubahan
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {editedLecturers.length === 0 ? (
                             <div className="p-8 text-center text-slate-500 text-sm">Belum ada data dosen.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                {editedLecturers.map((l, idx) => (
                                    <li key={l.id} className="p-4 flex gap-2 items-start group hover:bg-slate-50 transition-colors">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-2">
                                                {/* NIP Input */}
                                                <input 
                                                    className="w-1/3 text-sm font-semibold border border-slate-200 bg-white rounded px-2 py-1 placeholder:text-slate-400 focus:ring-1 focus:ring-unair-blue focus:border-unair-blue outline-none"
                                                    placeholder="NIP"
                                                    value={l.nip || ""}
                                                    onChange={(e) => {
                                                        const newL = [...editedLecturers];
                                                        newL[idx].nip = e.target.value;
                                                        setEditedLecturers(newL);
                                                    }}
                                                />
                                                {/* Name Input */}
                                                <input 
                                                    className="w-2/3 text-sm font-semibold border border-slate-200 bg-white rounded px-2 py-1 placeholder:text-slate-400 focus:ring-1 focus:ring-unair-blue focus:border-unair-blue outline-none"
                                                    placeholder="Nama Lengkap & Gelar"
                                                    value={l.name}
                                                    onChange={(e) => {
                                                        const newL = [...editedLecturers];
                                                        newL[idx].name = e.target.value;
                                                        setEditedLecturers(newL);
                                                    }}
                                                />
                                            </div>
                                            {/* Faculty Dropdown */}
                                            <select 
                                                className="w-full text-xs text-slate-500 border border-slate-200 bg-white rounded px-2 py-1 placeholder:text-slate-300 focus:ring-1 focus:ring-unair-blue focus:border-unair-blue outline-none"
                                                value={l.department}
                                                onChange={(e) => {
                                                    const newL = [...editedLecturers];
                                                    newL[idx].department = e.target.value;
                                                    setEditedLecturers(newL);
                                                }}
                                            >
                                                <option value="">-- Pilih Fakultas --</option>
                                                {FACULTIES.map((f) => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => setEditedLecturers(editedLecturers.filter((_, i) => i !== idx))}
                                            className="text-red-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="p-4 bg-slate-50 border-t border-slate-200">
                             <button 
                                onClick={() => setEditedLecturers([...editedLecturers, { id: `L${Date.now()}`, nip: "", name: "", department: "" }])}
                                className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:border-unair-blue hover:text-unair-blue"
                            >
                                + Tambah Dosen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};
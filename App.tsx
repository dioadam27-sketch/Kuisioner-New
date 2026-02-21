import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuestionItem } from './components/QuestionItem';
import { SuccessScreen } from './components/SuccessScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { SEMESTERS } from './constants';
import { FormData, AppData } from './types';
import { getAppData, addSubmission } from './services/storageService';
import { Send, AlertCircle, Info, Settings, ShieldAlert, LogOut, Loader2 } from 'lucide-react';

const INITIAL_FORM: FormData = {
  nip: '',
  lecturerName: '',
  subject: 'Pembelajaran Dasar Bersama (PDB)', // Default hardcoded
  classCode: '',
  semester: SEMESTERS[0], // Default hardcoded
  answers: {}, 
  positiveFeedback: '',
  constructiveFeedback: ''
};

type ViewState = 'landing' | 'form' | 'success' | 'admin-dashboard';

const STORAGE_KEY_VIEW = 'monev_pdb_view';
const STORAGE_KEY_FORM = 'monev_pdb_form_data';

function App() {
  const [view, setView] = useState<ViewState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW);
    return (saved as ViewState) || 'landing';
  });
  
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FORM);
    return saved ? JSON.parse(saved) : INITIAL_FORM;
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // App Data (Loaded from API)
  const [appData, setAppData] = useState<AppData | null>(null);

  // Local state for displaying faculty (not saved in submission)
  const [lecturerDepartment, setLecturerDepartment] = useState('');

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const data = await getAppData();
        setAppData(data);
        setIsLoading(false);
        
        // Ensure subject matches API data if available AND not already set by persistence
        const savedForm = localStorage.getItem(STORAGE_KEY_FORM);
        if (data.subjects.length > 0 && !savedForm) {
            setFormData(prev => ({ ...prev, subject: data.subjects[0].name }));
        }
    };

    fetchData();
  }, []); // Only on mount

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW, view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData));
  }, [formData]);
  // --- Handlers ---

  const handleLecturerLogin = (nip: string, lecturerName?: string, department?: string) => {
    setFormData(prev => ({ 
        ...prev, 
        nip,
        // Pre-fill name if provided
        lecturerName: lecturerName || prev.lecturerName
    }));
    setLecturerDepartment(department || '');
    setView('form');
  };

  const handleAdminLogin = () => {
    setView('admin-dashboard');
  };

  const handleAnswerChange = (id: string, val: string | number) => {
    setFormData(prev => ({
      ...prev,
      answers: { ...prev.answers, [id]: val }
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors: string[] = [];
    if (!formData.lecturerName) newErrors.push("Silakan pilih Nama Dosen (Diri Sendiri).");
    if (!formData.subject) newErrors.push("Silakan pilih Mata Kuliah yang diampu.");
    
    // Check if all questions are answered
    if (appData) {
        const totalQuestions = appData.categories.reduce((acc, cat) => acc + cat.questions.length, 0);
        const answeredQuestions = Object.keys(formData.answers).length;
        
        if (answeredQuestions < totalQuestions) {
             newErrors.push(`Harap lengkapi semua pertanyaan (${answeredQuestions}/${totalQuestions} terisi).`);
        }

        // DUPLICATE CHECK: One submission per NIP + Subject + Class + Semester
        const isDuplicate = appData.submissions.some(s => 
            s.nip === formData.nip && 
            s.subject === formData.subject && 
            s.semester === formData.semester &&
            s.classCode === formData.classCode
        );

        if (isDuplicate) {
            newErrors.push(`Anda sudah mengisi kuisioner.`);
        }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await addSubmission(formData);
      setView('success');
      window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY_VIEW);
    localStorage.removeItem(STORAGE_KEY_FORM);
    setFormData(INITIAL_FORM);
    setView('landing'); 
    setErrors([]);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_VIEW);
    localStorage.removeItem(STORAGE_KEY_FORM);
    setView('landing');
  };

  // --- RENDERING ---

  if (isLoading || !appData) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 gap-2">
            <Loader2 className="animate-spin" /> Memuat Data Sistem...
        </div>
    );
  }

  if (view === 'landing') {
    return (
        <LandingPage 
            onLecturerLogin={handleLecturerLogin}
            onAdminLogin={handleAdminLogin}
            lecturers={appData.lecturers}
        />
    );
  }

  if (view === 'admin-dashboard') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  const isConfigured = appData.lecturers.length > 0 && appData.categories.length > 0;

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <Header />
        <SuccessScreen data={formData} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-unair-blue text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="bg-white/10 p-2 rounded-lg">
                <ShieldAlert size={20} className="text-unair-yellow" />
             </div>
             <div>
                <p className="text-xs text-blue-200 uppercase tracking-wider font-bold">Monev Dosen</p>
                <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">NIP: {formData.nip}</p>
                    {formData.lecturerName && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-blue-50">
                            {formData.lecturerName}
                        </span>
                    )}
                </div>
             </div>
           </div>
           <button 
             onClick={handleLogout}
             className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
           >
             <LogOut size={14} /> Keluar
           </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Intro Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-l-4 border-unair-yellow">
          <h2 className="text-xl font-bold text-slate-800">Selamat Datang Bapak/Ibu Dosen</h2>
          <p className="text-slate-500 mt-1">Silakan lengkapi laporan monitoring di bawah ini.</p>
        </div>

        {/* Not Configured State */}
        {!isConfigured ? (
           <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
             <div className="mx-auto bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-sm mb-6">
                <Settings className="text-slate-400" size={40} />
             </div>
             <h2 className="text-2xl font-bold text-slate-700 mb-2">Sistem Belum Dikonfigurasi</h2>
             <p className="text-slate-500 mb-8 max-w-md mx-auto">
               Belum ada data Dosen atau Pertanyaan yang tersedia. 
               Silakan login sebagai Admin untuk melakukan pengaturan awal.
             </p>
             <button
               onClick={() => setView('landing')}
               className="bg-unair-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors inline-flex items-center gap-2"
             >
               <Settings size={20} />
               Kembali ke Login Admin
             </button>
           </div>
        ) : (
          <>
            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
                <div>
                  <h3 className="font-bold text-red-800 mb-1">Mohon Lengkapi Laporan:</h3>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section 1: Identitas */}
              <section className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
                <h3 className="text-lg font-bold text-unair-blue border-b pb-4 mb-6 flex items-center gap-2">
                    <span className="bg-unair-blue text-white w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                    Identitas Pengampu
                </h3>
                
                {/* STATIC INFO: Name, NIP, Faculty */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nama Dosen</p>
                        <p className="font-bold text-slate-800 text-sm sm:text-base">{formData.lecturerName}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">NIP</p>
                        <p className="font-medium text-slate-700 text-sm sm:text-base">{formData.nip}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Fakultas</p>
                        <p className="font-medium text-slate-700 text-sm sm:text-base">{lecturerDepartment || '-'}</p>
                    </div>
                </div>
              </section>

              {/* Section 2...N: Penilaian Dinamis */}
              <section className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                    <Info className="text-unair-blue shrink-0" size={20} />
                    <p className="text-sm text-blue-900">
                        Isilah kuesioner berikut sesuai dengan kondisi yang sebenarnya.
                    </p>
                </div>

                {appData.categories.map((category, idx) => (
                  <div key={category.id} className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
                    <h3 className="text-lg font-bold text-unair-blue border-b pb-2 mb-2 flex items-center gap-2">
                        <span className="bg-unair-blue text-white w-6 h-6 rounded flex items-center justify-center text-xs">{idx + 2}</span>
                        {category.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6">{category.description}</p>
                    
                    <div className="space-y-4">
                      {category.questions.map(q => (
                        <QuestionItem 
                          key={q.id}
                          question={q}
                          value={formData.answers[q.id]}
                          onChange={handleAnswerChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <div className="sticky bottom-4 z-40 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 flex justify-end">
                <button
                  type="submit"
                  className="bg-unair-yellow text-unair-blue font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  Kirim Laporan
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
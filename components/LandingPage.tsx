import React, { useState } from 'react';
import { BarChart3, User, ShieldCheck, ArrowLeft, Loader2, CheckCircle2, Lock, Building2, BadgeCheck, AlertCircle } from 'lucide-react';
import { Lecturer } from '../types';

interface LandingPageProps {
  onLecturerLogin: (nip: string, lecturerName?: string, department?: string) => void;
  onAdminLogin: () => void;
  lecturers: Lecturer[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLecturerLogin, onAdminLogin, lecturers }) => {
  const [activeTab, setActiveTab] = useState<'dosen' | 'admin'>('dosen');
  const [nip, setNip] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  // State for Lecturer Verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [foundLecturer, setFoundLecturer] = useState<Lecturer | null>(null);
  const [error, setError] = useState('');

  const handleVerifyNIP = () => {
    if (!nip || nip.length < 3) {
      setError('NIP tidak valid');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    setFoundLecturer(null);
    
    // Simulate slight network delay for UX
    setTimeout(() => {
      const lecturer = lecturers.find(l => l.nip === nip.trim());
      
      if (lecturer) {
        setFoundLecturer(lecturer);
      } else {
        setError('NIP tidak ditemukan dalam database pengampu.');
      }
      setIsVerifying(false);
    }, 600);
  };

  const handleLecturerSubmit = () => {
    if (foundLecturer) {
      onLecturerLogin(foundLecturer.nip, foundLecturer.name, foundLecturer.department);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === '112233') {
      onAdminLogin();
    } else {
      setError('Kode akses salah');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] p-8 relative overflow-hidden transition-all duration-300">
        
        {/* Top Decoration */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-unair-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 mb-6">
            <BarChart3 className="text-white" size={32} />
          </div>
          
          {activeTab === 'dosen' && (
             <span className="bg-unair-yellow/20 text-unair-yellow text-xs font-bold px-3 py-1 rounded-full mb-3 border border-yellow-200">
               KHUSUS DOSEN
             </span>
          )}

          <h1 className="text-2xl font-bold text-slate-800 text-center">Kuesioner PDB</h1>
          <p className="text-slate-500 text-sm text-center mt-1">Sistem Monitoring & Evaluasi Perkuliahan</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex mb-8">
          <button
            onClick={() => { setActiveTab('dosen'); setError(''); setFoundLecturer(null); setNip(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'dosen' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            Dosen
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'admin' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-600'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Form Content */}
        {activeTab === 'dosen' ? (
          <div className="space-y-6">
             <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 ml-1">NIP</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                    </div>
                    <input
                        type="text"
                        value={nip}
                        onChange={(e) => {
                            setNip(e.target.value);
                            setFoundLecturer(null); // Reset verification on edit
                            setError('');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerifyNIP();
                        }}
                        className={`w-full pl-10 pr-3 py-3 bg-white border ${error ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'} rounded-lg focus:outline-none focus:border-unair-blue focus:ring-1 focus:ring-unair-blue transition-colors text-slate-800 placeholder:text-slate-400`}
                        placeholder="Masukkan NIP Anda"
                    />
                  </div>
                  <button
                    onClick={handleVerifyNIP}
                    disabled={!!foundLecturer || !nip}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        foundLecturer 
                        ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                        : 'bg-blue-50 border-blue-200 text-unair-blue hover:bg-blue-100'
                    }`}
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={18} /> : foundLecturer ? <CheckCircle2 size={18} /> : "Verifikasi"}
                  </button>
                </div>
                {error && (
                    <p className="text-red-500 text-xs mt-2 ml-1 flex items-center gap-1">
                        <AlertCircle size={12}/> {error}
                    </p>
                )}
             </div>

             {/* Lecturer ID Card - Shows only when verified */}
             {foundLecturer && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm text-unair-blue">
                            <BadgeCheck size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-0.5">Data Terverifikasi</p>
                            <h3 className="font-bold text-slate-800 text-sm">{foundLecturer.name}</h3>
                            <p className="text-xs text-slate-600 font-medium mb-1">{foundLecturer.nip}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-2 bg-white/60 px-2 py-1 rounded w-fit">
                                <Building2 size={12} />
                                {foundLecturer.department}
                            </div>
                        </div>
                    </div>
                </div>
             )}

             <button
                onClick={handleLecturerSubmit}
                disabled={!foundLecturer}
                className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
                    foundLecturer 
                    ? 'bg-unair-blue text-white hover:bg-blue-900 transform hover:-translate-y-0.5 shadow-blue-900/20' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
             >
                Masuk Kuesioner
             </button>
          </div>
        ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2 ml-1">Kode Akses</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type="password"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-unair-blue focus:ring-1 focus:ring-unair-blue transition-colors text-slate-800 placeholder:text-slate-400"
                            placeholder="******"
                        />
                    </div>
                     {error && <p className="text-red-500 text-xs mt-2 ml-1">{error}</p>}
                </div>

                <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-lg shadow-sm bg-unair-blue text-white hover:bg-blue-900 transition-all transform hover:-translate-y-0.5"
                >
                    Masuk Dashboard
                </button>
            </form>
        )}

        <div className="mt-8 text-center">
            <button className="text-slate-400 text-sm hover:text-slate-600 flex items-center justify-center gap-2 mx-auto transition-colors">
                <ArrowLeft size={14} /> Kembali ke Portal
            </button>
        </div>

      </div>
    </div>
  );
};
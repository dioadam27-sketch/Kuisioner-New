import React from 'react';
import { CheckCircle, ArrowLeft, BookOpen } from 'lucide-react';
import { FormData } from '../types';

interface SuccessScreenProps {
  data: FormData;
  onReset: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ data, onReset }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} />
      </div>
      
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Terima Kasih!</h2>
      <p className="text-slate-600 mb-8">
        Evaluasi Anda telah berhasil dikirim. Masukan Anda sangat berharga untuk peningkatan kualitas pembelajaran PDB Universitas Airlangga.
      </p>

      <div className="bg-white rounded-xl shadow-md p-6 text-left mb-8 border-t-4 border-unair-yellow">
        <h3 className="text-lg font-bold text-unair-blue mb-4 flex items-center gap-2">
            <BookOpen size={20} />
            Ringkasan Monev
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Dosen</p>
                <p className="font-medium text-slate-800">{data.lecturerName}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Mata Kuliah</p>
                <p className="font-medium text-slate-800">{data.subject}</p>
            </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-unair-blue transition-colors"
      >
        <ArrowLeft size={18} />
        Isi Kuesioner Lain
      </button>
    </div>
  );
};
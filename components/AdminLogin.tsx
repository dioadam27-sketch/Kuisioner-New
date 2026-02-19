import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '112233') {
      onLogin();
    } else {
      setError('Password salah!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-unair-blue p-3 rounded-full text-white mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Login Admin</h2>
          <p className="text-slate-500 text-sm">Masukan kode akses untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-unair-blue outline-none text-center text-lg tracking-widest"
              placeholder="******"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-lg bg-unair-blue text-white font-bold hover:bg-blue-900 transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
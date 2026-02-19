import React from 'react';
import { GraduationCap, LockKeyhole } from 'lucide-react';

interface HeaderProps {
  onAdminClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAdminClick }) => {
  return (
    <header className="bg-unair-blue text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-unair-yellow p-2 rounded-full text-unair-blue">
              <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Monev PDB</h1>
            <p className="text-sm text-yellow-100 opacity-90">Direktorat Pendidikan Universitas Airlangga</p>
          </div>
        </div>
        
        {onAdminClick && (
          <button 
            onClick={onAdminClick}
            className="text-white/50 hover:text-white transition-colors p-2"
            title="Login Admin"
          >
            <LockKeyhole size={20} />
          </button>
        )}
      </div>
      <div className="h-1 bg-unair-yellow w-full"></div>
    </header>
  );
};
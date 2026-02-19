import React from 'react';

interface FeedbackInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

export const FeedbackInput: React.FC<FeedbackInputProps> = ({ 
  label, placeholder, value, onChange 
}) => {
  return (
    <div className="mb-6">
      <div className="mb-2">
        <label className="block font-semibold text-slate-800">{label}</label>
      </div>
      <textarea
        className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] text-slate-700"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
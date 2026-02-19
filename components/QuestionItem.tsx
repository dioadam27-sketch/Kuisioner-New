import React from 'react';
import { Question } from '../types';

interface QuestionItemProps {
  question: Question;
  value: string | number | undefined;
  onChange: (id: string, val: string | number) => void;
}

const LIKERT_RATINGS = [
  { value: 1, label: "Sangat Kurang" },
  { value: 2, label: "Kurang" },
  { value: 3, label: "Cukup" },
  { value: 4, label: "Baik" },
  { value: 5, label: "Sangat Baik" },
];

export const QuestionItem: React.FC<QuestionItemProps> = ({ question, value, onChange }) => {
  const { id, text, type, options } = question;

  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-slate-100 hover:border-blue-100 transition-colors">
      <p className="font-medium text-slate-800 mb-3">{text}</p>
      
      {/* RENDER LIKERT */}
      {(type === 'likert' || !type) && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {LIKERT_RATINGS.map((rating) => (
              <label 
                key={rating.value} 
                className={`
                  flex-1 flex items-center justify-center p-3 rounded-md cursor-pointer border transition-all
                  ${value === rating.value 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}
                `}
              >
                <input
                  type="radio"
                  name={id}
                  value={rating.value}
                  checked={value === rating.value}
                  onChange={() => onChange(id, rating.value)}
                  className="sr-only"
                />
                <div className="flex flex-col items-center justify-center text-center">
                  <span className={`text-sm font-bold mb-1 ${value === rating.value ? 'text-blue-700' : 'text-slate-500'}`}>
                    {rating.value}
                  </span>
                  <span className="text-xs sm:text-sm leading-tight">{rating.label}</span>
                </div>
              </label>
            ))}
          </div>
      )}

      {/* RENDER MULTIPLE CHOICE */}
      {type === 'choice' && options && (
          <div className="space-y-2">
            {options.map((option, idx) => (
                <label 
                    key={idx}
                    className={`
                        flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-all
                        ${value === option 
                            ? 'bg-blue-50 border-blue-500 text-blue-900' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}
                    `}
                >
                    <input 
                        type="radio" 
                        name={id}
                        value={option}
                        checked={value === option}
                        onChange={() => onChange(id, option)}
                        className="w-4 h-4 text-unair-blue border-slate-300 focus:ring-unair-blue"
                    />
                    <span className="text-sm">{option}</span>
                </label>
            ))}
          </div>
      )}

      {/* RENDER TEXT INPUT */}
      {type === 'text' && (
          <textarea 
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
            rows={3}
            placeholder="Ketik jawaban Anda di sini..."
            value={value ? String(value) : ''}
            onChange={(e) => onChange(id, e.target.value)}
          />
      )}
    </div>
  );
};
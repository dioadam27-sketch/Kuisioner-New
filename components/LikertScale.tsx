import React from 'react';
import { Star } from 'lucide-react';

interface LikertScaleProps {
  questionId: string;
  questionText: string;
  value: number;
  onChange: (id: string, val: number) => void;
}

const RATINGS = [
  { value: 1, label: "Sangat Kurang" },
  { value: 2, label: "Kurang" },
  { value: 3, label: "Cukup" },
  { value: 4, label: "Baik" },
  { value: 5, label: "Sangat Baik" },
];

export const LikertScale: React.FC<LikertScaleProps> = ({ questionId, questionText, value, onChange }) => {
  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-slate-100 hover:border-blue-100 transition-colors">
      <p className="font-medium text-slate-800 mb-3">{questionText}</p>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        {RATINGS.map((rating) => (
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
              name={questionId}
              value={rating.value}
              checked={value === rating.value}
              onChange={() => onChange(questionId, rating.value)}
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
    </div>
  );
};
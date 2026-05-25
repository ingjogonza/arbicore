// ============================================
// INPUT COMPONENT
// ============================================

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  masked?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error, 
  helper, 
  icon, 
  masked 
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={masked ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-md text-sm 
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
              : 'border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-teal-200'
            } 
            focus:outline-none focus:ring-2 transition-all
            ${icon ? 'pl-10' : ''} 
            ${masked ? 'pr-10' : ''}
            dark:text-slate-100 placeholder:text-slate-400`}
        />
        {masked && (
          <button 
            type="button" 
            onClick={() => setShow(!show)} 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {helper && !error && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

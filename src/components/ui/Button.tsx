// ============================================
// BUTTON COMPONENT
// ============================================

import type { ButtonVariant, ButtonSize } from '../../types';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  disabled, 
  className = '', 
  type = 'button' 
}) => {
  const base = 'inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50',
    secondary: 'bg-transparent border border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800',
    ghost: 'bg-transparent text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

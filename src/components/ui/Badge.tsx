// ============================================
// BADGE COMPONENT
// ============================================

import type { BadgeVariant } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant }) => {
  const variants: Record<BadgeVariant, string> = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

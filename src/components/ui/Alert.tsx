// ============================================
// ALERT COMPONENT
// ============================================

import type { AlertVariant } from '../../types';

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ children, variant = 'info', icon }) => {
  const variants: Record<AlertVariant, string> = {
    info: 'bg-blue-50 border-l-blue-500 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200',
    success: 'bg-emerald-50 border-l-emerald-500 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200',
    warning: 'bg-amber-50 border-l-amber-500 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
    danger: 'bg-red-50 border-l-red-500 text-red-900 dark:bg-red-900/20 dark:text-red-200',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-md border-l-3 ${variants[variant]}`}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="text-sm">{children}</div>
    </div>
  );
};

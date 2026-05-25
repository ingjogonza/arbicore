// ============================================
// CARD COMPONENT
// ============================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
    {children}
  </div>
);

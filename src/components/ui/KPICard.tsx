// ============================================
// KPI CARD COMPONENT
// ============================================

import { Card } from './Card';

interface KPICardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  icon: React.ReactNode;
  iconColor?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  label, 
  value, 
  change, 
  changePositive, 
  icon, 
  iconColor = 'text-slate-400' 
}) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
          {value}
        </p>
        {change && (
          <p className={`mt-1 text-sm font-medium ${changePositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {change}
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 ${iconColor}`}>
        {icon}
      </div>
    </div>
  </Card>
);

// ============================================
// SCREEN 5: WITHDRAWAL HISTORY
// ============================================

import { Wallet, Receipt, DollarSign, Download, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTrading } from '../hooks/useTrading';

export const WithdrawalsScreen: React.FC = () => {
  const { withdrawals } = useTrading();

  const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.grossProfit, 0);
  const totalFees = withdrawals.reduce((sum, w) => sum + w.fee, 0);
  const totalNet = withdrawals.reduce((sum, w) => sum + w.netAmount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <KPICard label="Total Withdrawn" value={`${totalWithdrawn.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`} icon={<Wallet size={20} />} />
          <KPICard label="Total Fees Paid" value={`${totalFees.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`} change="7% of profits withdrawn" changePositive={true} icon={<Receipt size={20} />} iconColor="text-amber-500" />
          <KPICard label="Total Net Received" value={`${totalNet.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`} icon={<DollarSign size={20} />} iconColor="text-teal-500" />
        </div>

        {/* Table */}
        <Card>
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Withdrawal History</h3>
            <Button variant="secondary" size="sm">
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gross</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fee</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Net</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Wallet</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tx</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {withdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-slate-900 dark:text-white">{w.date}</td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-emerald-600 dark:text-emerald-400">+{w.grossProfit.toFixed(2)}</td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-900 dark:text-white">-{w.fee.toFixed(2)}</td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono font-semibold text-teal-600 dark:text-teal-400 hidden sm:table-cell">{w.netAmount.toFixed(2)}</td>
                    <td className="px-3 md:px-6 py-3 text-xs font-mono text-slate-500 hidden md:table-cell">{w.wallet}</td>
                    <td className="px-3 md:px-6 py-3">
                      <button className="text-xs font-mono text-teal-600 hover:text-teal-700 flex items-center gap-1">
                        {w.txHash.slice(0, 8)}... <ExternalLink size={12} />
                      </button>
                    </td>
                    <td className="px-3 md:px-6 py-3">
                      <Badge variant={w.status === 'completed' ? 'success' : w.status === 'pending' ? 'warning' : 'danger'}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No withdrawals yet. Go to Dashboard to withdraw your profits.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

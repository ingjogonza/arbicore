// ============================================
// SCREEN 3: DASHBOARD
// ============================================

import { useState } from 'react';
import { 
  Wallet, TrendingUp, BarChart3, Percent, Receipt, 
  Shield, ExternalLink, Play, Pause, Settings 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { WithdrawModal } from './WithdrawModal';
import { useTrading } from '../hooks/useTrading';
import { equityData } from '../data/mock';

export const DashboardScreen: React.FC = () => {
  const { account, trades, toggleBot } = useTrading();
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const grossProfit = account.currentBalance - account.initialBalance;
  const performance = ((grossProfit / account.initialBalance) * 100).toFixed(2);
  const pendingFee = grossProfit * 0.07;

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
          <KPICard 
            label="Initial Balance" 
            value={`${account.initialBalance.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`}
            icon={<Wallet size={20} />}
          />
          <KPICard 
            label="Current Balance" 
            value={`${account.currentBalance.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`}
            change={`+${grossProfit.toLocaleString('en-US', {minimumFractionDigits: 2})} (+${performance}%)`}
            changePositive={true}
            icon={<TrendingUp size={20} />}
            iconColor="text-emerald-500"
          />
          <KPICard 
            label="Net Profit" 
            value={`+${grossProfit.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`}
            changePositive={true}
            icon={<BarChart3 size={20} />}
            iconColor="text-emerald-500"
          />
          <KPICard 
            label="Performance" 
            value={`+${performance}%`}
            change="Since activation"
            changePositive={true}
            icon={<Percent size={20} />}
            iconColor="text-teal-500"
          />
          <KPICard 
            label="Pending Fee (7%)" 
            value={`${pendingFee.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT`}
            change="Payable on withdrawal"
            changePositive={true}
            icon={<Receipt size={20} />}
            iconColor="text-amber-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Equity Curve</h3>
              <div className="flex gap-1">
                {['1D', '1W', '1M', '3M', 'ALL'].map(period => (
                  <button key={period} className="px-3 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                  />
                  <ReferenceLine y={account.initialBalance} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Initial', position: 'right', fontSize: 10, fill: '#94a3b8' }} />
                  <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Bot Status Panel */}
          <Card className="p-4 md:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">Bot Status</h3>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-3 h-3 rounded-full ${account.botStatus === 'active' ? 'bg-emerald-500 animate-pulse' : account.botStatus === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <Badge variant={account.botStatus === 'active' ? 'success' : account.botStatus === 'paused' ? 'warning' : 'danger'}>
                {account.botStatus.charAt(0).toUpperCase() + account.botStatus.slice(1)}
              </Badge>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Running since</span>
                <span className="text-slate-900 dark:text-white font-medium">{account.botRunningSince}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Strategy</span>
                <span className="text-slate-900 dark:text-white font-medium">{account.strategy}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Last trade</span>
                <span className="text-slate-900 dark:text-white font-medium">2 minutes ago</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                variant={account.botStatus === 'active' ? 'secondary' : 'primary'} 
                onClick={toggleBot}
                className="w-full"
              >
                {account.botStatus === 'active' ? <Pause size={16} className="mr-2" /> : <Play size={16} className="mr-2" />}
                {account.botStatus === 'active' ? 'Pause Bot' : 'Resume Bot'}
              </Button>
              <Button variant="secondary" className="w-full">
                <Settings size={16} className="mr-2" /> Risk Settings
              </Button>
              <Button onClick={() => setWithdrawModalOpen(true)} className="w-full">
                <Wallet size={16} className="mr-2" /> Withdraw Profits
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Trades */}
        <Card>
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Operations</h3>
            <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pair</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">P&L</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {trades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-slate-500">{trade.date}</td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm font-semibold text-slate-900 dark:text-white">{trade.pair}</td>
                    <td className="px-3 md:px-6 py-3">
                      <Badge variant={trade.type === 'buy' ? 'info' : 'warning'}>
                        {trade.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-900 dark:text-white">{trade.amount}</td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-500 hidden sm:table-cell">${trade.price.toLocaleString()}</td>
                    <td className={`px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono font-medium ${trade.pnl > 0 ? 'text-emerald-600' : trade.pnl < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                      {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                    </td>
                    <td className="px-3 md:px-6 py-3 hidden sm:table-cell">
                      <Badge variant="success">Completed</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Trust Reminder */}
        <Alert variant="info" icon={<Shield size={16} />}>
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="text-sm font-medium">Your funds are in your Binance account. We only execute orders via API.</span>
            <button className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 shrink-0 whitespace-nowrap">
              Verify on Binance <ExternalLink size={14} />
            </button>
          </div>
        </Alert>
      </div>

      <WithdrawModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} />
    </DashboardLayout>
  );
};

// ============================================
// SIDEBAR COMPONENT
// ============================================

import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Link2, Wallet, Settings, BarChart3, Sun, Moon, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTrading } from '../../hooks/useTrading';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { account } = useTrading();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/connect', label: 'API Connection', icon: <Link2 size={20} /> },
    { path: '/withdrawals', label: 'Withdrawals', icon: <Wallet size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      <aside className="hidden lg:flex lg:w-60 lg:min-h-screen lg:bg-slate-50 lg:dark:bg-slate-900 lg:border-r lg:border-slate-200 lg:dark:border-slate-800 lg:flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">CryptoInvestor</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                ${location.pathname === item.path 
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-l-3 border-teal-500' 
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${account.botStatus === 'active' ? 'bg-emerald-500 animate-pulse' : account.botStatus === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{account.botStatus}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">Bot {account.botStatus === 'active' ? 'running' : 'stopped'}</p>
          </div>

          <button 
            onClick={toggleTheme} 
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <aside className="absolute left-0 top-0 w-72 min-h-screen bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-left">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  <BarChart3 size={18} className="text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white">CryptoInvestor</span>
              </div>
              <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                    ${location.pathname === item.path 
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-l-3 border-teal-500' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${account.botStatus === 'active' ? 'bg-emerald-500 animate-pulse' : account.botStatus === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{account.botStatus}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500">Bot {account.botStatus === 'active' ? 'running' : 'stopped'}</p>
              </div>

              <button 
                onClick={toggleTheme} 
                className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

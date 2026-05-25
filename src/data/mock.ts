// ============================================
// MOCK DATA
// ============================================

import type { User, Account, Trade, Withdrawal, LegalDocument } from '../types';

export const mockUser: User = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatar: 'AR',
};

export const mockAccount: Account = {
  initialBalance: 12500.00,
  currentBalance: 14832.50,
  apiConnected: true,
  apiKey: '••••••••••••••••',
  botStatus: 'active',
  botRunningSince: '2026-01-15',
  strategy: 'Conservative Spot Trading',
};

export const mockTrades: Trade[] = [
  { id: '1', date: '2026-05-07 14:30', pair: 'BTC/USDT', type: 'buy', amount: 0.15, price: 97415.20, pnl: 0, status: 'completed' },
  { id: '2', date: '2026-05-07 12:15', pair: 'ETH/USDT', type: 'sell', amount: 2.5, price: 3852.40, pnl: 125.50, status: 'completed' },
  { id: '3', date: '2026-05-07 10:00', pair: 'SOL/USDT', type: 'buy', amount: 45, price: 142.30, pnl: 0, status: 'completed' },
  { id: '4', date: '2026-05-06 18:45', pair: 'BTC/USDT', type: 'sell', amount: 0.08, price: 96820.10, pnl: -45.20, status: 'completed' },
  { id: '5', date: '2026-05-06 16:20', pair: 'ETH/USDT', type: 'buy', amount: 1.8, price: 3810.50, pnl: 0, status: 'completed' },
  { id: '6', date: '2026-05-06 09:00', pair: 'BTC/USDT', type: 'sell', amount: 0.12, price: 97150.80, pnl: 89.30, status: 'completed' },
  { id: '7', date: '2026-05-05 22:10', pair: 'SOL/USDT', type: 'sell', amount: 30, price: 138.90, pnl: 67.40, status: 'completed' },
  { id: '8', date: '2026-05-05 15:30', pair: 'ETH/USDT', type: 'buy', amount: 3.2, price: 3785.20, pnl: 0, status: 'completed' },
];

export const mockWithdrawals: Withdrawal[] = [
  { id: '1', date: '2026-04-20 10:15', grossProfit: 1850.00, fee: 129.50, netAmount: 1720.50, wallet: 'TX1a2B3c4D5e6F7g8H9i0J', txHash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b', status: 'completed' },
  { id: '2', date: '2026-03-15 16:30', grossProfit: 3200.00, fee: 224.00, netAmount: 2976.00, wallet: 'TX1a2B3c4D5e6F7g8H9i0J', txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', status: 'completed' },
  { id: '3', date: '2026-02-10 09:45', grossProfit: 950.00, fee: 66.50, netAmount: 883.50, wallet: 'TX1a2B3c4D5e6F7g8H9i0J', txHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b', status: 'completed' },
];

export const mockLegalDocs: LegalDocument[] = [
  { id: 'tos', title: 'Terms of Service', description: 'Legal agreement governing use of the CryptoInvestor platform and automated trading services.', accepted: true, pdfUrl: '#' },
  { id: 'risk', title: 'Risk Disclosure', description: 'Acknowledgment of risks associated with automated cryptocurrency trading and market volatility.', accepted: true, pdfUrl: '#' },
  { id: 'api', title: 'API Authorization Agreement', description: 'Terms for connecting and authorizing API access to your Binance account for trade execution.', accepted: true, pdfUrl: '#' },
  { id: 'custody', title: 'No Custody Policy', description: 'Confirmation that CryptoInvestor does not hold, manage, or take custody of your funds at any time.', accepted: true, pdfUrl: '#' },
];

// Equity curve data for chart
export const equityData = [
  { date: 'Jan 15', value: 12500 },
  { date: 'Jan 22', value: 12680 },
  { date: 'Jan 29', value: 12540 },
  { date: 'Feb 05', value: 12850 },
  { date: 'Feb 12', value: 13100 },
  { date: 'Feb 19', value: 12950 },
  { date: 'Feb 26', value: 13300 },
  { date: 'Mar 05', value: 13650 },
  { date: 'Mar 12', value: 13400 },
  { date: 'Mar 19', value: 13800 },
  { date: 'Mar 26', value: 14100 },
  { date: 'Apr 02', value: 13950 },
  { date: 'Apr 09', value: 14300 },
  { date: 'Apr 16', value: 14550 },
  { date: 'Apr 23', value: 14400 },
  { date: 'Apr 30', value: 14700 },
  { date: 'May 07', value: 14832 },
];

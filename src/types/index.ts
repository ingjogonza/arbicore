// ============================================
// TYPES / INTERFACES
// ============================================

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface Account {
  initialBalance: number;
  currentBalance: number;
  apiConnected: boolean;
  apiKey: string;
  botStatus: 'active' | 'paused' | 'error';
  botRunningSince: string;
  strategy: string;
}

export interface Trade {
  id: string;
  date: string;
  pair: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  pnl: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface Withdrawal {
  id: string;
  date: string;
  grossProfit: number;
  fee: number;
  netAmount: number;
  wallet: string;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface LegalDocument {
  id: string;
  title: string;
  description: string;
  accepted: boolean;
  pdfUrl: string;
}

export type Theme = 'light' | 'dark';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'pending';

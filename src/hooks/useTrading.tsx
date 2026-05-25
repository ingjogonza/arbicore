// ============================================
// TRADING DATA CONTEXT (Global State)
// ============================================

import { createContext, useContext, useState } from 'react';
import type { Account, Withdrawal, LegalDocument } from '../types';
import { mockUser, mockAccount, mockTrades, mockWithdrawals, mockLegalDocs } from '../data/mock';

interface TradingContextType {
  user: typeof mockUser;
  account: Account;
  trades: typeof mockTrades;
  withdrawals: Withdrawal[];
  legalDocs: LegalDocument[];
  connectApi: (apiKey: string, secretKey: string) => void;
  disconnectApi: () => void;
  toggleBot: () => void;
  withdraw: (amount: number, address: string) => void;
  acceptDocument: (docId: string) => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<Account>(mockAccount);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(mockWithdrawals);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>(mockLegalDocs);

  const connectApi = (apiKey: string, _secretKey: string) => {
    setAccount(prev => ({ 
      ...prev, 
      apiConnected: true, 
      apiKey: apiKey.slice(0, 4) + '••••••••••••••' 
    }));
  };

  const disconnectApi = () => {
    setAccount(prev => ({ 
      ...prev, 
      apiConnected: false, 
      apiKey: '', 
      botStatus: 'error' 
    }));
  };

  const toggleBot = () => {
    setAccount(prev => ({
      ...prev,
      botStatus: prev.botStatus === 'active' ? 'paused' : 'active'
    }));
  };

  const withdraw = (amount: number, address: string) => {
    const fee = amount * 0.07;
    const net = amount * 0.93;
    const newWithdrawal: Withdrawal = {
      id: String(Date.now()),
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      grossProfit: amount,
      fee,
      netAmount: net,
      wallet: address.slice(0, 20) + '...',
      txHash: '0x' + Math.random().toString(16).slice(2, 42),
      status: 'pending',
    };
    setWithdrawals(prev => [newWithdrawal, ...prev]);
    setAccount(prev => ({ ...prev, currentBalance: prev.currentBalance - amount }));
  };

  const acceptDocument = (docId: string) => {
    setLegalDocs(prev => prev.map(d => d.id === docId ? { ...d, accepted: !d.accepted } : d));
  };

  return (
    <TradingContext.Provider value={{
      user: mockUser,
      account,
      trades: mockTrades,
      withdrawals,
      legalDocs,
      connectApi,
      disconnectApi,
      toggleBot,
      withdraw,
      acceptDocument,
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
};

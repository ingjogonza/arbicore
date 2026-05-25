// ============================================
// WITHDRAW MODAL (Screen 4)
// ============================================

import { useState } from 'react';
import { Wallet, CheckCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTrading } from '../hooks/useTrading';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { account, withdraw } = useTrading();
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const grossProfit = account.currentBalance - account.initialBalance;
  const platformFee = grossProfit * 0.07;
  const netToClient = grossProfit * 0.93;

  const handleWithdraw = () => {
    if (!confirm1 || !confirm2 || !address) return;
    withdraw(grossProfit, address);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setAddress('');
      setConfirm1(false);
      setConfirm2(false);
      onClose();
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      {submitted ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Withdrawal Initiated</h3>
          <p className="text-slate-500">Your withdrawal is being processed.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-teal-50 dark:bg-teal-900/20 px-8 py-8 border-b border-teal-100 dark:border-teal-800">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-800 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4">
              <Wallet size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Withdraw Profits</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review your profit breakdown before confirming the withdrawal.</p>
          </div>

          {/* Breakdown */}
          <div className="px-8 py-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Profit Summary</p>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Initial Balance</span>
                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">{account.initialBalance.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm text-slate-500">Current Balance</span>
                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">{account.currentBalance.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT</span>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Gross Profit</span>
                  <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">+{grossProfit.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-sm text-slate-500">Platform Fee (7%)</span>
                  <p className="text-xs text-slate-400 mt-0.5">Sent to platform wallet automatically</p>
                </div>
                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">-{platformFee.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT</span>
              </div>

              <div className="bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-500 rounded-lg p-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Net Amount to You (93%)</span>
                </div>
                <p className="text-3xl font-mono font-bold text-teal-600 dark:text-teal-400">{netToClient.toLocaleString('en-US', {minimumFractionDigits: 2})} USDT</p>
                <p className="text-xs text-slate-500 mt-1">This is the amount that will be sent to your wallet.</p>
              </div>
            </div>

            {/* Visual Split */}
            <div className="flex rounded-lg overflow-hidden mt-5 h-12">
              <div className="flex-[93] bg-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                You: 93%
              </div>
              <div className="flex-[7] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                Fee: 7%
              </div>
            </div>

            {/* Withdrawal Details */}
            <div className="mt-6 space-y-4">
              <Input
                label="Withdrawal Address"
                placeholder="Enter your USDT (TRC20) wallet address"
                value={address}
                onChange={setAddress}
                helper="Double-check your address. Transactions cannot be reversed."
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Network</label>
                <select 
                  value={network} 
                  onChange={e => setNetwork(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option>TRC20</option>
                  <option>ERC20</option>
                  <option>BEP20</option>
                </select>
              </div>
            </div>

            {/* Confirmations */}
            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={confirm1} 
                  onChange={e => setConfirm1(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  I confirm the withdrawal address is correct and belongs to me.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={confirm2} 
                  onChange={e => setConfirm2(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  I understand the 7% platform fee will be deducted automatically.
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8">
            <Button 
              onClick={handleWithdraw}
              disabled={!confirm1 || !confirm2 || !address}
              className="w-full"
              size="lg"
            >
              Confirm Withdrawal
            </Button>
            <p className="mt-3 text-xs text-center text-slate-400">
              The 7% fee ({platformFee.toFixed(2)} USDT) will be sent to the platform wallet automatically.<br />
              The remaining 93% ({netToClient.toFixed(2)} USDT) will be sent to your address.
            </p>
          </div>
        </>
      )}
    </Modal>
  );
};

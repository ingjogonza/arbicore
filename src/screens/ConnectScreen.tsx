// ============================================
// SCREEN 2: API CONNECTION
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Lock, CheckCircle, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { useTrading } from '../hooks/useTrading';

export const ConnectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { account, connectApi, disconnectApi } = useTrading();
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleConnect = () => {
    if (!apiKey || !secretKey || !confirmed) return;
    connectApi(apiKey, secretKey);
    setShowSuccess(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-4 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connect Your Binance Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your API keys to enable automated trading execution.</p>
        </div>

        {account.apiConnected ? (
          <div className="space-y-4">
            <Alert variant="success" icon={<CheckCircle size={16} />}>
              <span className="font-medium">API Connected Successfully</span>
              <p className="mt-1">Your Binance account is linked and ready for automated trading.</p>
            </Alert>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">API Key</p>
                <p className="text-sm font-mono text-slate-500">{account.apiKey}</p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/dashboard')} className="flex-1">
                Go to Dashboard
              </Button>
              <Button variant="danger" onClick={disconnectApi} className="flex-1">
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <Input
              label="API Key"
              placeholder="Enter your Binance API Key"
              value={apiKey}
              onChange={setApiKey}
              helper="Generate from Binance → API Management → Create API"
              icon={<Key size={16} />}
            />
            <Input
              label="Secret Key"
              placeholder="Enter your Binance Secret Key"
              value={secretKey}
              onChange={setSecretKey}
              helper="Keep this secure. We encrypt it at rest with AES-256."
              icon={<Lock size={16} />}
              masked
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={confirmed} 
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  I confirm my API keys do <span className="font-semibold">NOT</span> have withdrawal permissions enabled.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  For your security, we only require SPOT trading permissions.
                </p>
              </div>
            </label>

            <Alert variant="info" icon={<Info size={16} />}>
              <span className="font-medium">Security Note:</span> You can revoke API access from your Binance account at any time. We recommend reviewing permissions regularly.
            </Alert>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleConnect} 
                disabled={!apiKey || !secretKey || !confirmed}
                className="flex-1"
              >
                {showSuccess ? <CheckCircle size={18} className="mr-2" /> : null}
                {showSuccess ? 'Connected!' : 'Verify & Connect'}
              </Button>
              <Button variant="ghost" onClick={() => {}}>
                How to create API keys?
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

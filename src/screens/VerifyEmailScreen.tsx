// ============================================
// SCREEN: VERIFY EMAIL
// ============================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const VerifyEmailScreen: React.FC = () => {
  const [resent, setResent] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail size={32} className="text-teal-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Verificá tu correo
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Te enviamos un email con un enlace de verificación. Hacé clic en el enlace para activar tu cuenta y poder iniciar sesión.
        </p>

        {resent && (
          <div className="mb-4">
            <Alert variant="success" icon={<CheckCircle size={16} />}>
              <span className="text-sm font-medium">Email reenviado correctamente.</span>
            </Alert>
          </div>
        )}

        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setResent(true)}
          >
            Reenviar email de verificación
          </Button>

          <Link to="/login">
            <Button variant="ghost" className="w-full">
              <span className="flex items-center justify-center gap-2">
                Ya verifiqué mi email — Ingresar <ArrowRight size={16} />
              </span>
            </Button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2 text-left">
            <AlertCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Si no encontrás el email, revisá tu carpeta de spam o correo no deseado. El enlace tiene validez limitada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

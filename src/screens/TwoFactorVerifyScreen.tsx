// ============================================
// 2FA VERIFY SCREEN (login step 2)
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../contexts/AuthContext";

export const TwoFactorVerifyScreen: React.FC = () => {
	const navigate = useNavigate();
	const { verify2FA } = useAuth();
	const [token, setToken] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (token.length !== 6) {
			setError("Ingresá el código de 6 dígitos.");
			return;
		}
		setLoading(true);
		setError("");
		try {
			const ok = await verify2FA(token);
			if (ok) {
				navigate("/dashboard");
			} else {
				setError("Código incorrecto. Intentá de nuevo.");
			}
		} catch (err: any) {
			setError(err.message || "Error al verificar código");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-6">
					<div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
						<Shield size={24} className="text-white" />
					</div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
						Verificación en dos pasos
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Ingresá el código de tu app de autenticación
					</p>
				</div>

				{error && (
					<div className="mb-4">
						<Alert variant="danger" icon={<AlertCircle size={16} />}>
							<span className="text-sm font-medium">{error}</span>
						</Alert>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Código de 6 dígitos
						</label>
						<input
							type="text"
							value={token}
							onChange={(e) =>
								setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
							}
							placeholder="000000"
							maxLength={6}
							className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
							autoFocus
						/>
					</div>

					<Button
						type="submit"
						variant="primary"
						className="w-full"
						disabled={loading || token.length !== 6}
					>
						{loading ? (
							"Verificando..."
						) : (
							<span className="flex items-center justify-center gap-2">
								Verificar <ArrowRight size={16} />
							</span>
						)}
					</Button>
				</form>
			</div>
		</div>
	);
};

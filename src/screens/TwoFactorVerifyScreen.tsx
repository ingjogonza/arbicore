// ============================================
// 2FA VERIFY SCREEN (login step 2)
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Shield,
	AlertCircle,
	ArrowRight,
	KeyRound,
	CheckCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../contexts/AuthContext";

export const TwoFactorVerifyScreen: React.FC = () => {
	const navigate = useNavigate();
	const { verify2FA, recover2FA, logout } = useAuth();
	const [mode, setMode] = useState<"totp" | "recovery">("totp");
	const [token, setToken] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [recovered, setRecovered] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (mode === "totp") {
			if (token.length !== 6) {
				setError("Ingresa el código de 6 dígitos.");
				return;
			}
			setLoading(true);
			setError("");
			try {
				const ok = await verify2FA(token);
				if (ok) {
					navigate("/dashboard");
				} else {
					setError("Código incorrecto. Intenta de nuevo.");
				}
			} catch (err: any) {
				setError(err.message || "Error al verificar código");
			} finally {
				setLoading(false);
			}
		} else {
			// Recovery mode
			if (!recoveryCode.trim()) {
				setError("Ingresa tu código de recuperación.");
				return;
			}
			setLoading(true);
			setError("");
			try {
				const result = await recover2FA(recoveryCode.trim());
				if (result.success) {
					setRecovered(true);
				} else {
					setError(result.message);
				}
			} catch (err: any) {
				setError(err.message || "Error al procesar código de recuperación");
			} finally {
				setLoading(false);
			}
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
						Ingresa el código de tu app de autenticación
					</p>
				</div>

				{error && (
					<div className="mb-4">
						<Alert variant="danger" icon={<AlertCircle size={16} />}>
							<span className="text-sm font-medium">{error}</span>
						</Alert>
					</div>
				)}

				{recovered ? (
					<div className="space-y-4">
						<Alert variant="success" icon={<CheckCircle size={16} />}>
							<span className="font-medium">2FA desactivado correctamente</span>
							<p className="mt-1 text-sm">
								Podés configurar 2FA nuevamente desde Configuración.
							</p>
						</Alert>
						<Button
							variant="primary"
							className="w-full"
							onClick={() => {
								logout();
								navigate("/login");
							}}
						>
							Volver a iniciar sesión
						</Button>
					</div>
				) : mode === "totp" ? (
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

						<div className="text-center">
							<button
								type="button"
								onClick={() => setMode("recovery")}
								className="text-sm text-slate-500 hover:text-teal-600 transition-colors"
							>
								¿Perdiste tu app de autenticación? Usá un{" "}
								<span className="font-medium underline">
									código de recuperación
								</span>
							</button>
						</div>
					</form>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
								Código de Recuperación
							</label>
							<div className="relative">
								<KeyRound
									size={18}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								/>
								<input
									type="text"
									value={recoveryCode}
									onChange={(e) =>
										setRecoveryCode(e.target.value.toUpperCase())
									}
									placeholder="AB12-CD34-EF56"
									className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
							</div>
							<p className="text-xs text-slate-500 mt-1">
								Ingresá uno de los códigos de recuperación que guardaste al
								configurar 2FA. Esto desactivará la verificación en dos pasos.
							</p>
						</div>

						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={loading || !recoveryCode.trim()}
						>
							{loading ? (
								"Verificando..."
							) : (
								<span className="flex items-center justify-center gap-2">
									Desactivar 2FA <ArrowRight size={16} />
								</span>
							)}
						</Button>

						<div className="text-center">
							<button
								type="button"
								onClick={() => {
									setMode("totp");
									setError("");
								}}
								className="text-sm text-slate-500 hover:text-teal-600 transition-colors"
							>
								Volver al código de autenticación
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
};

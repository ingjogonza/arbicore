// ============================================
// SCREEN: LOGIN
// ============================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, LogIn, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";

export const LoginScreen: React.FC = () => {
	const navigate = useNavigate();
	const { login, resendVerification, state, clearError } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [localError, setLocalError] = useState("");

	// Redirect to dashboard if already logged in and not requiring 2FA
	useEffect(() => {
		if (state.user && !state.loading && !state.error) {
			navigate("/dashboard");
		}
	}, [state.user, state.loading, state.error, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		clearError();
		setLocalError("");

		if (!email.trim() || !password.trim()) {
			setLocalError("Ingresa tu correo y contraseña.");
			return;
		}

		try {
			const requires2FA = await login(email.trim(), password.trim());
			if (requires2FA) {
				navigate("/2fa-verify");
			} else {
				navigate("/dashboard");
			}
		} catch {
			// Error is set in AuthContext state
		}
	};

	const handleResend = async () => {
		setLocalError("");
		try {
			await resendVerification();
			setLocalError(
				"Email de verificación reenviado. Revisa tu bandeja de entrada.",
			);
		} catch {
			// Error already in state
		}
	};

	const isNotVerified = state.error?.includes("verificar");

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
						<LogIn size={24} className="text-white" />
					</div>
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
						Iniciar sesión
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Accedé a tu cuenta de CryptoInvestor
					</p>
				</div>

				{(state.error || localError) && (
					<div className="mb-4">
						<Alert variant="danger" icon={<AlertCircle size={16} />}>
							<div className="flex flex-col gap-2">
								<span className="text-sm font-medium">
									{state.error || localError}
								</span>
								{isNotVerified && (
									<button
										onClick={handleResend}
										className="text-sm text-teal-600 hover:text-teal-700 font-medium underline"
									>
										Reenviar email de verificación
									</button>
								)}
							</div>
						</Alert>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Correo electrónico
						</label>
						<div className="relative">
							<Mail
								size={18}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="tu@email.com"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
							Contraseña
						</label>
						<div className="relative">
							<Lock
								size={18}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
								required
							/>
						</div>
					</div>

					<div className="text-right">
						<Link
							to="/forgot-password"
							className="text-sm text-teal-600 hover:text-teal-700"
						>
							¿Olvidaste tu contraseña?
						</Link>
					</div>

					<Button
						type="submit"
						variant="primary"
						className="w-full"
						disabled={state.loading}
					>
						{state.loading ? (
							<span className="flex items-center justify-center gap-2">
								<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								Ingresando...
							</span>
						) : (
							<span className="flex items-center justify-center gap-2">
								Ingresar <ArrowRight size={16} />
							</span>
						)}
					</Button>
				</form>

				<p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
					¿No tienes cuenta?{" "}
					<Link
						to="/register"
						className="text-teal-600 hover:text-teal-700 font-medium"
					>
						Crear cuenta
					</Link>
				</p>
			</div>
		</div>
	);
};

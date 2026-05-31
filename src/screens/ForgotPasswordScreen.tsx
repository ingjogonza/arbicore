// ============================================
// FORGOT PASSWORD SCREEN
// ============================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../contexts/AuthContext";

export const ForgotPasswordScreen: React.FC = () => {
	const { resetPassword, state, clearError } = useAuth();
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [localError, setLocalError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		clearError();
		setLocalError("");

		if (!email.trim()) {
			setLocalError("Ingresa tu correo electrónico.");
			return;
		}

		try {
			await resetPassword(email.trim());
			setSent(true);
		} catch {
			// Error is set in AuthContext state
		}
	};

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-6">
					<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
						Recuperar contraseña
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
						Te enviaremos un enlace para restablecerla
					</p>
				</div>

				{(state.error || localError) && (
					<div className="mb-4">
						<Alert variant="danger">
							<span className="text-sm font-medium">
								{state.error || localError}
							</span>
						</Alert>
					</div>
				)}

				{sent ? (
					<Alert variant="success">
						<span className="font-medium">Revisa tu correo</span>
						<p className="mt-1 text-sm">
							Si el email está registrado, recibiste un enlace para restablecer
							tu contraseña.
						</p>
					</Alert>
				) : (
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

						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={state.loading || !email.trim()}
						>
							{state.loading ? "Enviando..." : "Enviar enlace"}
						</Button>
					</form>
				)}

				<div className="mt-6 text-center">
					<Link
						to="/login"
						className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700"
					>
						<ArrowLeft size={16} className="mr-1" /> Volver al login
					</Link>
				</div>
			</div>
		</div>
	);
};

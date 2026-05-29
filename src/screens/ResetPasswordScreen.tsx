// ============================================
// RESET PASSWORD SCREEN
// ============================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { supabase } from "../lib/supabase";

export const ResetPasswordScreen: React.FC = () => {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY") {
				// Token is valid, allow password reset
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password.length < 6) {
			setError("La contraseña debe tener al menos 6 caracteres.");
			return;
		}
		if (password !== confirmPassword) {
			setError("Las contraseñas no coinciden.");
			return;
		}

		setLoading(true);
		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password,
			});
			if (updateError) throw updateError;
			setSuccess(true);
			setTimeout(() => navigate("/login"), 2000);
		} catch (err: any) {
			setError(err.message || "Error al actualizar contraseña");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-6">
					Nueva contraseña
				</h1>

				{success ? (
					<Alert variant="success" icon={<CheckCircle size={16} />}>
						<span className="font-medium">Contraseña actualizada</span>
						<p className="mt-1 text-sm">Redirigiendo al login...</p>
					</Alert>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="mb-4">
								<Alert variant="danger">
									<span className="text-sm font-medium">{error}</span>
								</Alert>
							</div>
						)}

						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
								Nueva contraseña
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
							<p className="text-xs text-slate-400 mt-1">Mínimo 6 caracteres</p>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
								Confirmar contraseña
							</label>
							<div className="relative">
								<Lock
									size={18}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								/>
								<input
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="••••••••"
									className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
									required
								/>
							</div>
						</div>

						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={loading}
						>
							{loading ? "Actualizando..." : "Actualizar contraseña"}
						</Button>
					</form>
				)}
			</div>
		</div>
	);
};

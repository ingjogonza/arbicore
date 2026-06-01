// ============================================
// AUTH CALLBACK — Maneja redirect post-verificación
// ============================================
// Supabase redirige acá después de:
//   - Email verification (signup)
//   - Password reset (recovery)
// El SDK ya procesa el hash (#access_token=...)
// automáticamente. Este componente solo escucha
// el evento y redirige según corresponda.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export const AuthCallbackScreen: React.FC = () => {
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;

		const process = async () => {
			// 1. Esperar a que el SDK procese el hash de la URL
			const { data } = await supabase.auth.getSession();

			if (cancelled) return;

			// 2. Si ya hay sesión, verificar el tipo de evento
			if (data.session) {
				navigate("/dashboard", { replace: true });
				return;
			}

			// 3. Si no hay sesión, suscribirse al cambio de estado
			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange((event) => {
				if (cancelled) return;

				if (event === "SIGNED_IN") {
					navigate("/dashboard", { replace: true });
				} else if (event === "PASSWORD_RECOVERY") {
					navigate("/reset-password", { replace: true });
				}
			});

			// Timeout por si algo sale mal
			const timer = setTimeout(() => {
				if (cancelled) return;
				subscription.unsubscribe();
				navigate("/login", { replace: true });
			}, 8000);

			return () => {
				clearTimeout(timer);
				subscription.unsubscribe();
			};
		};

		process();

		return () => {
			cancelled = true;
		};
	}, [navigate]);

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
			<div className="text-center">
				<div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Verificando...
				</p>
			</div>
		</div>
	);
};

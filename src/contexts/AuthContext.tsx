// ============================================
// AUTH CONTEXT — Supabase Auth State Provider
// ============================================

import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { env } from "../lib/env";
import { supabase } from "../lib/supabase";
import type {
	AuthState,
	AuthContextValue,
	RegisterData,
	TwoFactorState,
} from "../types";

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
	user: null,
	session: null,
	loading: true,
	error: null,
};

const initialTwoFactor: TwoFactorState = {
	enabled: false,
	setupComplete: false,
	requires2FA: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [state, setState] = useState<AuthState>(initialState);
	const [twoFactor, setTwoFactor] = useState<TwoFactorState>(initialTwoFactor);
	const API_BASE = env.VITE_API_BASE_URL || "http://localhost:3000";

	// Session recovery on mount + auth state listener
	useEffect(() => {
		let mounted = true;

		// Check existing session (Supabase stores refresh token in secure cookie)
		supabase.auth
			.getSession()
			.then(({ data: { session } }: { data: { session: Session | null } }) => {
				if (!mounted) return;
				if (session?.user) {
					const userMeta = session.user.user_metadata || {};
					setState({
						user: {
							id: session.user.id,
							email: session.user.email || "",
							firstName: userMeta.first_name || "",
							lastName: userMeta.last_name || "",
							phone: userMeta.phone || "",
						},
						session: { access_token: session.access_token },
						loading: false,
						error: null,
					});
				} else {
					setState((prev) => ({ ...prev, loading: false }));
				}
			});

		// Subscribe to auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			(_event: AuthChangeEvent, session: Session | null) => {
				if (!mounted) return;
				if (session?.user) {
					const userMeta = session.user.user_metadata || {};
					setState({
						user: {
							id: session.user.id,
							email: session.user.email || "",
							firstName: userMeta.first_name || "",
							lastName: userMeta.last_name || "",
							phone: userMeta.phone || "",
						},
						session: { access_token: session.access_token },
						loading: false,
						error: null,
					});
				} else {
					setState({ user: null, session: null, loading: false, error: null });
				}
			},
		);

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const login = useCallback(
		async (email: string, password: string): Promise<boolean> => {
			setState((prev) => ({ ...prev, loading: true, error: null }));
			setTwoFactor((prev) => ({ ...prev, requires2FA: false }));
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				setState((prev) => ({ ...prev, loading: false, error: error.message }));
				throw error;
			}

			if (!data.user?.email_confirmed_at) {
				setState((prev) => ({
					...prev,
					loading: false,
					error:
						"Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
				}));
				throw new Error("Email not verified");
			}

			const userMeta = data.user.user_metadata || {};
			const newState = {
				user: {
					id: data.user.id,
					email: data.user.email || "",
					firstName: userMeta.first_name || "",
					lastName: userMeta.last_name || "",
					phone: userMeta.phone || "",
				},
				session: { access_token: data.session.access_token },
				loading: false,
				error: null,
			};
			setState(newState);

			// Check if 2FA is enabled for this user
			try {
				const res = await fetch(`${API_BASE}/api/auth/2fa/status`, {
					headers: { Authorization: `Bearer ${data.session.access_token}` },
				});
				const result = await res.json();
				if (result.success && result.data.enabled) {
					setTwoFactor({
						enabled: true,
						setupComplete: true,
						requires2FA: true,
					});
					return true; // 2FA required
				}
			} catch {
				// If 2FA check fails, continue without requiring it
			}

			return false; // No 2FA required
		},
		[API_BASE],
	);

	const register = useCallback(async (data: RegisterData) => {
		setState((prev) => ({ ...prev, loading: true, error: null }));
		const { data: authData, error } = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: {
				data: {
					first_name: data.firstName,
					last_name: data.lastName,
					phone: data.phone,
				},
				emailRedirectTo: `${window.location.origin}/auth/callback`,
			},
		});

		if (error) {
			setState((prev) => ({ ...prev, loading: false, error: error.message }));
			throw error;
		}

		if (!authData.user) {
			setState((prev) => ({
				...prev,
				loading: false,
				error: "No se pudo crear la cuenta. Intenta de nuevo.",
			}));
			throw new Error("User creation failed");
		}

		// After registration, user needs to verify email. We don't set a session here.
		setState((prev) => ({
			...prev,
			loading: false,
			error: null,
		}));
	}, []);

	const logout = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true }));
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error("[Auth] Logout error:", error);
		}
		setState({ user: null, session: null, loading: false, error: null });
	}, []);

	const resendVerification = useCallback(async () => {
		const email = state.user?.email;
		if (!email) return;
		const { error } = await supabase.auth.resend({
			type: "signup",
			email,
		});
		if (error) {
			setState((prev) => ({ ...prev, error: error.message }));
		}
	}, [state.user?.email]);

	const resetPassword = useCallback(async (email: string) => {
		setState((prev) => ({ ...prev, loading: true, error: null }));
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`,
			});
			if (error) throw error;
		} catch (err: any) {
			setState((prev) => ({ ...prev, error: err.message }));
			throw err;
		} finally {
			setState((prev) => ({ ...prev, loading: false }));
		}
	}, []);

	const setup2FA = useCallback(async (): Promise<{
		secret: string;
		qrCodeUrl: string;
		recoveryCodes: string[];
	}> => {
		if (!state.session) throw new Error("Not authenticated");
		console.log(
			"[2FA] Requesting setup with token:",
			state.session.access_token.substring(0, 20) + "...",
		);
		const res = await fetch(`${API_BASE}/api/auth/2fa/setup`, {
			method: "POST",
			headers: { Authorization: `Bearer ${state.session.access_token}` },
		});
		console.log("[2FA] Response status:", res.status);
		const data = await res.json();
		console.log("[2FA] Response data:", data);
		if (!data.success)
			throw new Error(data.error?.message || "Failed to setup 2FA");
		setTwoFactor((prev) => ({
			...prev,
			qrCodeUrl: data.data.qrCodeUrl,
			recoveryCodes: data.data.recoveryCodes,
		}));
		return {
			secret: data.data.secret,
			qrCodeUrl: data.data.qrCodeUrl,
			recoveryCodes: data.data.recoveryCodes,
		};
	}, [state.session, API_BASE]);

	const verify2FA = useCallback(
		async (token: string): Promise<boolean> => {
			if (!state.session) throw new Error("Not authenticated");
			const res = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${state.session.access_token}`,
				},
				body: JSON.stringify({ token }),
			});
			const data = await res.json();
			if (!data.success) return false;
			setTwoFactor({ enabled: true, setupComplete: true, requires2FA: false });
			return true;
		},
		[state.session, API_BASE],
	);

	const disable2FA = useCallback(async () => {
		if (!state.session) throw new Error("Not authenticated");
		const res = await fetch(`${API_BASE}/api/auth/2fa/disable`, {
			method: "POST",
			headers: { Authorization: `Bearer ${state.session.access_token}` },
		});
		const data = await res.json();
		if (!data.success)
			throw new Error(data.error?.message || "Failed to disable 2FA");
		setTwoFactor({ enabled: false, setupComplete: false, requires2FA: false });
	}, [state.session, API_BASE]);

	const check2FAStatus = useCallback(async (): Promise<boolean> => {
		if (!state.session) return false;
		const res = await fetch(`${API_BASE}/api/auth/2fa/status`, {
			headers: { Authorization: `Bearer ${state.session.access_token}` },
		});
		const data = await res.json();
		if (data.success) {
			setTwoFactor((prev) => ({ ...prev, enabled: data.data.enabled }));
			return data.data.enabled;
		}
		return false;
	}, [state.session, API_BASE]);

	const recover2FA = useCallback(
		async (code: string): Promise<{ success: boolean; message: string }> => {
			if (!state.session) throw new Error("Not authenticated");
			const res = await fetch(`${API_BASE}/api/auth/2fa/recovery`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${state.session.access_token}`,
				},
				body: JSON.stringify({ code }),
			});
			const data = await res.json();
			if (!data.success) {
				return {
					success: false,
					message: data.error?.message || "Código de recuperación inválido.",
				};
			}
			setTwoFactor({
				enabled: false,
				setupComplete: false,
				requires2FA: false,
			});
			return { success: true, message: data.data.message };
		},
		[state.session, API_BASE],
	);

	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	return (
		<AuthContext.Provider
			value={{
				state,
				twoFactor,
				login,
				register,
				logout,
				resendVerification,
				resetPassword,
				setup2FA,
				verify2FA,
				disable2FA,
				check2FAStatus,
				recover2FA,
				clearError,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
};

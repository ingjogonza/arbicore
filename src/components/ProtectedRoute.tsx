// ============================================
// PROTECTED ROUTE GUARD
// ============================================

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import { SessionWarningModal } from "./SessionWarningModal";

export const ProtectedRoute: React.FC = () => {
	const { state, twoFactor, logout } = useAuth();
	const { showWarning, remainingSeconds, extendSession } =
		useSessionTimeout(logout);

	if (state.loading) {
		return (
			<div
				className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"
				role="status"
				aria-label="Loading"
			>
				<div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!state.user) {
		return <Navigate to="/login" replace />;
	}

	if (twoFactor.requires2FA) {
		return <Navigate to="/2fa-verify" replace />;
	}

	return (
		<>
			<SessionWarningModal
				isOpen={showWarning}
				remainingSeconds={remainingSeconds}
				onExtend={extendSession}
				onLogout={logout}
			/>
			<Outlet />
		</>
	);
};

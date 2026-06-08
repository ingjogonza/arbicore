// ============================================
// MAIN APP COMPONENT
// ============================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { TradingProvider } from "./hooks/useTrading";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { VerifyEmailScreen } from "./screens/VerifyEmailScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "./screens/ResetPasswordScreen";
import { AuthCallbackScreen } from "./screens/AuthCallbackScreen";
import { TwoFactorSetupScreen } from "./screens/TwoFactorSetupScreen";
import { TwoFactorVerifyScreen } from "./screens/TwoFactorVerifyScreen";
import { ConnectScreen } from "./screens/ConnectScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { WithdrawalsScreen } from "./screens/WithdrawalsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

function App() {
	return (
		<ThemeProvider>
			<AuthProvider>
				<TradingProvider>
					<BrowserRouter
						future={{
							v7_startTransition: true,
							v7_relativeSplatPath: true,
						}}
					>
						<ErrorBoundary>
							<Routes>
							<Route path="/" element={<OnboardingScreen />} />
							<Route path="/login" element={<LoginScreen />} />
							<Route path="/register" element={<RegisterScreen />} />
							<Route path="/verify-email" element={<VerifyEmailScreen />} />
							<Route
								path="/forgot-password"
								element={<ForgotPasswordScreen />}
							/>
							<Route path="/auth/callback" element={<AuthCallbackScreen />} />
							<Route path="/reset-password" element={<ResetPasswordScreen />} />
							<Route path="/2fa-setup" element={<TwoFactorSetupScreen />} />
							<Route path="/2fa-verify" element={<TwoFactorVerifyScreen />} />
							<Route element={<ProtectedRoute />}>
								<Route path="/connect" element={<ConnectScreen />} />
								<Route path="/dashboard" element={<DashboardScreen />} />
								<Route path="/withdrawals" element={<WithdrawalsScreen />} />
								<Route path="/settings" element={<SettingsScreen />} />
							</Route>
						</Routes>
						</ErrorBoundary>
					</BrowserRouter>
				</TradingProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}

export default App;

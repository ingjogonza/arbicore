// ============================================
// SCREEN 3: DASHBOARD (ORCHESTRATOR)
// ============================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ExternalLink } from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Alert } from "../components/ui/Alert";
import { WithdrawModal } from "./WithdrawModal";
import { OnboardingBanner } from "../components/dashboard/OnboardingBanner";
import { KPIGrid } from "../components/dashboard/KPIGrid";
import { EquityChart } from "../components/dashboard/EquityChart";
import { BotStatusPanel } from "../components/dashboard/BotStatusPanel";
import { RecentTradesTable } from "../components/dashboard/RecentTradesTable";
import { useDashboard } from "../hooks/useDashboard";
import { useAuth } from "../contexts/AuthContext";

export const DashboardScreen: React.FC = () => {
	const navigate = useNavigate();
	const { data, loading, error, errors, refetch } = useDashboard();
	const { onboarding } = useAuth();
	const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

	// Compute current balance from FDUSD free balance
	const currentBalance = useMemo(() => {
		if (!data?.balances) return 0;
		const fdusd = data.balances.find((b) => b.asset === "FDUSD");
		if (!fdusd) return 0;
		return parseFloat(fdusd.free);
	}, [data?.balances]);

	// Initial balance from first FDUSD deposit (via API) or fallback to current
	const initialBalance = useMemo(() => {
		if (data?.initialBalance) {
			const val = parseFloat(data.initialBalance);
			return Number.isNaN(val) ? currentBalance : val;
		}
		return currentBalance;
	}, [data?.initialBalance, currentBalance]);

	// Derived KPI values (guard against NaN)
	const grossProfit = Number.isFinite(initialBalance)
		? currentBalance - initialBalance
		: 0;
	const performance =
		initialBalance > 0 && Number.isFinite(initialBalance)
			? ((grossProfit / initialBalance) * 100).toFixed(2)
			: "0.00";
	const pendingFee = Math.max(0, grossProfit * 0.07);

	// Loading skeleton
	if (loading && !data) {
		return (
			<DashboardLayout>
				<div className="space-y-4 md:space-y-6">
					<div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="h-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse"
							/>
						))}
					</div>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-4 md:space-y-6">
				{/* Fatal error banner */}
				{error && (
					<Alert variant="danger">
						<div className="flex flex-col sm:flex-row gap-2 items-start">
							<span className="text-sm font-medium">{error}</span>
							<button
								onClick={refetch}
								className="text-sm text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
							>
								Retry
							</button>
						</div>
					</Alert>
				)}

				{/* Partial errors */}
				{errors.length > 0 && (
					<Alert variant="warning">
						<div className="space-y-1">
							{errors.map((e, i) => (
								<p key={i} className="text-sm">
									⚠️ {e.source}: {e.message}
								</p>
							))}
						</div>
					</Alert>
				)}

				{/* Onboarding Banner */}
				<OnboardingBanner
					has2FA={onboarding.has2FA}
					hasApiKeys={onboarding.hasApiKeys}
					loading={onboarding.loading}
					onSetup2FA={() => navigate("/2fa-setup")}
					onConnectApi={() => navigate("/connect")}
				/>

				{/* KPI Grid */}
				{data && (
					<KPIGrid
						initialBalance={initialBalance}
						currentBalance={currentBalance}
						grossProfit={grossProfit}
						performance={performance}
						pendingFee={pendingFee}
					/>
				)}

				{/* Main Content Grid */}
				{data && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
						<EquityChart data={data.equityHistory ?? []} />
						<BotStatusPanel
							botStatus={
								data.botStatus ?? {
									active: false,
									runningSince: null,
									strategy: "N/A",
								}
							}
							onToggleBot={() => {
								// Placeholder: no-op in v1. Future: backend toggle.
							}}
							onWithdraw={() => setWithdrawModalOpen(true)}
							onRiskSettings={() => {
								// Placeholder: no-op in v1. Future: navigate to risk settings.
							}}
						/>
					</div>
				)}

				{/* Recent Trades */}
				{data && <RecentTradesTable trades={data.trades ?? []} />}

				{/* Trust Reminder */}
				<Alert variant="info" icon={<Shield size={16} />}>
					<div className="flex flex-col sm:flex-row gap-2">
						<span className="text-sm font-medium">
							Your funds are in your Binance account. We only execute orders via
							API.
						</span>
						<a
							href="https://www.binance.com/en/my/wallet"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 shrink-0 whitespace-nowrap"
						>
							Verify on Binance <ExternalLink size={14} />
						</a>
					</div>
				</Alert>
			</div>

			<WithdrawModal
				isOpen={withdrawModalOpen}
				onClose={() => setWithdrawModalOpen(false)}
			/>
		</DashboardLayout>
	);
};

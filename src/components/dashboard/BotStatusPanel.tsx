// ============================================
// BOT STATUS PANEL COMPONENT
// ============================================

import { Play, Pause, Settings, Wallet } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { DashboardBotStatus } from "../../types";

interface BotStatusPanelProps {
	botStatus: DashboardBotStatus;
	onToggleBot: () => void;
	onWithdraw: () => void;
	onRiskSettings: () => void;
}

export const BotStatusPanel: React.FC<BotStatusPanelProps> = ({
	botStatus,
	onToggleBot,
	onWithdraw,
	onRiskSettings,
}) => {
	const { active, runningSince, strategy } = botStatus;
	const badgeVariant = active ? "success" : "warning";
	const statusLabel = active ? "Active" : "Paused";

	return (
		<Card className="p-4 md:p-6">
			<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">
				Bot Status
			</h3>
			<div className="flex items-center gap-3 mb-6">
				<div
					className={`w-3 h-3 rounded-full ${
						active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
					}`}
				/>
				<Badge variant={badgeVariant}>{statusLabel}</Badge>
			</div>

			<div className="space-y-3 mb-6">
				<div className="flex justify-between text-sm">
					<span className="text-slate-500">Running since</span>
					<span className="text-slate-900 dark:text-white font-medium">
						{runningSince ?? "—"}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-slate-500">Strategy</span>
					<span className="text-slate-900 dark:text-white font-medium">
						{strategy}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-slate-500">Last trade</span>
					<span className="text-slate-900 dark:text-white font-medium">—</span>
				</div>
			</div>

			<div className="space-y-2">
				<Button
					variant={active ? "secondary" : "primary"}
					onClick={onToggleBot}
					className="w-full"
				>
					{active ? (
						<Pause size={16} className="mr-2" />
					) : (
						<Play size={16} className="mr-2" />
					)}
					{active ? "Pause Bot" : "Resume Bot"}
				</Button>
				<Button variant="secondary" className="w-full" onClick={onRiskSettings}>
					<Settings size={16} className="mr-2" /> Risk Settings
				</Button>
				<Button onClick={onWithdraw} className="w-full">
					<Wallet size={16} className="mr-2" /> Withdraw Profits
				</Button>
			</div>
		</Card>
	);
};

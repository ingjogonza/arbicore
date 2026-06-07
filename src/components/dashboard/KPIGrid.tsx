// ============================================
// KPI GRID COMPONENT
// ============================================

import { Wallet, TrendingUp, BarChart3, Percent, Receipt } from "lucide-react";
import { KPICard } from "../ui/KPICard";

interface KPIGridProps {
	initialBalance: number;
	currentBalance: number;
	grossProfit: number;
	performance: string;
	pendingFee: number;
}

const fmt = (v: number): string =>
	v.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

export const KPIGrid: React.FC<KPIGridProps> = ({
	initialBalance,
	currentBalance,
	grossProfit,
	performance,
	pendingFee,
}) => {
	const isPositive = grossProfit >= 0;
	const profitSign = isPositive ? "+" : "-";

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
			<KPICard
				label="Initial Balance"
				value={`${fmt(initialBalance)} USDT`}
				icon={<Wallet size={20} />}
			/>
			<KPICard
				label="Current Balance"
				value={`${fmt(currentBalance)} USDT`}
				change={`${profitSign}${fmt(Math.abs(grossProfit))} (${profitSign}${performance}%)`}
				changePositive={isPositive}
				icon={<TrendingUp size={20} />}
				iconColor="text-emerald-500"
			/>
			<KPICard
				label="Net Profit"
				value={`${profitSign}${fmt(Math.abs(grossProfit))} USDT`}
				changePositive={isPositive}
				icon={<BarChart3 size={20} />}
				iconColor="text-emerald-500"
			/>
			<KPICard
				label="Performance"
				value={`${profitSign}${performance}%`}
				change="Since activation"
				changePositive={isPositive}
				icon={<Percent size={20} />}
				iconColor="text-teal-500"
			/>
			<KPICard
				label="Pending Fee (7%)"
				value={`${fmt(Math.abs(pendingFee))} USDT`}
				change="Payable on withdrawal"
				changePositive={true}
				icon={<Receipt size={20} />}
				iconColor="text-amber-500"
			/>
		</div>
	);
};

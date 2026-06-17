// ============================================
// KPI GRID COMPONENT
// ============================================

import { Wallet, TrendingUp, BarChart3, Percent, Receipt } from "lucide-react";
import { KPICard } from "../ui/KPICard";
import type { CumulativeDeposits } from "../../types";

interface KPIGridProps {
	cumulativeDeposits: CumulativeDeposits;
	totalDepositedFDUSD: number;
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

const TOTAL_DEPOSITED_LABEL = "Total Deposited";
const FALLBACK_DEPOSITS_LABEL = "Sin depósitos detectados";

/**
 * Renders the Total Deposited card:
 * - Primary value: totalDepositedFDUSD formatted as "X.XX FDUSD".
 * - Secondary line: comma-separated list of non-FDUSD coins from the map.
 * - Empty case: shows fallback label, no value.
 */
const formatTotalDeposited = (
	map: CumulativeDeposits,
	totalFDUSD: number,
): { label: string; value: string; secondary?: string } => {
	const entries = Object.entries(map);
	if (entries.length === 0) {
		return {
			label: FALLBACK_DEPOSITS_LABEL,
			value: `${fmt(totalFDUSD)} FDUSD`,
		};
	}

	const otherCoins = entries
		.filter(([coin]) => coin !== "FDUSD")
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([coin, amount]) => `${fmt(amount)} ${coin}`)
		.join(", ");

	return {
		label: TOTAL_DEPOSITED_LABEL,
		value: `${fmt(totalFDUSD)} FDUSD`,
		secondary: otherCoins || undefined,
	};
};

export const KPIGrid: React.FC<KPIGridProps> = ({
	cumulativeDeposits,
	totalDepositedFDUSD,
	currentBalance,
	grossProfit,
	performance,
	pendingFee,
}) => {
	const isPositive = grossProfit >= 0;
	const profitSign = isPositive ? "+" : "-";
	const deposits = formatTotalDeposited(cumulativeDeposits, totalDepositedFDUSD);

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
			<KPICard
				label={deposits.label}
				value={deposits.value}
				subtitle={deposits.secondary}
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

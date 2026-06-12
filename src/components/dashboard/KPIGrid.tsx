// ============================================
// KPI GRID COMPONENT
// ============================================

import { Wallet, TrendingUp, BarChart3, Percent, Receipt } from "lucide-react";
import { KPICard } from "../ui/KPICard";
import type { InitialOperation } from "../../types";

interface KPIGridProps {
	initialOperation: InitialOperation | null;
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

const INITIAL_OPERATION_LABELS: Record<InitialOperation["type"], string> = {
	deposit: "Depósito Inicial",
	transfer: "Transferencia Inicial",
};

const FALLBACK_INITIAL_LABEL = "Sin operación inicial";

const formatInitialOperation = (
	op: InitialOperation | null,
): { label: string; value: string } => {
	if (!op) {
		return { label: FALLBACK_INITIAL_LABEL, value: "" };
	}
	return {
		label: INITIAL_OPERATION_LABELS[op.type],
		value: `${op.amount} ${op.coin}`,
	};
};

export const KPIGrid: React.FC<KPIGridProps> = ({
	initialOperation,
	currentBalance,
	grossProfit,
	performance,
	pendingFee,
}) => {
	const isPositive = grossProfit >= 0;
	const profitSign = isPositive ? "+" : "-";
	const initial = formatInitialOperation(initialOperation);

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
			<KPICard
				label={initial.label}
				value={initial.value}
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

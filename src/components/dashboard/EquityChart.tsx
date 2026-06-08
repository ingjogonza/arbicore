// ============================================
// EQUITY CHART COMPONENT
// ============================================

import { useState } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts";
import { Card } from "../ui/Card";
import type { DashboardEquityPoint } from "../../types";

interface EquityChartProps {
	data: DashboardEquityPoint[];
}

const PERIODS = ["1D", "1W", "1M", "3M", "ALL"] as const;
type Period = (typeof PERIODS)[number];

export const EquityChart: React.FC<EquityChartProps> = ({ data }) => {
	const [selectedPeriod, setSelectedPeriod] = useState<Period>("ALL");

	// Reference line at first data point value (initial balance)
	const initialBalance =
		data.length > 0 && Number.isFinite(data[0].value) ? data[0].value : 0;

	if (data.length === 0) {
		return (
			<Card className="p-4 md:p-6">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
					Equity Curve
				</h3>
				<div className="h-48 md:h-72 flex items-center justify-center">
					<p className="text-sm text-slate-500">No equity data available</p>
				</div>
			</Card>
		);
	}

	// v1: period filtering is visual-only (all data shown).
	const displayData = data;

	return (
		<Card className="lg:col-span-2 p-4 md:p-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
					Equity Curve
				</h3>
				<div className="flex gap-1">
					{PERIODS.map((period) => (
						<button
							key={period}
							onClick={() => setSelectedPeriod(period)}
							className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
								selectedPeriod === period
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
							}`}
						>
							{period}
						</button>
					))}
				</div>
			</div>
			<div className="h-48 md:h-72">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={displayData}
						margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
					>
						<defs>
							<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
								<stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
						<XAxis
							dataKey="date"
							tick={{ fontSize: 12, fill: "#94a3b8" }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							tick={{ fontSize: 12, fill: "#94a3b8" }}
							axisLine={false}
							tickLine={false}
							domain={[0, "auto"]}
							allowDecimals={true}
							tickCount={5}
							tickFormatter={(v: number) =>
								Number.isFinite(v) && v > 0
									? v < 1
										? `${v.toFixed(6)} BTC`
										: `${v.toFixed(4)} BTC`
									: ""
							}
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: "white",
								border: "1px solid #e2e8f0",
								borderRadius: "8px",
								boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
							}}
							formatter={(value: number) => [
								Number.isFinite(value)
									? `${value.toFixed(8)} BTC`
									: "0 BTC",
								"Portfolio Value",
							]}
						/>
						{initialBalance > 0 && (
							<ReferenceLine
								y={initialBalance}
								stroke="#94a3b8"
								strokeDasharray="5 5"
								label={{
									value: "Initial",
									position: "right",
									fontSize: 10,
									fill: "#94a3b8",
								}}
							/>
						)}
						<Area
							type="monotone"
							dataKey="value"
							stroke="#0d9488"
							strokeWidth={2}
							fill="url(#colorValue)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
};

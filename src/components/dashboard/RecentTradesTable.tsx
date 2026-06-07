// ============================================
// RECENT TRADES TABLE COMPONENT
// ============================================

import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import type { DashboardTrade } from "../../types";

interface RecentTradesTableProps {
	trades: DashboardTrade[];
}

const fmtDate = (ts: number): string => {
	const d = new Date(ts);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const fmtNumber = (n: string): string =>
	parseFloat(n).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 8,
	});

export const RecentTradesTable: React.FC<RecentTradesTableProps> = ({
	trades,
}) => {
	if (trades.length === 0) {
		return (
			<Card>
				<div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700">
					<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
						Recent Operations
					</h3>
				</div>
				<div className="p-6 text-center text-sm text-slate-500">
					No trades found for BTC/FDUSD.
				</div>
			</Card>
		);
	}

	return (
		<Card>
			<div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
					Recent Operations
				</h3>
				<button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
					View All
				</button>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="bg-slate-50 dark:bg-slate-800/50">
							<th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Date
							</th>
							<th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Pair
							</th>
							<th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Type
							</th>
							<th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Amount
							</th>
							<th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
								Price
							</th>
							<th className="px-3 md:px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Commission
							</th>
							<th className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 dark:divide-slate-700">
						{trades.map((trade) => (
							<tr
								key={trade.id}
								className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
							>
								<td className="px-3 md:px-6 py-3 text-xs md:text-sm text-slate-500">
									{fmtDate(trade.time)}
								</td>
								<td className="px-3 md:px-6 py-3 text-xs md:text-sm font-semibold text-slate-900 dark:text-white">
									{trade.symbol.replace("FDUSD", "/FDUSD")}
								</td>
								<td className="px-3 md:px-6 py-3">
									<Badge variant={trade.isBuyer ? "info" : "warning"}>
										{trade.isBuyer ? "BUY" : "SELL"}
									</Badge>
								</td>
								<td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-900 dark:text-white">
									{fmtNumber(trade.qty)}
								</td>
								<td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-500 hidden sm:table-cell">
									${fmtNumber(trade.price)}
								</td>
								<td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-mono text-slate-500">
									{fmtNumber(trade.commission)} {trade.commissionAsset}
								</td>
								<td className="px-3 md:px-6 py-3 hidden sm:table-cell">
									<Badge variant="success">Completed</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
};

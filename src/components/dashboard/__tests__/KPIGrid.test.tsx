// ============================================
// KPI GRID TESTS
// ============================================

import { render, screen } from "@testing-library/react";
import { KPIGrid } from "../KPIGrid";

const baseProps = {
	currentBalance: 14832.5,
	grossProfit: 2332.5,
	performance: "18.66",
	pendingFee: 163.275,
};

describe("KPIGrid", () => {
	// ── Spec: Total Deposited label always present ──
	test("renders Total Deposited label and the other 4 KPI labels", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalStablecoinDepositedUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("Total Deposited")).toBeInTheDocument();
		expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
		expect(screen.getByText(/Performance/i)).toBeInTheDocument();
		expect(screen.getByText(/Pending Fee/i)).toBeInTheDocument();
	});

	// ── Spec: Only FDUSD — primary value in USD, no extra list ──
	test("only FDUSD shows the USD total with the FDUSD entry as secondary", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalStablecoinDepositedUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("10.14 USD")).toBeInTheDocument();
		expect(screen.getByText("10.14 FDUSD")).toBeInTheDocument();
	});

	// ── Spec: Multiple stablecoins — compact list of stables only ──
	test("multiple stablecoins show USD total and compact list of stables", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14, USDT: 250, USDC: 25 }}
				totalStablecoinDepositedUSD={285.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("285.14 USD")).toBeInTheDocument();
		// Stablecoin list shows all three stables, ordered alphabetically.
		expect(screen.getByText("10.14 FDUSD, 25.00 USDC, 250.00 USDT")).toBeInTheDocument();
	});

	// ── Spec: Non-stablecoin entries are excluded from the list ──
	test("BTC and ETH deposits are not shown in the secondary list", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14, BTC: 0.5, ETH: 0.1 }}
				totalStablecoinDepositedUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("10.14 USD")).toBeInTheDocument();
		expect(screen.getByText("10.14 FDUSD")).toBeInTheDocument();
		// BTC and ETH must NOT appear in the rendered list.
		expect(screen.queryByText(/0\.50 BTC/)).not.toBeInTheDocument();
		expect(screen.queryByText(/0\.10 ETH/)).not.toBeInTheDocument();
	});

	// ── Spec: Empty map — fallback label ──
	test("empty map shows fallback label and the fallback value", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{}}
				totalStablecoinDepositedUSD={12.5}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("Sin depósitos detectados")).toBeInTheDocument();
		// Fallback value still displayed.
		expect(screen.getByText("12.50 USD")).toBeInTheDocument();
	});

	// ── Spec: Map with only non-stablecoins — fallback label ──
	test("map with only non-stablecoins shows fallback label", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ BTC: 0.5, ETH: 0.1 }}
				totalStablecoinDepositedUSD={0}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("Sin depósitos detectados")).toBeInTheDocument();
		// No stablecoin list rendered.
		expect(screen.queryByText(/0\.50 BTC/)).not.toBeInTheDocument();
	});

	// ── Other KPIs unchanged ──
	test("shows correct formatted current balance", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalStablecoinDepositedUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText(/14,832\.50 USDT/)).toBeInTheDocument();
	});

	test("shows correct formatted net profit (positive)", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalStablecoinDepositedUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText(/\+2,332\.50 USDT/)).toBeInTheDocument();
	});

	test("handles negative grossProfit", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalStablecoinDepositedUSD={10.14}
				currentBalance={8000}
				grossProfit={-2000}
				performance="-20.00"
				pendingFee={0}
			/>,
		);

		expect(screen.getByText("-2,000.00 USDT")).toBeInTheDocument();
	});

	test("shows negative performance indicator", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalStablecoinDepositedUSD={10.14}
				currentBalance={8000}
				grossProfit={-2000}
				performance="-20.00"
				pendingFee={0}
			/>,
		);

		const matches = screen.getAllByText(/-20\.00%/);
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});
});

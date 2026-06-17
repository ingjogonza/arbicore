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
				totalDepositedFDUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("Total Deposited")).toBeInTheDocument();
		expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
		expect(screen.getByText(/Performance/i)).toBeInTheDocument();
		expect(screen.getByText(/Pending Fee/i)).toBeInTheDocument();
	});

	// ── Spec: Only FDUSD — no extra list ──
	test("only FDUSD in the map shows the FDUSD total with no secondary list", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalDepositedFDUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("10.14 FDUSD")).toBeInTheDocument();
		// No extra coin list rendered.
		expect(screen.queryByText(/0\.5 BTC/)).not.toBeInTheDocument();
		expect(screen.queryByText(/250 USDT/)).not.toBeInTheDocument();
	});

	// ── Spec: Multiple coins — compact list of other coins ──
	test("multiple coins show FDUSD primary and compact list of other coins", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14, BTC: 0.5, USDT: 250 }}
				totalDepositedFDUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("10.14 FDUSD")).toBeInTheDocument();
		// The compact list shows BTC and USDT but not FDUSD again.
		expect(screen.getByText("0.50 BTC, 250.00 USDT")).toBeInTheDocument();
	});

	// ── Spec: Empty map — fallback label ──
	test("empty map shows fallback label and the fallback value", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{}}
				totalDepositedFDUSD={12.5}
				{...baseProps}
			/>,
		);

		expect(screen.getByText("Sin depósitos detectados")).toBeInTheDocument();
		// Fallback value still displayed.
		expect(screen.getByText("12.50 FDUSD")).toBeInTheDocument();
	});

	// ── Other KPIs unchanged ──
	test("shows correct formatted current balance", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalDepositedFDUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText(/14,832\.50 USDT/)).toBeInTheDocument();
	});

	test("shows correct formatted net profit (positive)", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalDepositedFDUSD={10.14}
				{...baseProps}
			/>,
		);

		expect(screen.getByText(/\+2,332\.50 USDT/)).toBeInTheDocument();
	});

	test("handles negative grossProfit", () => {
		render(
			<KPIGrid
				cumulativeDeposits={{ FDUSD: 10.14 }}
				totalDepositedFDUSD={10.14}
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
				totalDepositedFDUSD={10.14}
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

// ============================================
// KPI GRID TESTS
// ============================================

import { render, screen } from "@testing-library/react";
import { KPIGrid } from "../KPIGrid";

describe("KPIGrid", () => {
	const defaultProps = {
		initialBalance: 12500,
		currentBalance: 14832.5,
		grossProfit: 2332.5,
		performance: "18.66",
		pendingFee: 163.275,
	};

	test("renders all 5 KPIs", () => {
		render(<KPIGrid {...defaultProps} />);

		expect(screen.getByText(/Initial Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
		expect(screen.getByText(/Performance/i)).toBeInTheDocument();
		expect(screen.getByText(/Pending Fee/i)).toBeInTheDocument();
	});

	test("shows correct formatted initial balance", () => {
		render(<KPIGrid {...defaultProps} />);

		expect(screen.getByText(/12,500.00 USDT/)).toBeInTheDocument();
	});

	test("shows correct formatted current balance", () => {
		render(<KPIGrid {...defaultProps} />);

		expect(screen.getByText(/14,832.50 USDT/)).toBeInTheDocument();
	});

	test("shows correct formatted net profit", () => {
		render(<KPIGrid {...defaultProps} />);

		expect(screen.getByText(/\+2,332.50 USDT/)).toBeInTheDocument();
	});

	test("handles zero initialBalance", () => {
		render(
			<KPIGrid
				initialBalance={0}
				currentBalance={5000}
				grossProfit={5000}
				performance="N/A"
				pendingFee={350}
			/>,
		);

		// The "Initial Balance" KPI should show 0.00
		const kpiCards = screen.getAllByText(/USDT/);
		expect(kpiCards.some((el) => el.textContent === "0.00 USDT")).toBe(true);
	});

	test("handles negative grossProfit", () => {
		render(
			<KPIGrid
				initialBalance={10000}
				currentBalance={8000}
				grossProfit={-2000}
				performance="-20.00"
				pendingFee={0}
			/>,
		);

		// Net profit should show negative value
		expect(screen.getByText("-2,000.00 USDT")).toBeInTheDocument();
	});

	test("shows negative performance indicator", () => {
		render(
			<KPIGrid
				initialBalance={10000}
				currentBalance={8000}
				grossProfit={-2000}
				performance="-20.00"
				pendingFee={0}
			/>,
		);

		// Performance KPI should show -20.00% (appears in Performance card value and in change text)
		const matches = screen.getAllByText(/-20.00%/);
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});
});

// ============================================
// KPI GRID TESTS
// ============================================

import { render, screen } from "@testing-library/react";
import { KPIGrid } from "../KPIGrid";
import type { InitialOperation } from "../../../types";

const depositOperation: InitialOperation = {
	type: "deposit",
	coin: "BTC",
	amount: 0.5,
	time: 1700000000000,
};

const transferOperation: InitialOperation = {
	type: "transfer",
	coin: "USDT",
	amount: 1000,
	time: 1700000000000,
};

const baseProps = {
	currentBalance: 14832.5,
	grossProfit: 2332.5,
	performance: "18.66",
	pendingFee: 163.275,
};

describe("KPIGrid", () => {
	test("renders all 5 KPI labels", () => {
		render(<KPIGrid initialOperation={depositOperation} {...baseProps} />);

		expect(screen.getByText(/Depósito Inicial/i)).toBeInTheDocument();
		expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
		expect(screen.getByText(/Performance/i)).toBeInTheDocument();
		expect(screen.getByText(/Pending Fee/i)).toBeInTheDocument();
	});

	// ── Spec: Deposit operation displayed ──
	test("deposit operation shows 'Depósito Inicial' label and amount with coin", () => {
		render(<KPIGrid initialOperation={depositOperation} {...baseProps} />);

		expect(screen.getByText("Depósito Inicial")).toBeInTheDocument();
		expect(screen.getByText("0.5 BTC")).toBeInTheDocument();
	});

	// ── Spec: Transfer operation displayed ──
	test("transfer operation shows 'Transferencia Inicial' label and amount with coin", () => {
		render(<KPIGrid initialOperation={transferOperation} {...baseProps} />);

		expect(screen.getByText("Transferencia Inicial")).toBeInTheDocument();
		expect(screen.getByText("1000 USDT")).toBeInTheDocument();
	});

	// ── Spec: No initial operation ──
	test("null operation shows fallback label and no amount value", () => {
		render(<KPIGrid initialOperation={null} {...baseProps} />);

		expect(screen.getByText("Sin operación inicial")).toBeInTheDocument();
		// No amount value should be displayed for the initial-operation card.
		// The current/net/etc. KPIs still render USDT amounts, but the deposit
		// card itself must not display BTC/USDT/coin amount text.
		expect(screen.queryByText(/0(\.|,)\d+ BTC/)).not.toBeInTheDocument();
		expect(screen.queryByText(/^\d+ USDT$/)).not.toBeInTheDocument();
	});

	test("shows correct formatted current balance", () => {
		render(<KPIGrid initialOperation={depositOperation} {...baseProps} />);

		expect(screen.getByText(/14,832\.50 USDT/)).toBeInTheDocument();
	});

	test("shows correct formatted net profit (positive)", () => {
		render(<KPIGrid initialOperation={depositOperation} {...baseProps} />);

		expect(screen.getByText(/\+2,332\.50 USDT/)).toBeInTheDocument();
	});

	test("handles negative grossProfit", () => {
		render(
			<KPIGrid
				initialOperation={depositOperation}
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
				initialOperation={depositOperation}
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

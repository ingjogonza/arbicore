// ============================================
// RECENT TRADES TABLE TESTS
// ============================================

import { render, screen } from "@testing-library/react";
import { RecentTradesTable } from "../RecentTradesTable";
import type { DashboardTrade } from "../../../types";

const mockTrades: DashboardTrade[] = [
	{
		id: 1,
		symbol: "BTCFDUSD",
		orderId: 100,
		price: "50000.00",
		qty: "0.01000000",
		quoteQty: "500.00",
		commission: "0.50",
		commissionAsset: "FDUSD",
		time: 1717000000000,
		isBuyer: true,
		isMaker: false,
	},
	{
		id: 2,
		symbol: "ETHFDUSD",
		orderId: 101,
		price: "3000.00",
		qty: "1.50000000",
		quoteQty: "4500.00",
		commission: "4.50",
		commissionAsset: "FDUSD",
		time: 1717000100000,
		isBuyer: false,
		isMaker: true,
	},
];

describe("RecentTradesTable", () => {
	test("renders table with trades", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		expect(screen.getByText(/Recent Operations/i)).toBeInTheDocument();
	});

	test("renders BUY badge for buyer trades", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		expect(screen.getByText("BUY")).toBeInTheDocument();
	});

	test("renders SELL badge for seller trades", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		expect(screen.getByText("SELL")).toBeInTheDocument();
	});

	test("renders correct symbol format", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		expect(screen.getByText("BTC/FDUSD")).toBeInTheDocument();
		expect(screen.getByText("ETH/FDUSD")).toBeInTheDocument();
	});

	test("renders empty state when no trades", () => {
		render(<RecentTradesTable trades={[]} />);

		expect(screen.getByText(/no trades found/i)).toBeInTheDocument();
	});

	test("renders correct number of data rows", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		const rows = screen.getAllByRole("row");
		// 1 header row + 2 data rows = 3
		expect(rows).toHaveLength(3);
	});

	test("renders all column headers", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		expect(screen.getByText("Date")).toBeInTheDocument();
		expect(screen.getByText("Pair")).toBeInTheDocument();
		expect(screen.getByText("Type")).toBeInTheDocument();
		expect(screen.getByText("Amount")).toBeInTheDocument();
		expect(screen.getByText("Price")).toBeInTheDocument();
		expect(screen.getByText("Commission")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();
	});

	test("renders formatted date from unix timestamp", () => {
		render(<RecentTradesTable trades={mockTrades} />);

		// 1717000000000 = May 29, 2024, 18:26:40 UTC
		// Both trades are on the same day so there are 2 date cells with "May 29"
		const dateMatches = screen.getAllByText(/May 29/);
		expect(dateMatches.length).toBeGreaterThanOrEqual(1);
	});
});

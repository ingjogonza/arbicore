// ============================================
// EQUITY CHART TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { EquityChart } from "../EquityChart";
import type { DashboardEquityPoint } from "../../../types";

const mockData: DashboardEquityPoint[] = [
	{ date: "Jan 15", value: 12500 },
	{ date: "Jan 22", value: 13100 },
	{ date: "Feb 5", value: 14832 },
];

describe("EquityChart", () => {
	test("renders chart with data without crashing", () => {
		const { container } = render(<EquityChart data={mockData} />);

		// In JSDOM, ResponsiveContainer may not render SVG. Just verify it doesn't crash.
		expect(container.firstChild).not.toBeNull();
	});

	test("renders all period selector buttons", () => {
		render(<EquityChart data={mockData} />);

		expect(screen.getByText("1D")).toBeInTheDocument();
		expect(screen.getByText("1W")).toBeInTheDocument();
		expect(screen.getByText("1M")).toBeInTheDocument();
		expect(screen.getByText("3M")).toBeInTheDocument();
		expect(screen.getByText("ALL")).toBeInTheDocument();
	});

	test("ALL period is selected by default", () => {
		render(<EquityChart data={mockData} />);

		const allBtn = screen.getByText("ALL");
		expect(allBtn).toHaveClass("bg-teal-600");
	});

	test("period button click highlights selected period", () => {
		render(<EquityChart data={mockData} />);

		const allBtn = screen.getByText("ALL");
		const weekBtn = screen.getByText("1W");

		fireEvent.click(weekBtn);

		expect(weekBtn).toHaveClass("bg-teal-600");
		expect(allBtn).not.toHaveClass("bg-teal-600");
	});

	test("renders empty state message when no data", () => {
		render(<EquityChart data={[]} />);

		expect(screen.getByText(/no equity data available/i)).toBeInTheDocument();
	});

	test("renders empty state message when data is null-equivalent", () => {
		const { container } = render(<EquityChart data={[]} />);

		// Should show message instead of chart
		expect(container.getElementsByClassName("recharts-wrapper").length).toBe(0);
	});

	test("shows section title", () => {
		render(<EquityChart data={mockData} />);

		expect(screen.getByText(/Equity Curve/i)).toBeInTheDocument();
	});
});

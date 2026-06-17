// ============================================
// EQUITY CHART TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import type { DashboardEquityPoint, InitialOperation } from "../../../types";

// Mock recharts so the reference line decision is observable in JSDOM.
// We capture each ReferenceLine `y` prop in a module-scoped array so tests
// can assert which references the chart actually rendered.
const referenceLineProps: Array<{ y: number | undefined }> = [];

jest.mock("recharts", () => {
	const React = require("react");
	return {
		__esModule: true,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
			React.createElement("div", { "data-testid": "rc-container" }, children),
		AreaChart: ({ children }: { children: React.ReactNode }) =>
			React.createElement("div", { "data-testid": "rc-areachart" }, children),
		Area: () => null,
		XAxis: () => null,
		YAxis: () => null,
		CartesianGrid: () => null,
		Tooltip: () => null,
		ReferenceLine: (props: { y?: number }) => {
			referenceLineProps.push({ y: props.y });
			return React.createElement("div", {
				"data-testid": "rc-reference-line",
				"data-y": String(props.y),
			});
		},
	};
});

import { EquityChart } from "../EquityChart";

const mockData: DashboardEquityPoint[] = [
	{ date: "Jan 15", value: 12500 },
	{ date: "Jan 22", value: 13100 },
	{ date: "Feb 5", value: 14832 },
];

const depositOp: InitialOperation = {
	type: "deposit",
	coin: "BTC",
	amount: 500,
	time: 1700000000000,
};

beforeEach(() => {
	referenceLineProps.length = 0;
});

describe("EquityChart", () => {
	test("renders chart container with data without crashing", () => {
		const { container } = render(
			<EquityChart data={mockData} initialOperation={depositOp} />,
		);

		expect(container.firstChild).not.toBeNull();
		expect(screen.getByTestId("rc-areachart")).toBeInTheDocument();
	});

	test("renders all period selector buttons", () => {
		render(<EquityChart data={mockData} initialOperation={depositOp} />);

		expect(screen.getByText("1D")).toBeInTheDocument();
		expect(screen.getByText("1W")).toBeInTheDocument();
		expect(screen.getByText("1M")).toBeInTheDocument();
		expect(screen.getByText("3M")).toBeInTheDocument();
		expect(screen.getByText("ALL")).toBeInTheDocument();
	});

	test("ALL period is selected by default", () => {
		render(<EquityChart data={mockData} initialOperation={depositOp} />);

		const allBtn = screen.getByText("ALL");
		expect(allBtn).toHaveClass("bg-teal-600");
	});

	test("period button click highlights selected period", () => {
		render(<EquityChart data={mockData} initialOperation={depositOp} />);

		const allBtn = screen.getByText("ALL");
		const weekBtn = screen.getByText("1W");

		fireEvent.click(weekBtn);

		expect(weekBtn).toHaveClass("bg-teal-600");
		expect(allBtn).not.toHaveClass("bg-teal-600");
	});

	test("renders empty state message when no data", () => {
		render(<EquityChart data={[]} initialOperation={depositOp} />);

		expect(screen.getByText(/no equity data available/i)).toBeInTheDocument();
		expect(screen.queryByTestId("rc-areachart")).not.toBeInTheDocument();
	});

	test("shows section title", () => {
		render(<EquityChart data={mockData} initialOperation={depositOp} />);

		expect(screen.getByText(/Equity Curve/i)).toBeInTheDocument();
	});

	// ── Spec: Chart reference line with operation ──
	test("renders reference line at initialOperation.amount when operation provided", () => {
		render(<EquityChart data={mockData} initialOperation={depositOp} />);

		expect(referenceLineProps).toHaveLength(1);
		expect(referenceLineProps[0].y).toBe(500);
	});

	test("renders reference line at a different amount (triangulation)", () => {
		const otherOp: InitialOperation = {
			type: "transfer",
			coin: "USDT",
			amount: 1234.56,
			time: 1700000000000,
		};

		render(<EquityChart data={mockData} initialOperation={otherOp} />);

		expect(referenceLineProps).toHaveLength(1);
		expect(referenceLineProps[0].y).toBe(1234.56);
	});

	// ── Spec: Chart reference line with null operation ──
	test("does NOT render reference line when initialOperation is null", () => {
		render(<EquityChart data={mockData} initialOperation={null} />);

		expect(referenceLineProps).toHaveLength(0);
		expect(screen.queryByTestId("rc-reference-line")).not.toBeInTheDocument();
	});
});

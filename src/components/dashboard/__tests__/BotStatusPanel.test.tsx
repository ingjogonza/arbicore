// ============================================
// BOT STATUS PANEL TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BotStatusPanel } from "../BotStatusPanel";
import type { DashboardBotStatus } from "../../../types";

const mockOnToggleBot = jest.fn();
const mockOnWithdraw = jest.fn();
const mockOnRiskSettings = jest.fn();

const activeBot: DashboardBotStatus = {
	active: true,
	runningSince: "2026-01-15T00:00:00.000Z",
	strategy: "Conservative Spot Trading",
};

const inactiveBot: DashboardBotStatus = {
	active: false,
	runningSince: null,
	strategy: "Conservative Spot Trading",
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe("BotStatusPanel", () => {
	describe("rendering", () => {
		test("renders status card with title", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(screen.getByText(/Bot Status/i)).toBeInTheDocument();
		});

		test("renders strategy name", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(screen.getByText("Conservative Spot Trading")).toBeInTheDocument();
		});

		test("renders running since when available", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(screen.getByText("2026-01-15T00:00:00.000Z")).toBeInTheDocument();
		});

		test("renders em-dash for null runningSince", () => {
			render(
				<BotStatusPanel
					botStatus={inactiveBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			// Both "Running since" and "Last trade" show em-dash
			const dashes = screen.getAllByText("—");
			expect(dashes.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("active bot", () => {
		test("shows Active badge when active", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(screen.getByText("Active")).toBeInTheDocument();
		});

		test("shows Pause Bot button when active", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /pause bot/i }),
			).toBeInTheDocument();
		});

		test("toggle button calls onToggleBot", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			fireEvent.click(screen.getByRole("button", { name: /pause bot/i }));
			expect(mockOnToggleBot).toHaveBeenCalledTimes(1);
		});
	});

	describe("inactive bot", () => {
		test("shows Paused badge when inactive", () => {
			render(
				<BotStatusPanel
					botStatus={inactiveBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(screen.getByText("Paused")).toBeInTheDocument();
		});

		test("shows Resume Bot button when inactive", () => {
			render(
				<BotStatusPanel
					botStatus={inactiveBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /resume bot/i }),
			).toBeInTheDocument();
		});
	});

	describe("action buttons", () => {
		test("calls onWithdraw when Withdraw Profits is clicked", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			fireEvent.click(
				screen.getByRole("button", { name: /withdraw profits/i }),
			);
			expect(mockOnWithdraw).toHaveBeenCalledTimes(1);
		});

		test("calls onRiskSettings when Risk Settings is clicked", () => {
			render(
				<BotStatusPanel
					botStatus={activeBot}
					onToggleBot={mockOnToggleBot}
					onWithdraw={mockOnWithdraw}
					onRiskSettings={mockOnRiskSettings}
				/>,
			);

			fireEvent.click(screen.getByRole("button", { name: /risk settings/i }));
			expect(mockOnRiskSettings).toHaveBeenCalledTimes(1);
		});
	});
});

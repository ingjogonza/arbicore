// ============================================
// DASHBOARD SCREEN TESTS
// ============================================
// Tests only developed functionality (KPIs, bot status, trades table, withdraw modal toggle).
// Does NOT test placeholder buttons (period selectors, Risk Settings, View All).

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DashboardScreen } from "../DashboardScreen";

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn().mockReturnValue({
		state: { user: null, loading: false },
		onboarding: { has2FA: true, hasApiKeys: true, loading: false },
		logout: jest.fn(),
	}),
}));

jest.mock("../../hooks/useTrading", () => ({
	useTrading: jest.fn(),
}));

import { useTrading } from "../../hooks/useTrading";

const mockToggleBot = jest.fn();
const mockWithdraw = jest.fn();

describe("DashboardScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useTrading as jest.Mock).mockReturnValue({
			user: { name: "Alex Rivera", email: "alex@example.com", avatar: "AR" },
			account: {
				initialBalance: 12500.0,
				currentBalance: 14832.5,
				apiConnected: true,
				apiKey: "••••••••••••••••",
				botStatus: "active",
				botRunningSince: "2026-01-15",
				strategy: "Conservative Spot Trading",
			},
			trades: [
				{
					id: "1",
					date: "2026-05-07 14:30",
					pair: "BTC/USDT",
					type: "buy",
					amount: 0.15,
					price: 97415.2,
					pnl: 0,
					status: "completed",
				},
				{
					id: "2",
					date: "2026-05-07 12:15",
					pair: "ETH/USDT",
					type: "sell",
					amount: 2.5,
					price: 3852.4,
					pnl: 125.5,
					status: "completed",
				},
			],
			toggleBot: mockToggleBot,
			withdraw: mockWithdraw,
		});
	});

	test("renders KPI cards with correct values", () => {
		render(
			<BrowserRouter>
				<DashboardScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText(/Initial Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/12,500.00 USDT/)).toBeInTheDocument();
		expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/14,832.50 USDT/)).toBeInTheDocument();
	});

	test("renders bot status panel", () => {
		render(
			<BrowserRouter>
				<DashboardScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText(/Bot Status/i)).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText(/Conservative Spot Trading/i)).toBeInTheDocument();
	});

	test("calls toggleBot when pause/resume button is clicked", () => {
		render(
			<BrowserRouter>
				<DashboardScreen />
			</BrowserRouter>,
		);
		const button = screen.getByRole("button", { name: /pause bot/i });
		fireEvent.click(button);
		expect(mockToggleBot).toHaveBeenCalledTimes(1);
	});

	test("renders recent trades table", () => {
		render(
			<BrowserRouter>
				<DashboardScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText(/Recent Operations/i)).toBeInTheDocument();
		expect(screen.getByText("BTC/USDT")).toBeInTheDocument();
		expect(screen.getByText("ETH/USDT")).toBeInTheDocument();
	});

	test("opens withdraw modal on button click", () => {
		render(
			<BrowserRouter>
				<DashboardScreen />
			</BrowserRouter>,
		);
		const withdrawButton = screen.getByRole("button", {
			name: /withdraw profits/i,
		});
		fireEvent.click(withdrawButton);
		expect(
			screen.getByRole("heading", { name: /Withdraw Profits/i }),
		).toBeInTheDocument();
	});

	test("renders trust reminder alert", () => {
		render(
			<BrowserRouter>
				<DashboardScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByText(/Your funds are in your Binance account/i),
		).toBeInTheDocument();
	});

	describe("botStatus branches", () => {
		test("shows paused bot status", () => {
			(useTrading as jest.Mock).mockReturnValue({
				user: { name: "Alex", email: "alex@test.com", avatar: "A" },
				account: {
					initialBalance: 12500,
					currentBalance: 14832.5,
					apiConnected: true,
					apiKey: "••••••••••••••",
					botStatus: "paused",
					botRunningSince: "2026-01-15",
					strategy: "Conservative",
				},
				trades: [],
				toggleBot: mockToggleBot,
				withdraw: mockWithdraw,
			});

			render(
				<BrowserRouter>
					<DashboardScreen />
				</BrowserRouter>,
			);

			expect(screen.getByText("Paused")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /resume bot/i }),
			).toBeInTheDocument();
		});

		test("shows error bot status", () => {
			(useTrading as jest.Mock).mockReturnValue({
				user: { name: "Alex", email: "alex@test.com", avatar: "A" },
				account: {
					initialBalance: 12500,
					currentBalance: 14832.5,
					apiConnected: true,
					apiKey: "••••••••••••••",
					botStatus: "error",
					botRunningSince: "2026-01-15",
					strategy: "Conservative",
				},
				trades: [],
				toggleBot: mockToggleBot,
				withdraw: mockWithdraw,
			});

			render(
				<BrowserRouter>
					<DashboardScreen />
				</BrowserRouter>,
			);

			expect(screen.getByText("Error")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /resume bot/i }),
			).toBeInTheDocument();
		});
	});

	describe("trade P&L branches", () => {
		test("shows red P&L for negative trade", () => {
			(useTrading as jest.Mock).mockReturnValue({
				user: { name: "Alex", email: "alex@test.com", avatar: "A" },
				account: {
					initialBalance: 12500,
					currentBalance: 14832.5,
					apiConnected: true,
					apiKey: "••••••••••••••",
					botStatus: "active",
					botRunningSince: "2026-01-15",
					strategy: "Conservative",
				},
				trades: [
					{
						id: "1",
						date: "2026-05-07 14:30",
						pair: "BTC/USDT",
						type: "buy",
						amount: 0.15,
						price: 97415.2,
						pnl: -50.25,
						status: "completed",
					},
				],
				toggleBot: mockToggleBot,
				withdraw: mockWithdraw,
			});

			render(
				<BrowserRouter>
					<DashboardScreen />
				</BrowserRouter>,
			);

			expect(screen.getByText(/-50\.25/)).toBeInTheDocument();
		});

		test("shows zero P&L as neutral", () => {
			(useTrading as jest.Mock).mockReturnValue({
				user: { name: "Alex", email: "alex@test.com", avatar: "A" },
				account: {
					initialBalance: 12500,
					currentBalance: 14832.5,
					apiConnected: true,
					apiKey: "••••••••••••••",
					botStatus: "active",
					botRunningSince: "2026-01-15",
					strategy: "Conservative",
				},
				trades: [
					{
						id: "1",
						date: "2026-05-07 14:30",
						pair: "BTC/USDT",
						type: "buy",
						amount: 0.15,
						price: 97415.2,
						pnl: 0,
						status: "completed",
					},
				],
				toggleBot: mockToggleBot,
				withdraw: mockWithdraw,
			});

			render(
				<BrowserRouter>
					<DashboardScreen />
				</BrowserRouter>,
			);

			// P&L of 0 should render without + or - sign
			expect(screen.getByText("0.00")).toBeInTheDocument();
		});
	});
});

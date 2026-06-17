// ============================================
// DASHBOARD SCREEN TESTS (REWRITTEN FOR REAL DATA)
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DashboardScreen } from "../DashboardScreen";

// ── Mocks ──

jest.mock("../../hooks/useDashboard", () => ({
	useDashboard: jest.fn(),
}));

jest.mock("../../hooks/useTrading", () => ({
	useTrading: jest.fn().mockReturnValue({
		user: { name: "Test User", email: "test@example.com", avatar: "TU" },
		account: {
			initialBalance: 12500,
			currentBalance: 14832.5,
			apiConnected: true,
			apiKey: "test-key",
			botStatus: "active",
			botRunningSince: "2026-01-15",
			strategy: "Conservative Spot Trading",
		},
		trades: [],
		toggleBot: jest.fn(),
		withdraw: jest.fn(),
	}),
}));

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

import { useDashboard } from "../../hooks/useDashboard";
import { useAuth } from "../../contexts/AuthContext";

const mockUseDashboard = useDashboard as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

const mockRefetch = jest.fn();

// ── Default mock data (happy path) ──

const defaultDashboardData = {
	balances: [
		{ asset: "FDUSD", free: "14832.50", locked: "0.00" },
		{ asset: "BTC", free: "0.50000000", locked: "0.00000000" },
	],
	cumulativeDeposits: { FDUSD: 12500 },
	totalDepositedFDUSD: 12500,
	trades: [
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
	],
	equityHistory: [
		{ date: "Jan 15", value: 12500 },
		{ date: "May 7", value: 14832 },
	],
	botStatus: {
		active: true,
		runningSince: "2026-01-15T00:00:00.000Z",
		strategy: "Conservative Spot Trading",
	},
};

beforeEach(() => {
	jest.clearAllMocks();

	// Default: happy path — data loaded, onboarding complete
	mockUseDashboard.mockReturnValue({
		data: defaultDashboardData,
		loading: false,
		error: null,
		errors: [],
		refetch: mockRefetch,
	});

	mockUseAuth.mockReturnValue({
		state: { user: null, session: null, loading: false },
		logout: jest.fn(),
		onboarding: { has2FA: true, hasApiKeys: true, loading: false },
	});
});

// ── Helper ──

const renderDashboard = () =>
	render(
		<BrowserRouter>
			<DashboardScreen />
		</BrowserRouter>,
	);

// ── Tests ──

describe("DashboardScreen (rewritten)", () => {
	describe("happy path — data loaded", () => {
		test("renders KPI cards via sub-components", () => {
			renderDashboard();

			expect(screen.getByText(/Total Deposited/i)).toBeInTheDocument();
			expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
			expect(screen.getByText(/Net Profit/i)).toBeInTheDocument();
			expect(screen.getByText(/Performance/i)).toBeInTheDocument();
			expect(screen.getByText(/Pending Fee/i)).toBeInTheDocument();
		});

		test("renders bot status panel", () => {
			renderDashboard();

			expect(screen.getByText(/Bot Status/i)).toBeInTheDocument();
			expect(screen.getByText("Active")).toBeInTheDocument();
			expect(screen.getByText("Conservative Spot Trading")).toBeInTheDocument();
		});

		test("renders recent trades table", () => {
			renderDashboard();

			expect(screen.getByText(/Recent Operations/i)).toBeInTheDocument();
			expect(screen.getByText("BUY")).toBeInTheDocument();
			expect(screen.getByText("SELL")).toBeInTheDocument();
		});

		test("renders equity chart", () => {
			renderDashboard();

			expect(screen.getByText(/Equity Curve/i)).toBeInTheDocument();
		});

		test("renders trust reminder alert", () => {
			renderDashboard();

			expect(
				screen.getByText(/Your funds are in your Binance account/i),
			).toBeInTheDocument();
		});

		test("opens withdraw modal on button click", () => {
			renderDashboard();

			const withdrawButton = screen.getByRole("button", {
				name: /withdraw profits/i,
			});
			fireEvent.click(withdrawButton);

			expect(
				screen.getByRole("heading", { name: /Withdraw Profits/i }),
			).toBeInTheDocument();
		});

		test("shows all-set onboarding banner when configured", () => {
			renderDashboard();

			expect(screen.getByText(/todo listo para operar/i)).toBeInTheDocument();
		});
	});

	describe("loading state", () => {
		beforeEach(() => {
			mockUseDashboard.mockReturnValue({
				data: null,
				loading: true,
				error: null,
				errors: [],
				refetch: mockRefetch,
			});
			mockUseAuth.mockReturnValue({
				state: { user: null, session: null, loading: false },
				logout: jest.fn(),
				onboarding: { has2FA: false, hasApiKeys: false, loading: true },
			});
		});

		test("shows loading skeleton when loading and no data", () => {
			renderDashboard();

			// The skeleton renders 5 pulsing placeholder divs
			const skeletonItems = document.querySelectorAll(".animate-pulse");
			expect(skeletonItems.length).toBeGreaterThanOrEqual(5);
		});
	});

	describe("error state", () => {
		beforeEach(() => {
			mockUseDashboard.mockReturnValue({
				data: null,
				loading: false,
				error: "Authentication expired. Please log in again.",
				errors: [],
				refetch: mockRefetch,
			});
		});

		test("shows fatal error alert", () => {
			renderDashboard();

			expect(screen.getByText(/Authentication expired/i)).toBeInTheDocument();
		});

		test("shows retry button in fatal error", () => {
			renderDashboard();

			const retryBtn = screen.getByText(/Retry/i);
			expect(retryBtn).toBeInTheDocument();

			fireEvent.click(retryBtn);
			expect(mockRefetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("partial errors", () => {
		beforeEach(() => {
			mockUseDashboard.mockReturnValue({
				data: {
					...defaultDashboardData,
					trades: null,
				},
				loading: false,
				error: null,
				errors: [{ source: "trades", message: "Failed to fetch trades" }],
				refetch: mockRefetch,
			});
		});

		test("shows partial error alert when errors array is non-empty", () => {
			renderDashboard();

			expect(screen.getByText(/Failed to fetch trades/i)).toBeInTheDocument();
		});

		test("still renders available data when partial errors exist", () => {
			renderDashboard();

			// KPIs should still render
			expect(screen.getByText(/Total Deposited/i)).toBeInTheDocument();
			// Bot status should still render
			expect(screen.getByText(/Bot Status/i)).toBeInTheDocument();
		});
	});

	describe("onboarding banner", () => {
		test("shows onboarding banner when missing 2FA", () => {
			mockUseAuth.mockReturnValue({
				state: { user: null, session: null, loading: false },
				logout: jest.fn(),
				onboarding: { has2FA: false, hasApiKeys: true, loading: false },
			});

			renderDashboard();

			expect(screen.getByText(/configurar 2fa/i)).toBeInTheDocument();
		});

		test("shows onboarding banner when missing API keys", () => {
			mockUseAuth.mockReturnValue({
				state: { user: null, session: null, loading: false },
				logout: jest.fn(),
				onboarding: { has2FA: true, hasApiKeys: false, loading: false },
			});

			renderDashboard();

			expect(screen.getByText(/conectar api/i)).toBeInTheDocument();
		});
	});
});

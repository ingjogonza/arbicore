// ============================================
// USE DASHBOARD HOOK TESTS
// ============================================

import { renderHook, waitFor, act } from "@testing-library/react";
import { useDashboard } from "../useDashboard";

// Mock AuthContext
jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

// Mock env
jest.mock("../../lib/env", () => ({
	env: { VITE_API_BASE_URL: "http://localhost:3000" },
}));

import { useAuth } from "../../contexts/AuthContext";

const mockUseAuth = useAuth as jest.Mock;

const mockDashboardData = {
	balances: [
		{ asset: "BTC", free: "0.50000000", locked: "0.00000000" },
		{ asset: "FDUSD", free: "25000.00", locked: "0.00" },
	],
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
	],
	equityHistory: [
		{ date: "May 1", value: 24000 },
		{ date: "May 15", value: 25000 },
	],
	botStatus: {
		active: true,
		runningSince: "2024-05-01T00:00:00.000Z",
		strategy: "Conservative Spot Trading",
	},
	cumulativeDeposits: { FDUSD: 1000 },
	totalDepositedFDUSD: 1000,
};

beforeEach(() => {
	jest.clearAllMocks();
	mockUseAuth.mockReturnValue({
		state: {
			user: { id: "u1", email: "a@b.com" },
			session: { access_token: "tok1" },
			loading: false,
		},
	});
});

describe("useDashboard", () => {
	describe("loading state", () => {
		test("sets loading=true and data=null while fetch is in flight", async () => {
			// Keep fetch unresolved
			global.fetch = jest.fn(() => new Promise(() => {})) as any;

			const { result } = renderHook(() => useDashboard());

			expect(result.current.loading).toBe(true);
			expect(result.current.data).toBeNull();
			expect(result.current.error).toBeNull();
			expect(result.current.errors).toEqual([]);
		});
	});

	describe("success state", () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockDashboardData,
					}),
			}) as any;
		});

		test("fetches data on mount and populates data", async () => {
			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.data).toEqual(mockDashboardData);
			expect(result.current.error).toBeNull();
			expect(result.current.errors).toEqual([]);
		});

		test("sends auth token in Authorization header", async () => {
			const mockFetch = global.fetch as jest.Mock;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:3000/api/dashboard/summary",
				expect.objectContaining({
					headers: { Authorization: "Bearer tok1" },
				}),
			);
		});

		test("stores partial errors when API returns errors array", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { ...mockDashboardData, trades: null },
						errors: [{ source: "trades", message: "Failed to fetch trades" }],
					}),
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.errors).toHaveLength(1);
			expect(result.current.errors[0].source).toBe("trades");
			expect(result.current.data?.trades).toBeNull();
		});
	});

	describe("error state", () => {
		test("sets error on network failure", async () => {
			global.fetch = jest
				.fn()
				.mockRejectedValue(new Error("Network error")) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe("Network error");
			expect(result.current.data).toBeNull();
		});

		test("sets error on HTTP 401 (auth expired)", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 401,
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe(
				"Authentication expired. Please log in again.",
			);
			expect(result.current.data).toBeNull();
		});

		test("sets error on HTTP 500", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 500,
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe("Server error: 500");
			expect(result.current.data).toBeNull();
		});

		test("sets error when success=false in response", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: false,
						errors: [{ source: "balances", message: "No API keys" }],
					}),
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.error).toBe("No API keys");
			expect(result.current.data).toBeNull();
		});
	});

	describe("no session", () => {
		test("does not fetch when there is no session", () => {
			mockUseAuth.mockReturnValue({
				state: {
					user: null,
					session: null,
					loading: false,
				},
			});

			global.fetch = jest.fn();

			const { result } = renderHook(() => useDashboard());

			expect(global.fetch).not.toHaveBeenCalled();
			expect(result.current.loading).toBe(false);
			expect(result.current.data).toBeNull();
		});
	});

	describe("refetch", () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockDashboardData,
					}),
			}) as any;
		});

		test("calls fetch again when refetch is invoked", async () => {
			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			const callCount = (global.fetch as jest.Mock).mock.calls.length;

			await act(async () => {
				result.current.refetch();
			});

			await waitFor(() => {
				expect((global.fetch as jest.Mock).mock.calls.length).toBe(
					callCount + 1,
				);
			});
		});
	});

	// ---------------------------------------------------------------
	// Cumulative deposits propagation (spec: Hook Integration)
	// ---------------------------------------------------------------

	describe("cumulativeDeposits propagation", () => {
		test("exposes cumulativeDeposits and totalDepositedFDUSD when API returns them", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: mockDashboardData,
					}),
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.data?.cumulativeDeposits).toEqual({ FDUSD: 1000 });
			expect(result.current.data?.totalDepositedFDUSD).toBe(1000);
		});

		test("propagates a map with multiple coins", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: {
							...mockDashboardData,
							cumulativeDeposits: { FDUSD: 1000, BTC: 0.5, USDT: 250 },
							totalDepositedFDUSD: 1000,
						},
					}),
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.data?.cumulativeDeposits).toEqual({
				FDUSD: 1000,
				BTC: 0.5,
				USDT: 250,
			});
		});

		test("propagates an empty cumulativeDeposits map", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: {
							...mockDashboardData,
							cumulativeDeposits: {},
							totalDepositedFDUSD: 25000,
						},
					}),
			}) as any;

			const { result } = renderHook(() => useDashboard());

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.data?.cumulativeDeposits).toEqual({});
			expect(result.current.data?.totalDepositedFDUSD).toBe(25000);
		});
	});
});

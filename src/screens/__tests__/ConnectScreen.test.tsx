// ============================================
// CONNECT SCREEN TESTS
// ============================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ConnectScreen } from "../ConnectScreen";

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

jest.mock("../../hooks/useTrading", () => ({
	useTrading: jest.fn(),
}));

// Mock env module to avoid import.meta.env parsing in Jest
jest.mock("../../lib/env", () => ({
	env: {
		VITE_SUPABASE_URL: "https://test.supabase.co",
		VITE_SUPABASE_ANON_KEY: "test-anon-key",
		VITE_API_BASE_URL: "http://localhost:3000",
	},
}));

import { useAuth } from "../../contexts/AuthContext";
import { useTrading } from "../../hooks/useTrading";

const mockConnectApi = jest.fn();
const mockDisconnectApi = jest.fn();
const mockNavigate = jest.fn();

// Mock react-router-dom useNavigate
jest.mock("react-router-dom", () => {
	const actual = jest.requireActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const defaultTradingState = {
	account: {
		initialBalance: 12500,
		currentBalance: 14832.5,
		apiConnected: false,
		apiKey: "",
		botStatus: "inactive" as const,
	},
	connectApi: mockConnectApi,
	disconnectApi: mockDisconnectApi,
};

const defaultAuthState = {
	state: {
		user: { id: "user-1", email: "alex@example.com" },
		session: { access_token: "test-token" },
		loading: false,
		error: null,
	},
};

describe("ConnectScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue(defaultAuthState);
		(useTrading as jest.Mock).mockReturnValue(defaultTradingState);
	});

	// ── Disconnected state ──────────────────────────────────

	test("renders connection form in disconnected state", () => {
		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		expect(
			screen.getByRole("heading", { name: /connect your binance account/i }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(/enter your binance api key/i),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(/enter your binance secret key/i),
		).toBeInTheDocument();
		expect(
			screen.getByText((content) =>
				content.includes("I confirm my API keys do"),
			),
		).toBeInTheDocument();
		expect(screen.getByText(/Security Note/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /verify & connect/i }),
		).toBeInTheDocument();
	});

	test("button is disabled when fields are empty", () => {
		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByRole("button", { name: /verify & connect/i }),
		).toBeDisabled();
	});

	test("button is disabled until checkbox is checked", () => {
		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "my-api-key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "my-secret-key" } },
		);

		// Button should still be disabled without checkbox
		expect(
			screen.getByRole("button", { name: /verify & connect/i }),
		).toBeDisabled();

		// Check the checkbox
		fireEvent.click(screen.getByRole("checkbox"));

		expect(
			screen.getByRole("button", { name: /verify & connect/i }),
		).toBeEnabled();
	});

	// ── No session error ────────────────────────────────────

	test("shows error when user has no session", async () => {
		(useAuth as jest.Mock).mockReturnValue({
			state: {
				user: null,
				session: null,
				loading: false,
				error: null,
			},
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "my-api-key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "my-secret-key" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() =>
			expect(
				screen.getByText(/debes iniciar sesión para conectar/i),
			).toBeInTheDocument(),
		);
	});

	// ── API error ───────────────────────────────────────────

	test("shows error on API failure", async () => {
		(globalThis as any).fetch = jest.fn().mockResolvedValue({
			ok: false,
			json: () =>
				Promise.resolve({
					error: { message: "Invalid API key format" },
				}),
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "bad-key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "bad-secret" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() =>
			expect(screen.getByText("Invalid API key format")).toBeInTheDocument(),
		);
		expect(mockConnectApi).not.toHaveBeenCalled();
	});

	test("shows generic error when API response has no message", async () => {
		(globalThis as any).fetch = jest.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({}),
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "secret" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() =>
			expect(
				screen.getByText(/error al guardar las claves api/i),
			).toBeInTheDocument(),
		);
	});

	test("shows error when fetch throws", async () => {
		(globalThis as any).fetch = jest
			.fn()
			.mockRejectedValue(new Error("Network error"));

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "secret" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() =>
			expect(screen.getByText("Network error")).toBeInTheDocument(),
		);
	});

	// ── Loading state ───────────────────────────────────────

	test("shows loading state while connecting", async () => {
		// A promise that doesn't resolve immediately
		let resolveFetch!: (value: unknown) => void;
		(globalThis as any).fetch = jest.fn().mockReturnValue(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		);

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "secret" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		expect(screen.getByText(/guardando/i)).toBeInTheDocument();

		// Resolve the fetch so the test doesn't hang
		resolveFetch({
			ok: true,
			json: () => Promise.resolve({}),
		});
	});

	// ── Successful connection ────────────────────────────────

	test("calls POST /api/keys with correct data on connect", async () => {
		const mockFetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});
		(globalThis as any).fetch = mockFetch;

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "my-api-key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "my-secret-key" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"http://localhost:3000/api/keys",
				expect.objectContaining({
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer test-token",
					},
					body: JSON.stringify({
						apiKey: "my-api-key",
						secretKey: "my-secret-key",
						label: "Binance",
					}),
				}),
			);
		});
	});

	test("calls connectApi on successful connection", async () => {
		(globalThis as any).fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "my-api-key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "my-secret-key" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() =>
			expect(mockConnectApi).toHaveBeenCalledWith(
				"my-api-key",
				"my-secret-key",
			),
		);
	});

	test("shows Connected! text on successful connection", async () => {
		(globalThis as any).fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "secret" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		await waitFor(() =>
			expect(screen.getByText("Connected!")).toBeInTheDocument(),
		);
	});

	test("navigates to /dashboard after successful connection", async () => {
		jest.useFakeTimers();
		(globalThis as any).fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance api key/i),
			{
				target: { value: "key" },
			},
		);
		fireEvent.change(
			screen.getByPlaceholderText(/enter your binance secret key/i),
			{ target: { value: "secret" } },
		);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: /verify & connect/i }));

		// Wait for the fetch to resolve and connectApi to be called
		await waitFor(() => expect(mockConnectApi).toHaveBeenCalled());

		// Advance past the 1500ms timeout
		jest.advanceTimersByTime(1500);

		expect(mockNavigate).toHaveBeenCalledWith("/dashboard");

		jest.useRealTimers();
	});

	// ── Connected state ─────────────────────────────────────

	test("renders connected UI when apiConnected is true", () => {
		(useTrading as jest.Mock).mockReturnValue({
			...defaultTradingState,
			account: {
				...defaultTradingState.account,
				apiConnected: true,
				apiKey: "••••••••••••••••",
			},
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		expect(screen.getByText(/api connected successfully/i)).toBeInTheDocument();
		expect(screen.getByText("••••••••••••••••")).toBeInTheDocument();
		expect(screen.getByText("Connected")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /go to dashboard/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /disconnect/i }),
		).toBeInTheDocument();
	});

	test("calls disconnectApi when disconnect button is clicked", () => {
		(useTrading as jest.Mock).mockReturnValue({
			...defaultTradingState,
			account: {
				...defaultTradingState.account,
				apiConnected: true,
				apiKey: "••••••••••••••••",
			},
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
		expect(mockDisconnectApi).toHaveBeenCalledTimes(1);
	});

	test("navigates to dashboard when Go to Dashboard is clicked", () => {
		(useTrading as jest.Mock).mockReturnValue({
			...defaultTradingState,
			account: {
				...defaultTradingState.account,
				apiConnected: true,
				apiKey: "••••••••••••••••",
			},
		});

		render(
			<BrowserRouter>
				<ConnectScreen />
			</BrowserRouter>,
		);

		fireEvent.click(screen.getByRole("button", { name: /go to dashboard/i }));
		expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
	});
});

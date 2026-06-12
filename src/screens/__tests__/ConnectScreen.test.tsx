// ============================================
// CONNECT SCREEN TESTS
// ============================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ConnectScreen } from "../ConnectScreen";

const mockNavigate = jest.fn();
const mockFetchOnboardingStatus = jest.fn();

jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

jest.mock("../../lib/env", () => ({
	env: { VITE_API_BASE_URL: "http://localhost:3000" },
}));

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	// Default: logged in, no keys
	mockUseAuth.mockReturnValue({
		state: {
			user: { id: "u1", email: "a@b.com" },
			session: { access_token: "tok1" },
			loading: false,
		},
		onboarding: { has2FA: false, hasApiKeys: false, loading: false },
		fetchOnboardingStatus: mockFetchOnboardingStatus,
	});
});

describe("ConnectScreen", () => {
	describe("loading state", () => {
		test("shows spinner while checking key status", () => {
			// Keep fetch unresolved so loading persists
			global.fetch = jest.fn(() => new Promise(() => {})) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			expect(document.querySelector(".animate-spin")).toBeInTheDocument();
		});

		test("shows form immediately when no session", () => {
			mockUseAuth.mockReturnValue({
				state: { user: null, session: null, loading: false },
				onboarding: { has2FA: false, hasApiKeys: false, loading: false },
				fetchOnboardingStatus: mockFetchOnboardingStatus,
			});

			// fetch never resolves — but the component should skip it
			global.fetch = jest.fn(() => new Promise(() => {})) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			expect(
				screen.getByPlaceholderText(/ingres.*api key/i),
			).toBeInTheDocument();
		});
	});

	describe("not connected — registration form", () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockResolvedValue({
				json: () =>
					Promise.resolve({ success: true, data: { hasKeys: false } }),
			}) as any;
		});

		test("renders form when no keys exist", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});
			expect(
				screen.getByPlaceholderText(/ingres.*secret key/i),
			).toBeInTheDocument();
			expect(screen.getByText(/verificar y conectar/i)).toBeInTheDocument();
		});

		test("shows onboarding info alert", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/todav.*no configuraste/i)).toBeInTheDocument();
			});
		});

		test("button is disabled when fields are empty", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				const btn = screen.getByRole("button", {
					name: /verificar y conectar/i,
				});
				expect(btn).toBeDisabled();
			});
		});

		test("button is disabled until checkbox is checked", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				const apiInput = screen.getByPlaceholderText(/ingres.*api key/i);
				const secretInput = screen.getByPlaceholderText(/ingres.*secret key/i);
				fireEvent.change(apiInput, { target: { value: "my-key" } });
				fireEvent.change(secretInput, { target: { value: "my-secret" } });
				const btn = screen.getByRole("button", {
					name: /verificar y conectar/i,
				});
				// checkbox not checked → disabled
				expect(btn).toBeDisabled();

				const checkbox = screen.getByRole("checkbox");
				fireEvent.click(checkbox);
				expect(btn).toBeEnabled();
			});
		});

		test("calls POST /api/keys with correct data on connect", async () => {
			const mockFetch = jest
				.fn()
				.mockResolvedValueOnce({
					json: () =>
						Promise.resolve({ success: true, data: { hasKeys: false } }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ success: true, data: { id: "abc" } }),
				});
			global.fetch = mockFetch;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});

			fireEvent.change(screen.getByPlaceholderText(/ingres.*api key/i), {
				target: { value: "my-api-key" },
			});
			fireEvent.change(screen.getByPlaceholderText(/ingres.*secret key/i), {
				target: { value: "my-secret" },
			});
			fireEvent.click(screen.getByRole("checkbox"));
			fireEvent.click(
				screen.getByRole("button", { name: /verificar y conectar/i }),
			);

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining("/api/keys"),
					expect.objectContaining({
						method: "POST",
						body: expect.stringContaining("my-api-key"),
					}),
				);
			});
		});

		test("shows connected state after successful connection", async () => {
			let fetchCalls = 0;
			global.fetch = jest.fn().mockImplementation(() => {
				fetchCalls++;
				if (fetchCalls === 1) {
					// First call: status check
					return Promise.resolve({
						json: () =>
							Promise.resolve({ success: true, data: { hasKeys: false } }),
					});
				}
				// Second call: POST
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true, data: { id: "abc" } }),
				});
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});

			fireEvent.change(screen.getByPlaceholderText(/ingres.*api key/i), {
				target: { value: "key" },
			});
			fireEvent.change(screen.getByPlaceholderText(/ingres.*secret key/i), {
				target: { value: "secret" },
			});
			fireEvent.click(screen.getByRole("checkbox"));
			fireEvent.click(
				screen.getByRole("button", { name: /verificar y conectar/i }),
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});
		});

		test("shows error on API failure", async () => {
			let fetchCalls = 0;
			global.fetch = jest.fn().mockImplementation(() => {
				fetchCalls++;
				if (fetchCalls === 1) {
					return Promise.resolve({
						json: () =>
							Promise.resolve({ success: true, data: { hasKeys: false } }),
					});
				}
				return Promise.resolve({
					ok: false,
					json: () =>
						Promise.resolve({
							error: { message: "API keys already stored" },
						}),
				});
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});

			fireEvent.change(screen.getByPlaceholderText(/ingres.*api key/i), {
				target: { value: "bad-key" },
			});
			fireEvent.change(screen.getByPlaceholderText(/ingres.*secret key/i), {
				target: { value: "bad-secret" },
			});
			fireEvent.click(screen.getByRole("checkbox"));
			fireEvent.click(
				screen.getByRole("button", { name: /verificar y conectar/i }),
			);

			await waitFor(() => {
				expect(
					screen.getByText(/api keys already stored/i),
				).toBeInTheDocument();
			});
		});

		test("shows generic error when API response has no message", async () => {
			let fetchCalls = 0;
			global.fetch = jest.fn().mockImplementation(() => {
				fetchCalls++;
				if (fetchCalls === 1) {
					return Promise.resolve({
						json: () =>
							Promise.resolve({ success: true, data: { hasKeys: false } }),
					});
				}
				return Promise.resolve({
					ok: false,
					json: () => Promise.resolve({}),
				});
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});

			fireEvent.change(screen.getByPlaceholderText(/ingres.*api key/i), {
				target: { value: "key" },
			});
			fireEvent.change(screen.getByPlaceholderText(/ingres.*secret key/i), {
				target: { value: "secret" },
			});
			fireEvent.click(screen.getByRole("checkbox"));
			fireEvent.click(
				screen.getByRole("button", { name: /verificar y conectar/i }),
			);

			await waitFor(() => {
				expect(
					screen.getByText(/error al guardar las claves api/i),
				).toBeInTheDocument();
			});
		});

		test("renders WhatsApp support link in form", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				json: () =>
					Promise.resolve({ success: true, data: { hasKeys: false } }),
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				const link = screen.getByText(/ped.*ayuda por whatsapp/i);
				expect(link).toBeInTheDocument();
				expect(link.closest("a")).toHaveAttribute(
					"href",
					"https://wa.me/56968546598",
				);
			});
		});

		test("calls fetchOnboardingStatus after successful connect", async () => {
			let fetchCalls = 0;
			global.fetch = jest.fn().mockImplementation(() => {
				fetchCalls++;
				if (fetchCalls === 1) {
					return Promise.resolve({
						json: () =>
							Promise.resolve({ success: true, data: { hasKeys: false } }),
					});
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true, data: { id: "abc" } }),
				});
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});

			fireEvent.change(screen.getByPlaceholderText(/ingres.*api key/i), {
				target: { value: "k" },
			});
			fireEvent.change(screen.getByPlaceholderText(/ingres.*secret key/i), {
				target: { value: "s" },
			});
			fireEvent.click(screen.getByRole("checkbox"));
			fireEvent.click(
				screen.getByRole("button", { name: /verificar y conectar/i }),
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			expect(mockFetchOnboardingStatus).toHaveBeenCalled();
		});

		test("navigates to dashboard after 1.5s timeout on successful connect", async () => {
			jest.useFakeTimers();

			let fetchCalls = 0;
			global.fetch = jest.fn().mockImplementation(() => {
				fetchCalls++;
				if (fetchCalls === 1) {
					return Promise.resolve({
						json: () =>
							Promise.resolve({ success: true, data: { hasKeys: false } }),
					});
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true, data: { id: "abc" } }),
				});
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/ingres.*api key/i),
				).toBeInTheDocument();
			});

			fireEvent.change(screen.getByPlaceholderText(/ingres.*api key/i), {
				target: { value: "k" },
			});
			fireEvent.change(screen.getByPlaceholderText(/ingres.*secret key/i), {
				target: { value: "s" },
			});
			fireEvent.click(screen.getByRole("checkbox"));
			fireEvent.click(
				screen.getByRole("button", { name: /verificar y conectar/i }),
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			// Navigate should not have been called yet
			expect(mockNavigate).not.toHaveBeenCalled();

			// Advance past the 1.5s timeout
			jest.advanceTimersByTime(1500);

			expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
				replace: true,
			});

			jest.useRealTimers();
		});
	});

	describe("connected state", () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockResolvedValue({
				json: () => Promise.resolve({ success: true, data: { hasKeys: true } }),
			}) as any;
		});

		test("shows connected UI when keys exist", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});
			expect(screen.getByText(/conectado/i)).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /desconectar/i }),
			).toBeInTheDocument();
		});

		test("shows disconnect modal with warnings", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole("button", { name: /desconectar/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/el robot se detendr.*inmediatamente/i),
				).toBeInTheDocument();
			});
			expect(
				screen.getByText(/deb.*s crear claves nuevas/i),
			).toBeInTheDocument();
			expect(screen.getByText(/contactanos por whatsapp/i)).toBeInTheDocument();
		});

		test("calls DELETE /api/keys when confirming disconnect", async () => {
			const mockFetch = jest
				.fn()
				// First: status check
				.mockResolvedValueOnce({
					json: () =>
						Promise.resolve({ success: true, data: { hasKeys: true } }),
				})
				// Second: DELETE call
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({ success: true, data: { deleted: true } }),
				});
			global.fetch = mockFetch;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			// Click disconnect → opens modal, then click confirm
			fireEvent.click(screen.getByRole("button", { name: /desconectar/i }));

			await waitFor(() => {
				const confirmBtns = screen.getAllByText("Desconectar");
				// The last "Desconectar" text in the modal
				const modalBtn = confirmBtns[confirmBtns.length - 1].closest("button");
				if (modalBtn) fireEvent.click(modalBtn);
			});

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining("/api/keys"),
					expect.objectContaining({ method: "DELETE" }),
				);
			});
		});

		test("shows error when disconnect API fails", async () => {
			const mockFetch = jest
				.fn()
				// First: status check
				.mockResolvedValueOnce({
					json: () =>
						Promise.resolve({ success: true, data: { hasKeys: true } }),
				})
				// Second: DELETE call fails
				.mockResolvedValueOnce({
					ok: false,
					json: () =>
						Promise.resolve({
							error: { message: "Cannot delete active keys" },
						}),
				});
			global.fetch = mockFetch;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			// Open modal and confirm disconnect
			fireEvent.click(screen.getByRole("button", { name: /desconectar/i }));

			await waitFor(() => {
				const confirmBtns = screen.getAllByText("Desconectar");
				const modalBtn = confirmBtns[confirmBtns.length - 1].closest("button");
				if (modalBtn) fireEvent.click(modalBtn);
			});

			await waitFor(() => {
				expect(
					screen.getByText(/cannot delete active keys/i),
				).toBeInTheDocument();
			});
		});

		test("closes disconnect modal when Cancel is clicked", async () => {
			global.fetch = jest.fn().mockResolvedValue({
				json: () => Promise.resolve({ success: true, data: { hasKeys: true } }),
			}) as any;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			// Open modal
			fireEvent.click(screen.getByRole("button", { name: /desconectar/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/el robot se detendr.*inmediatamente/i),
				).toBeInTheDocument();
			});

			// Cancel
			fireEvent.click(screen.getAllByRole("button", { name: /cancelar/i })[0]);

			await waitFor(() => {
				expect(
					screen.queryByText(/el robot se detendr.*inmediatamente/i),
				).not.toBeInTheDocument();
			});
		});

		test("calls fetchOnboardingStatus after successful disconnect", async () => {
			const mockFetch = jest
				.fn()
				// First: status check
				.mockResolvedValueOnce({
					json: () =>
						Promise.resolve({ success: true, data: { hasKeys: true } }),
				})
				// Second: DELETE call
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({ success: true, data: { deleted: true } }),
				});
			global.fetch = mockFetch;
			mockFetchOnboardingStatus.mockClear();

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			// Open modal and confirm
			fireEvent.click(screen.getByRole("button", { name: /desconectar/i }));

			await waitFor(() => {
				const confirmBtns = screen.getAllByText("Desconectar");
				const modalBtn = confirmBtns[confirmBtns.length - 1].closest("button");
				if (modalBtn) fireEvent.click(modalBtn);
			});

			await waitFor(() => {
				expect(
					screen.getByText(/claves eliminadas correctamente/i),
				).toBeInTheDocument();
			});

			expect(mockFetchOnboardingStatus).toHaveBeenCalled();
		});

		test("navigates to dashboard when Go to Dashboard is clicked", async () => {
			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole("button", { name: /ir al dashboard/i }));
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
				replace: true,
			});
		});
	});

	describe("was disconnected state", () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockResolvedValue({
				json: () => Promise.resolve({ success: true, data: { hasKeys: true } }),
			}) as any;
		});

		test("shows disconnect success message after deleting keys", async () => {
			const mockFetch = jest
				.fn()
				// First: status check
				.mockResolvedValueOnce({
					json: () =>
						Promise.resolve({ success: true, data: { hasKeys: true } }),
				})
				// Second: DELETE call
				.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({ success: true, data: { deleted: true } }),
				});
			global.fetch = mockFetch;

			render(
				<BrowserRouter>
					<ConnectScreen />
				</BrowserRouter>,
			);

			await waitFor(() => {
				expect(screen.getByText(/claves api conectadas/i)).toBeInTheDocument();
			});

			// Open modal and confirm disconnect
			fireEvent.click(screen.getByRole("button", { name: /desconectar/i }));

			await waitFor(() => {
				const confirmBtns = screen.getAllByText("Desconectar");
				const modalBtn = confirmBtns[confirmBtns.length - 1].closest("button");
				if (modalBtn) fireEvent.click(modalBtn);
			});

			await waitFor(() => {
				expect(
					screen.getByText(/claves eliminadas correctamente/i),
				).toBeInTheDocument();
			});
			expect(
				screen.getByText(/deb.*s crear claves nuevas/i),
			).toBeInTheDocument();
		});
	});
});

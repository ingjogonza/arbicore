// ============================================
// AUTH CONTEXT TESTS
// ============================================

import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth, AuthProvider } from "../AuthContext";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockResend = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock("../../lib/env", () => ({
	env: {
		VITE_API_BASE_URL: "http://localhost:3000",
	},
}));

jest.mock("../../lib/supabase", () => ({
	supabase: {
		auth: {
			getSession: (...args: any[]) => mockGetSession(...args),
			onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
			signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
			signUp: (...args: any[]) => mockSignUp(...args),
			signOut: (...args: any[]) => mockSignOut(...args),
			resend: (...args: any[]) => mockResend(...args),
			resetPasswordForEmail: (...args: any[]) =>
				mockResetPasswordForEmail(...args),
		},
	},
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("AuthContext", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetSession.mockResolvedValue({ data: { session: null } });
		mockOnAuthStateChange.mockReturnValue({
			data: { subscription: { unsubscribe: jest.fn() } },
		});
	});

	test("starts in loading state", () => {
		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		expect(result.current.state.loading).toBe(true);
	});

	test("recovers session on mount", async () => {
		mockGetSession.mockResolvedValue({
			data: {
				session: {
					user: {
						id: "u1",
						email: "user@test.com",
						user_metadata: { first_name: "John", last_name: "Doe" },
					},
					access_token: "tok1",
				},
			},
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

		await waitFor(() => expect(result.current.state.loading).toBe(false));
		await waitFor(() =>
			expect(result.current.state.user?.email).toBe("user@test.com"),
		);
	});

	test("login succeeds without 2FA", async () => {
		mockSignInWithPassword.mockResolvedValue({
			data: {
				user: {
					id: "u1",
					email: "a@b.com",
					email_confirmed_at: "2024-01-01",
					user_metadata: {},
				},
				session: { access_token: "tok1" },
			},
			error: null,
		});
		mockFetch.mockResolvedValue({ json: async () => ({ success: false }) });

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		await waitFor(() => expect(result.current.state.loading).toBe(false));

		await result.current.login("a@b.com", "pw");

		await waitFor(() =>
			expect(result.current.state.user?.email).toBe("a@b.com"),
		);
		expect(result.current.twoFactor.requires2FA).toBe(false);
	});

	test("login requires 2FA when enabled", async () => {
		mockSignInWithPassword.mockResolvedValue({
			data: {
				user: {
					id: "u1",
					email: "a@b.com",
					email_confirmed_at: "2024-01-01",
					user_metadata: {},
				},
				session: { access_token: "tok1" },
			},
			error: null,
		});
		mockFetch.mockResolvedValue({
			json: async () => ({ success: true, data: { enabled: true } }),
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		await waitFor(() => expect(result.current.state.loading).toBe(false));

		await result.current.login("a@b.com", "pw");

		await waitFor(() =>
			expect(result.current.twoFactor.requires2FA).toBe(true),
		);
	});

	test("login shows error on failure", async () => {
		mockSignInWithPassword.mockResolvedValue({
			data: { user: null, session: null },
			error: { message: "Invalid credentials" },
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		await waitFor(() => expect(result.current.state.loading).toBe(false));

		await expect(result.current.login("a@b.com", "pw")).rejects.toEqual(
			expect.objectContaining({ message: "Invalid credentials" }),
		);
		await waitFor(() =>
			expect(result.current.state.error).toBe("Invalid credentials"),
		);
	});

	test("register succeeds", async () => {
		mockSignUp.mockResolvedValue({
			data: { user: { id: "u2" } },
			error: null,
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		await waitFor(() => expect(result.current.state.loading).toBe(false));

		await result.current.register({
			email: "a@b.com",
			password: "pw",
			firstName: "A",
			lastName: "B",
			phone: "+123456789",
			legalDocsAccepted: true,
		});

		expect(mockSignUp).toHaveBeenCalled();
		expect(result.current.state.loading).toBe(false);
	});

	test("logout clears state", async () => {
		mockGetSession.mockResolvedValue({
			data: {
				session: {
					user: { id: "u1", email: "user@test.com", user_metadata: {} },
					access_token: "tok1",
				},
			},
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		await waitFor(() =>
			expect(result.current.state.user?.email).toBe("user@test.com"),
		);

		await result.current.logout();

		await waitFor(() => expect(result.current.state.user).toBeNull());
	});

	test("clearError removes error", async () => {
		mockSignInWithPassword.mockResolvedValue({
			data: { user: null, session: null },
			error: { message: "Bad" },
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
		await waitFor(() => expect(result.current.state.loading).toBe(false));

		await expect(result.current.login("a@b.com", "pw")).rejects.toEqual(
			expect.objectContaining({ message: "Bad" }),
		);
		await waitFor(() => expect(result.current.state.error).toBe("Bad"));

		result.current.clearError();
		await waitFor(() => expect(result.current.state.error).toBeNull());
	});

	describe("onAuthStateChange", () => {
		let onAuthCallback: (event: string, session: any) => void;

		beforeEach(() => {
			onAuthCallback = undefined as any;
			mockOnAuthStateChange.mockImplementation((cb: any) => {
				onAuthCallback = cb;
				return {
					data: { subscription: { unsubscribe: jest.fn() } },
				};
			});
		});

		test("SIGNED_IN sets user state", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			act(() => {
				onAuthCallback("SIGNED_IN", {
					user: {
						id: "u1",
						email: "test@test.com",
						user_metadata: {
							first_name: "Jane",
							last_name: "Doe",
						},
					},
					access_token: "tok-on",
				});
			});

			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("test@test.com"),
			);
			expect(result.current.state.user?.firstName).toBe("Jane");
			expect(result.current.state.user?.lastName).toBe("Doe");
			expect(result.current.state.loading).toBe(false);
		});

		test("SIGNED_OUT clears user", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			// First sign in
			act(() => {
				onAuthCallback("SIGNED_IN", {
					user: {
						id: "u1",
						email: "test@test.com",
						user_metadata: {},
					},
					access_token: "tok-on",
				});
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("test@test.com"),
			);

			// Then sign out
			act(() => {
				onAuthCallback("SIGNED_OUT", null);
			});

			await waitFor(() => expect(result.current.state.user).toBeNull());
			expect(result.current.state.session).toBeNull();
			expect(result.current.state.loading).toBe(false);
		});

		test("SIGNED_IN with missing metadata sets empty strings", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			act(() => {
				onAuthCallback("SIGNED_IN", {
					user: {
						id: "u2",
						email: "no-meta@test.com",
						user_metadata: undefined,
					},
					access_token: "tok2",
				});
			});

			await waitFor(() =>
				expect(result.current.state.user?.firstName).toBe(""),
			);
			expect(result.current.state.user?.lastName).toBe("");
		});
	});

	describe("login email verification", () => {
		test("throws when email not confirmed", async () => {
			mockSignInWithPassword.mockResolvedValue({
				data: {
					user: {
						id: "u1",
						email: "unconfirmed@test.com",
						email_confirmed_at: null,
						user_metadata: {},
					},
					session: { access_token: "tok1" },
				},
				error: null,
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(
				result.current.login("unconfirmed@test.com", "pw"),
			).rejects.toThrow("Email not verified");
			await waitFor(() =>
				expect(result.current.state.error).toContain("verificar tu correo"),
			);
			await waitFor(() => expect(result.current.state.loading).toBe(false));
		});

		test("2FA check fetch error does not break login", async () => {
			mockSignInWithPassword.mockResolvedValue({
				data: {
					user: {
						id: "u1",
						email: "a@b.com",
						email_confirmed_at: "2024-01-01",
						user_metadata: {},
					},
					session: { access_token: "tok1" },
				},
				error: null,
			});
			mockFetch.mockRejectedValue(new Error("Network error"));

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			const requires2FA = await result.current.login("a@b.com", "pw");

			expect(requires2FA).toBe(false);
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("a@b.com"),
			);
		});
	});

	describe("register edge cases", () => {
		test("throws on supabase error", async () => {
			mockSignUp.mockResolvedValue({
				data: { user: null },
				error: { message: "Email already registered" },
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(
				result.current.register({
					email: "existing@test.com",
					password: "pw",
					firstName: "A",
					lastName: "B",
					phone: "+123456789",
					legalDocsAccepted: true,
				}),
			).rejects.toEqual(
				expect.objectContaining({ message: "Email already registered" }),
			);
			await waitFor(() =>
				expect(result.current.state.error).toBe("Email already registered"),
			);
		});

		test("throws when no user in response", async () => {
			mockSignUp.mockResolvedValue({
				data: { user: null },
				error: null,
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(
				result.current.register({
					email: "no-user@test.com",
					password: "pw",
					firstName: "A",
					lastName: "B",
					phone: "+123456789",
					legalDocsAccepted: true,
				}),
			).rejects.toThrow("User creation failed");
			await waitFor(() =>
				expect(result.current.state.error).toContain("No se pudo crear"),
			);
		});
	});

	describe("logout edge cases", () => {
		test("handles supabase signOut error gracefully", async () => {
			mockSignOut.mockResolvedValue({
				error: { message: "Network error" },
			});
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});

			const consoleSpy = jest
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			await result.current.logout();

			expect(consoleSpy).toHaveBeenCalledWith(
				"[Auth] Logout error:",
				expect.objectContaining({ message: "Network error" }),
			);
			await waitFor(() => expect(result.current.state.user).toBeNull());
			consoleSpy.mockRestore();
		});
	});

	describe("resendVerification", () => {
		test("returns early when no user email", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await result.current.resendVerification();
			expect(mockResend).not.toHaveBeenCalled();
		});

		test("sets error when resend fails", async () => {
			mockResend.mockResolvedValue({
				error: { message: "Rate limited" },
			});
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			await result.current.resendVerification();
			expect(mockResend).toHaveBeenCalledWith({
				type: "signup",
				email: "user@test.com",
			});
			await waitFor(() =>
				expect(result.current.state.error).toBe("Rate limited"),
			);
		});

		test("succeeds without error", async () => {
			mockResend.mockResolvedValue({ error: null });
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			await result.current.resendVerification();
			expect(mockResend).toHaveBeenCalled();
			await waitFor(() => expect(result.current.state.error).toBeNull());
		});
	});

	describe("resetPassword", () => {
		test("sets error when supabase call fails", async () => {
			mockResetPasswordForEmail.mockRejectedValue(new Error("User not found"));

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(
				result.current.resetPassword("nonexistent@test.com"),
			).rejects.toThrow("User not found");
			await waitFor(() =>
				expect(result.current.state.error).toBe("User not found"),
			);
			await waitFor(() => expect(result.current.state.loading).toBe(false));
		});
	});

	describe("setup2FA", () => {
		test("throws when not authenticated", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(result.current.setup2FA()).rejects.toThrow(
				"Not authenticated",
			);
		});

		test("returns secret and QR code on success", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({
					success: true,
					data: {
						secret: "SECRET123",
						qrCodeUrl: "otpauth://totp/...",
					},
				}),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			const { secret, qrCodeUrl } = await result.current.setup2FA();
			expect(secret).toBe("SECRET123");
			expect(qrCodeUrl).toBe("otpauth://totp/...");
			// QR URL should be stored in twoFactor state
			await waitFor(() =>
				expect(result.current.twoFactor.qrCodeUrl).toBe("otpauth://totp/..."),
			);
		});

		test("throws when API returns error", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({
					success: false,
					error: { message: "2FA already enabled" },
				}),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			await expect(result.current.setup2FA()).rejects.toThrow(
				"2FA already enabled",
			);
		});
	});

	describe("verify2FA", () => {
		test("throws when not authenticated", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(result.current.verify2FA("123456")).rejects.toThrow(
				"Not authenticated",
			);
		});

		test("returns true on successful verification", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({ success: true }),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			const ok = await result.current.verify2FA("123456");
			expect(ok).toBe(true);
			await waitFor(() => {
				expect(result.current.twoFactor.enabled).toBe(true);
				expect(result.current.twoFactor.setupComplete).toBe(true);
				expect(result.current.twoFactor.requires2FA).toBe(false);
			});
		});

		test("returns false on API error", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({ success: false }),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			const ok = await result.current.verify2FA("000000");
			expect(ok).toBe(false);
		});
	});

	describe("disable2FA", () => {
		test("throws when not authenticated", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			await expect(result.current.disable2FA()).rejects.toThrow(
				"Not authenticated",
			);
		});

		test("disables 2FA on success", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({ success: true }),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			await result.current.disable2FA();
			await waitFor(() => {
				expect(result.current.twoFactor.enabled).toBe(false);
				expect(result.current.twoFactor.setupComplete).toBe(false);
			});
		});

		test("throws when API returns error", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({
					success: false,
					error: { message: "2FA not enabled" },
				}),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			await expect(result.current.disable2FA()).rejects.toThrow(
				"2FA not enabled",
			);
		});
	});

	describe("check2FAStatus", () => {
		test("returns false when not authenticated", async () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() => expect(result.current.state.loading).toBe(false));

			const enabled = await result.current.check2FAStatus();
			expect(enabled).toBe(false);
		});

		test("returns true when 2FA is enabled", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({
					success: true,
					data: { enabled: true },
				}),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			const enabled = await result.current.check2FAStatus();
			expect(enabled).toBe(true);
			await waitFor(() => expect(result.current.twoFactor.enabled).toBe(true));
		});

		test("returns false when API fails", async () => {
			mockGetSession.mockResolvedValue({
				data: {
					session: {
						user: {
							id: "u1",
							email: "user@test.com",
							user_metadata: {},
						},
						access_token: "tok1",
					},
				},
			});
			mockFetch.mockResolvedValue({
				json: async () => ({ success: false }),
			});

			const { result } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});
			await waitFor(() =>
				expect(result.current.state.user?.email).toBe("user@test.com"),
			);

			const enabled = await result.current.check2FAStatus();
			expect(enabled).toBe(false);
		});
	});

	describe("useEffect cleanup", () => {
		test("unsubscribe on unmount does not throw", async () => {
			const unsubscribe = jest.fn();
			mockOnAuthStateChange.mockReturnValue({
				data: { subscription: { unsubscribe } },
			});

			const { unmount } = renderHook(() => useAuth(), {
				wrapper: AuthProvider,
			});

			expect(() => unmount()).not.toThrow();
			expect(unsubscribe).toHaveBeenCalled();
		});
	});
});

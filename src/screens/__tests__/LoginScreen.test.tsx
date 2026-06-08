// ============================================
// LOGIN SCREEN TESTS
// ============================================

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { LoginScreen } from "../LoginScreen";

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockLogin = jest.fn();
const mockClearError = jest.fn();
const mockResendVerification = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
	const actual = jest.requireActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const renderLogin = () =>
	render(
		<BrowserRouter>
			<LoginScreen />
		</BrowserRouter>,
	);

describe("LoginScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({
			login: mockLogin,
			resendVerification: mockResendVerification,
			state: { user: null, session: null, loading: false, error: null },
			clearError: mockClearError,
		});
	});

	test("renders login form", () => {
		renderLogin();
		expect(
			screen.getByRole("heading", { name: /iniciar sesión/i }),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/tu@email\.com/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ingresar/i }),
		).toBeInTheDocument();
	});

	test("shows forgot password link", () => {
		renderLogin();
		expect(screen.getByText(/¿olvidaste tu contraseña\?/i)).toBeInTheDocument();
	});

	test("validates empty fields", async () => {
		renderLogin();
		const form = screen
			.getByRole("button", { name: /ingresar/i })
			.closest("form")!;
		fireEvent.submit(form);
		await waitFor(() =>
			expect(
				screen.getByText(/ingresa tu correo y contraseña/i),
			).toBeInTheDocument(),
		);
	});

	test("calls login with credentials", async () => {
		mockLogin.mockResolvedValue(false); // no 2FA required
		renderLogin();

		await userEvent.type(
			screen.getByPlaceholderText(/tu@email\.com/i),
			"user@test.com",
		);
		await userEvent.type(
			screen.getByPlaceholderText(/••••••••/i),
			"password123",
		);
		await userEvent.click(screen.getByRole("button", { name: /ingresar/i }));

		await waitFor(() =>
			expect(mockLogin).toHaveBeenCalledWith("user@test.com", "password123"),
		);
	});

	test("shows error from auth context", () => {
		(useAuth as jest.Mock).mockReturnValue({
			login: mockLogin,
			state: {
				user: null,
				session: null,
				loading: false,
				error: "Credenciales inválidas",
			},
			clearError: mockClearError,
		});

		renderLogin();
		expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument();
	});

	test("shows loading state", () => {
		(useAuth as jest.Mock).mockReturnValue({
			login: mockLogin,
			state: { user: null, session: null, loading: true, error: null },
			clearError: mockClearError,
		});

		renderLogin();
		expect(screen.getByRole("button", { name: /ingresando/i })).toBeDisabled();
	});

	test("redirects to dashboard when already logged in", async () => {
		(useAuth as jest.Mock).mockReturnValue({
			login: mockLogin,
			state: {
				user: { id: "u1", email: "user@test.com" },
				session: { access_token: "tok1" },
				loading: false,
				error: null,
			},
			clearError: mockClearError,
		});

		renderLogin();

		await waitFor(() =>
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true }),
		);
	});

	test("redirects to 2FA verify when login requires 2FA", async () => {
		mockLogin.mockResolvedValue(true);

		renderLogin();

		await userEvent.type(
			screen.getByPlaceholderText(/tu@email\.com/i),
			"user@test.com",
		);
		await userEvent.type(
			screen.getByPlaceholderText(/••••••••/i),
			"password123",
		);
		await userEvent.click(screen.getByRole("button", { name: /ingresar/i }));

		await waitFor(() =>
			expect(mockNavigate).toHaveBeenCalledWith("/2fa-verify", { replace: true }),
		);
	});

	test("shows resend verification button when email not verified", async () => {
		mockResendVerification.mockResolvedValue(undefined);
		(useAuth as jest.Mock).mockReturnValue({
			login: mockLogin,
			resendVerification: mockResendVerification,
			state: {
				user: null,
				session: null,
				loading: false,
				error: "Debes verificar tu correo electrónico antes de iniciar sesión.",
			},
			clearError: mockClearError,
		});

		renderLogin();

		const resendBtn = screen.getByRole("button", {
			name: /reenviar email de verificación/i,
		});
		expect(resendBtn).toBeInTheDocument();

		await userEvent.click(resendBtn);

		expect(mockResendVerification).toHaveBeenCalled();
	});

	test("resend verification catches error silently", async () => {
		mockResendVerification.mockRejectedValue(new Error("Rate limited"));
		(useAuth as jest.Mock).mockReturnValue({
			login: mockLogin,
			resendVerification: mockResendVerification,
			state: {
				user: null,
				session: null,
				loading: false,
				error: "Debes verificar tu correo electrónico antes de iniciar sesión.",
			},
			clearError: mockClearError,
		});

		renderLogin();

		await userEvent.click(
			screen.getByRole("button", {
				name: /reenviar email de verificación/i,
			}),
		);

		expect(mockResendVerification).toHaveBeenCalled();
		// Error is not displayed because the catch block doesn't set localError
	});
});

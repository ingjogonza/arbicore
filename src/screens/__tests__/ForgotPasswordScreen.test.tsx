// ============================================
// FORGOT PASSWORD SCREEN TESTS
// ============================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ForgotPasswordScreen } from "../ForgotPasswordScreen";

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockResetPassword = jest.fn();
const mockClearError = jest.fn();

describe("ForgotPasswordScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({
			resetPassword: mockResetPassword,
			state: { loading: false, error: null },
			clearError: mockClearError,
		});
	});

	test("renders forgot password form", () => {
		render(
			<BrowserRouter>
				<ForgotPasswordScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByRole("heading", { name: /recuperar contraseña/i }),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/tu@email\.com/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /enviar enlace/i }),
		).toBeInTheDocument();
	});

	test("validates empty email", async () => {
		render(
			<BrowserRouter>
				<ForgotPasswordScreen />
			</BrowserRouter>,
		);
		fireEvent.submit(
			screen.getByRole("button", { name: /enviar enlace/i }).closest("form")!,
		);
		await waitFor(() =>
			expect(
				screen.getByText(/ingresá tu correo electrónico/i),
			).toBeInTheDocument(),
		);
	});

	test("calls resetPassword with email", async () => {
		mockResetPassword.mockResolvedValue(undefined);
		render(
			<BrowserRouter>
				<ForgotPasswordScreen />
			</BrowserRouter>,
		);

		fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), {
			target: { value: "user@test.com" },
		});
		fireEvent.submit(
			screen.getByRole("button", { name: /enviar enlace/i }).closest("form")!,
		);

		await waitFor(() =>
			expect(mockResetPassword).toHaveBeenCalledWith("user@test.com"),
		);
	});

	test("shows success message after send", async () => {
		mockResetPassword.mockResolvedValue(undefined);
		render(
			<BrowserRouter>
				<ForgotPasswordScreen />
			</BrowserRouter>,
		);

		fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), {
			target: { value: "user@test.com" },
		});
		fireEvent.submit(
			screen.getByRole("button", { name: /enviar enlace/i }).closest("form")!,
		);

		await waitFor(() =>
			expect(screen.getByText(/revisá tu correo/i)).toBeInTheDocument(),
		);
	});

	test("shows error from auth context", () => {
		(useAuth as jest.Mock).mockReturnValue({
			resetPassword: mockResetPassword,
			state: { loading: false, error: "User not found" },
			clearError: mockClearError,
		});

		render(
			<BrowserRouter>
				<ForgotPasswordScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText("User not found")).toBeInTheDocument();
	});

	test("shows loading state", () => {
		(useAuth as jest.Mock).mockReturnValue({
			resetPassword: mockResetPassword,
			state: { loading: true, error: null },
			clearError: mockClearError,
		});

		render(
			<BrowserRouter>
				<ForgotPasswordScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByRole("button", { name: /enviando/i }),
		).toBeInTheDocument();
	});
});

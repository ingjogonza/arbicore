// ============================================
// RESET PASSWORD SCREEN TESTS
// ============================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ResetPasswordScreen } from "../ResetPasswordScreen";

const mockUpdateUser = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("../../lib/supabase", () => ({
	supabase: {
		auth: {
			updateUser: (...args: any[]) => mockUpdateUser(...args),
			onAuthStateChange: jest.fn(() => ({
				data: { subscription: { unsubscribe: mockUnsubscribe } },
			})),
		},
	},
}));

describe("ResetPasswordScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("renders reset password form", () => {
		render(
			<BrowserRouter>
				<ResetPasswordScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByRole("heading", { name: /nueva contraseña/i }),
		).toBeInTheDocument();
		expect(screen.getAllByPlaceholderText(/••••••••/i)).toHaveLength(2);
	});

	test("validates password length", async () => {
		render(
			<BrowserRouter>
				<ResetPasswordScreen />
			</BrowserRouter>,
		);
		const inputs = screen.getAllByPlaceholderText(/••••••••/i);
		fireEvent.change(inputs[0], { target: { value: "123" } });
		fireEvent.change(inputs[1], { target: { value: "123" } });
		fireEvent.submit(
			screen
				.getByRole("button", { name: /actualizar contraseña/i })
				.closest("form")!,
		);
		await waitFor(() =>
			expect(screen.getByText(/al menos 6 caracteres/i)).toBeInTheDocument(),
		);
	});

	test("validates password mismatch", async () => {
		render(
			<BrowserRouter>
				<ResetPasswordScreen />
			</BrowserRouter>,
		);
		const inputs = screen.getAllByPlaceholderText(/••••••••/i);
		fireEvent.change(inputs[0], { target: { value: "password123" } });
		fireEvent.change(inputs[1], { target: { value: "different123" } });
		fireEvent.submit(
			screen
				.getByRole("button", { name: /actualizar contraseña/i })
				.closest("form")!,
		);
		await waitFor(() =>
			expect(screen.getByText(/no coinciden/i)).toBeInTheDocument(),
		);
	});

	test("calls supabase updateUser with new password", async () => {
		mockUpdateUser.mockResolvedValue({ error: null });
		render(
			<BrowserRouter>
				<ResetPasswordScreen />
			</BrowserRouter>,
		);

		const inputs = screen.getAllByPlaceholderText(/••••••••/i);
		fireEvent.change(inputs[0], { target: { value: "newpassword123" } });
		fireEvent.change(inputs[1], { target: { value: "newpassword123" } });
		fireEvent.submit(
			screen
				.getByRole("button", { name: /actualizar contraseña/i })
				.closest("form")!,
		);

		await waitFor(() =>
			expect(mockUpdateUser).toHaveBeenCalledWith({
				password: "newpassword123",
			}),
		);
	});

	test("shows success message after update", async () => {
		mockUpdateUser.mockResolvedValue({ error: null });
		render(
			<BrowserRouter>
				<ResetPasswordScreen />
			</BrowserRouter>,
		);

		const inputs = screen.getAllByPlaceholderText(/••••••••/i);
		fireEvent.change(inputs[0], { target: { value: "newpassword123" } });
		fireEvent.change(inputs[1], { target: { value: "newpassword123" } });
		fireEvent.submit(
			screen
				.getByRole("button", { name: /actualizar contraseña/i })
				.closest("form")!,
		);

		await waitFor(() =>
			expect(screen.getByText(/contraseña actualizada/i)).toBeInTheDocument(),
		);
	});

	test("shows error on supabase failure", async () => {
		mockUpdateUser.mockResolvedValue({ error: { message: "Token expired" } });
		render(
			<BrowserRouter>
				<ResetPasswordScreen />
			</BrowserRouter>,
		);

		const inputs = screen.getAllByPlaceholderText(/••••••••/i);
		fireEvent.change(inputs[0], { target: { value: "newpassword123" } });
		fireEvent.change(inputs[1], { target: { value: "newpassword123" } });
		fireEvent.submit(
			screen
				.getByRole("button", { name: /actualizar contraseña/i })
				.closest("form")!,
		);

		await waitFor(() =>
			expect(screen.getByText("Token expired")).toBeInTheDocument(),
		);
	});
});

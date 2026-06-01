// ============================================
// REGISTER SCREEN TESTS
// ============================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { RegisterScreen } from "../RegisterScreen";

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";

const mockRegister = jest.fn();
const mockClearError = jest.fn();

describe("RegisterScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({
			register: mockRegister,
			state: { loading: false, error: null },
			clearError: mockClearError,
		});
	});

	test("renders registration form", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByRole("heading", { name: /crear cuenta/i }),
		).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/juan/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/pérez/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/tu@email\.com/i)).toBeInTheDocument();
	});

	test("validates empty name fields", async () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);
		await waitFor(() =>
			expect(
				screen.getByText(/ingresa tu nombre y apellido/i),
			).toBeInTheDocument(),
		);
	});

	test("validates password length", async () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		fireEvent.change(screen.getByPlaceholderText(/juan/i), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByPlaceholderText(/pérez/i), {
			target: { value: "Pérez" },
		});
		fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), {
			target: { value: "a@b.com" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[0], {
			target: { value: "123" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[1], {
			target: { value: "123" },
		});
		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);
		await waitFor(() =>
			expect(screen.getByText(/al menos 6 caracteres/i)).toBeInTheDocument(),
		);
	});

	test("validates password mismatch", async () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		fireEvent.change(screen.getByPlaceholderText(/juan/i), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByPlaceholderText(/pérez/i), {
			target: { value: "Pérez" },
		});
		fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), {
			target: { value: "a@b.com" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[0], {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[1], {
			target: { value: "different123" },
		});
		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);
		await waitFor(() =>
			expect(screen.getByText(/no coinciden/i)).toBeInTheDocument(),
		);
	});

	test("submit button is disabled when legal docs are not accepted", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		fireEvent.change(screen.getByPlaceholderText(/juan/i), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByPlaceholderText(/pérez/i), {
			target: { value: "Pérez" },
		});
		fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), {
			target: { value: "a@b.com" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[0], {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[1], {
			target: { value: "password123" },
		});
		expect(
			screen.getByRole("button", { name: /crear cuenta/i }),
		).toBeDisabled();
	});

	test("calls register with correct data including phone", async () => {
		mockRegister.mockResolvedValue(undefined);
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		fireEvent.change(screen.getByPlaceholderText(/juan/i), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByPlaceholderText(/pérez/i), {
			target: { value: "Pérez" },
		});
		fireEvent.change(screen.getByPlaceholderText(/tu@email\.com/i), {
			target: { value: "a@b.com" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[0], {
			target: { value: "password123" },
		});
		fireEvent.change(screen.getAllByPlaceholderText(/••••••••/i)[1], {
			target: { value: "password123" },
		});
		// Add phone number
		fireEvent.change(screen.getByPlaceholderText(/11 2345 6789/i), {
			target: { value: "11 2345 6789" },
		});

		// Accept all legal docs
		const checkboxes = screen.getAllByRole("checkbox");
		checkboxes.forEach((cb) => fireEvent.click(cb));

		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() =>
			expect(mockRegister).toHaveBeenCalledWith({
				firstName: "Juan",
				lastName: "Pérez",
				email: "a@b.com",
				password: "password123",
				phone: "+54 11 2345 6789",
				legalDocsAccepted: true,
			}),
		);
	});

	test("shows error from auth context", () => {
		(useAuth as jest.Mock).mockReturnValue({
			register: mockRegister,
			state: { loading: false, error: "Email already in use" },
			clearError: mockClearError,
		});

		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText("Email already in use")).toBeInTheDocument();
	});

	test("shows loading state", () => {
		(useAuth as jest.Mock).mockReturnValue({
			register: mockRegister,
			state: { loading: true, error: null },
			clearError: mockClearError,
		});

		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByRole("button", { name: /creando cuenta/i }),
		).toBeInTheDocument();
	});
});

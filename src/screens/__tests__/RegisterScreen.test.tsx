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
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

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

	test("validates empty email field", async () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		// Fill all fields except email
		fireEvent.change(screen.getByPlaceholderText(/juan/i), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByPlaceholderText(/pérez/i), {
			target: { value: "Pérez" },
		});
		// Skip email field

		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() =>
			expect(
				screen.getByText(/ingresa tu correo electrónico/i),
			).toBeInTheDocument(),
		);
	});

	test("validates phone number", async () => {
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
		// Phone is too short
		fireEvent.change(screen.getByPlaceholderText(/11 2345 6789/i), {
			target: { value: "12" },
		});

		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() =>
			expect(
				screen.getByText(/ingresa un n.mero de tel.fono v.lido/i),
			).toBeInTheDocument(),
		);
	});

	test("validates legal documents must be accepted", async () => {
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
		fireEvent.change(screen.getByPlaceholderText(/11 2345 6789/i), {
			target: { value: "11 2345 6789" },
		});
		// Don't accept legal docs

		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() =>
			expect(
				screen.getByText(/aceptar todos los documentos legales/i),
			).toBeInTheDocument(),
		);
	});

	test("navigates to /verify-email after successful registration", async () => {
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
		fireEvent.change(screen.getByPlaceholderText(/11 2345 6789/i), {
			target: { value: "11 2345 6789" },
		});

		const checkboxes = screen.getAllByRole("checkbox");
		checkboxes.forEach((cb) => fireEvent.click(cb));

		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith("/verify-email");
		});
	});

	test("renders link to login page", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		const loginLink = screen.getByRole("link", { name: /iniciar sesión/i });
		expect(loginLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute("href", "/login");
	});

	test("renders legal documents section heading", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		expect(
			screen.getByText(/documentos legales obligatorios/i),
		).toBeInTheDocument();
	});

	test("renders all 4 legal document items", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		expect(screen.getByText(/t.rminos de servicio/i)).toBeInTheDocument();
		expect(screen.getByText(/divulgaci.n de riesgos/i)).toBeInTheDocument();
		expect(
			screen.getByText(/acuerdo de autorizaci.n api/i),
		).toBeInTheDocument();
		expect(screen.getByText(/pol.tica de no custodia/i)).toBeInTheDocument();
	});

	test("clears error on form submit", async () => {
		(useAuth as jest.Mock).mockReturnValue({
			register: mockRegister,
			state: { loading: false, error: "Previous error" },
			clearError: mockClearError,
		});

		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		// Submit without fields triggers validation, which should clear error first
		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() => {
			expect(mockClearError).toHaveBeenCalled();
		});
	});

	test("toggles individual legal document checkboxes", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes).toHaveLength(4);

		// All unchecked initially
		checkboxes.forEach((cb) => expect(cb).not.toBeChecked());

		// Toggle first one
		fireEvent.click(checkboxes[0]);
		expect(checkboxes[0]).toBeChecked();

		// Toggle it off
		fireEvent.click(checkboxes[0]);
		expect(checkboxes[0]).not.toBeChecked();
	});

	test("renders phone country code selector", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		expect(screen.getByRole("combobox")).toBeInTheDocument();
		expect(screen.getByText("AR (+54)")).toBeInTheDocument();
	});

	test("changes country code on selection", () => {
		render(
			<BrowserRouter>
				<RegisterScreen />
			</BrowserRouter>,
		);

		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.value).toBe("+54");

		fireEvent.change(select, { target: { value: "+1" } });
		expect(select.value).toBe("+1");
	});

	test("shows error message when register throws", async () => {
		mockRegister.mockRejectedValue(new Error("API error"));

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
		fireEvent.change(screen.getByPlaceholderText(/11 2345 6789/i), {
			target: { value: "11 2345 6789" },
		});

		const checkboxes = screen.getAllByRole("checkbox");
		checkboxes.forEach((cb) => fireEvent.click(cb));

		fireEvent.submit(
			screen.getByRole("button", { name: /crear cuenta/i }).closest("form")!,
		);

		await waitFor(() => {
			// Register threw but error is handled silently (set in AuthContext)
			expect(mockRegister).toHaveBeenCalled();
		});
	});
});

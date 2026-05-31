// ============================================
// 2FA VERIFY SCREEN TESTS
// ============================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { TwoFactorVerifyScreen } from "../TwoFactorVerifyScreen";

const mockVerify2FA = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => {
	const actual = jest.requireActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

import { useAuth } from "../../contexts/AuthContext";

function renderScreen() {
	return render(
		<BrowserRouter>
			<TwoFactorVerifyScreen />
		</BrowserRouter>,
	);
}

describe("TwoFactorVerifyScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({
			verify2FA: mockVerify2FA,
		});
	});

	test("renders form with heading and token input", () => {
		renderScreen();

		expect(
			screen.getByRole("heading", {
				name: /verificación en dos pasos/i,
			}),
		).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /verificar/i }),
		).toBeInTheDocument();
	});

	test("token input only accepts digits", () => {
		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "abc123" } });

		expect(input).toHaveValue("123");
	});

	test("token input is limited to 6 characters", () => {
		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "1234567" } });

		expect(input).toHaveValue("123456");
	});

	test("submit button is disabled when token is not 6 digits", () => {
		renderScreen();

		const input = screen.getByRole("textbox");
		const button = screen.getByRole("button", { name: /verificar/i });

		expect(button).toBeDisabled();

		fireEvent.change(input, { target: { value: "12345" } });
		expect(button).toBeDisabled();

		fireEvent.change(input, { target: { value: "123456" } });
		expect(button).toBeEnabled();
	});

	test("shows error when submitting with less than 6 digits via validation", () => {
		renderScreen();

		const input = screen.getByRole("textbox");

		// Button is disabled with <6 digits, so directly submit form
		fireEvent.change(input, { target: { value: "123" } });
		fireEvent.submit(input.closest("form")!);

		expect(
			screen.getByText("Ingresa el código de 6 dígitos."),
		).toBeInTheDocument();
	});

	test("navigates to /dashboard on successful verification", async () => {
		mockVerify2FA.mockResolvedValue(true);

		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

		await waitFor(() =>
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
		);
	});

	test("shows error on wrong token", async () => {
		mockVerify2FA.mockResolvedValue(false);

		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "000000" } });
		fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

		await waitFor(() =>
			expect(
				screen.getByText("Código incorrecto. Intenta de nuevo."),
			).toBeInTheDocument(),
		);
	});

	test("shows error when verify2FA throws", async () => {
		mockVerify2FA.mockRejectedValue(new Error("Token expirado"));

		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

		await waitFor(() =>
			expect(screen.getByText("Token expirado")).toBeInTheDocument(),
		);
	});

	test("shows generic error on exception without message", async () => {
		mockVerify2FA.mockRejectedValue(new Error());

		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

		await waitFor(() =>
			expect(screen.getByText("Error al verificar código")).toBeInTheDocument(),
		);
	});

	test("shows loading state while verifying", async () => {
		let resolveVerify!: (value: boolean) => void;
		mockVerify2FA.mockReturnValue(
			new Promise((resolve) => {
				resolveVerify = resolve;
			}),
		);

		renderScreen();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "123456" } });
		fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

		expect(screen.getByText("Verificando...")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /verificando/i })).toBeDisabled();

		resolveVerify(true);
	});
});

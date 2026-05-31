// ============================================
// 2FA SETUP SCREEN TESTS
// ============================================

import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { TwoFactorSetupScreen } from "../TwoFactorSetupScreen";

const mockSetup2FA = jest.fn();
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
			<TwoFactorSetupScreen />
		</BrowserRouter>,
	);
}

describe("TwoFactorSetupScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({
			setup2FA: mockSetup2FA,
			verify2FA: mockVerify2FA,
		});
	});

	describe("initial load", () => {
		test("shows loading spinner before setup2FA resolves", () => {
			mockSetup2FA.mockReturnValue(new Promise(() => {})); // never resolves

			renderScreen();

			expect(screen.getByText("Cargando...")).toBeInTheDocument();
		});

		test("calls setup2FA on mount", () => {
			mockSetup2FA.mockResolvedValue({
				secret: "SECRET123",
				qrCodeUrl: "otpauth://totp/...",
			});

			renderScreen();

			expect(mockSetup2FA).toHaveBeenCalledTimes(1);
		});

		test("displays QR code and secret after setup2FA resolves", async () => {
			mockSetup2FA.mockResolvedValue({
				secret: "JBSWY3DPEHPK3PXP",
				qrCodeUrl: "https://chart.googleapis.com/...",
			});

			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);
			expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
		});

		test("shows error when setup2FA rejects", async () => {
			mockSetup2FA.mockRejectedValue(new Error("2FA ya configurado"));

			renderScreen();

			await waitFor(() =>
				expect(screen.getByText("2FA ya configurado")).toBeInTheDocument(),
			);
		});

		test("shows generic error when setup2FA rejects without message", async () => {
			mockSetup2FA.mockRejectedValue(new Error());

			renderScreen();

			await waitFor(() =>
				expect(
					screen.getByText("Error al iniciar configuración de 2FA"),
				).toBeInTheDocument(),
			);
		});

		test("does not update state after unmount", async () => {
			const { unmount } = renderScreen();

			unmount();

			// Let the pending promise from setup2FA resolve after unmount
			// The cancelled flag should prevent any setState calls
			await act(async () => {
				await new Promise((r) => setTimeout(r, 50));
			});
			// No crash = success
		});
	});

	describe("token input and verification", () => {
		beforeEach(() => {
			mockSetup2FA.mockResolvedValue({
				secret: "SECRET123",
				qrCodeUrl: "otpauth://totp/...",
			});
		});

		test("token input only accepts digits", async () => {
			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "abc123" } });

			expect(input).toHaveValue("123");
		});

		test("token input is limited to 6 characters", async () => {
			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, {
				target: { value: "1234567" },
			});

			expect(input).toHaveValue("123456");
		});

		test("verify button is disabled when token is not 6 digits", async () => {
			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			expect(screen.getByRole("button", { name: /verificar/i })).toBeDisabled();

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "12345" } });
			expect(screen.getByRole("button", { name: /verificar/i })).toBeDisabled();

			fireEvent.change(input, { target: { value: "123456" } });
			expect(screen.getByRole("button", { name: /verificar/i })).toBeEnabled();
		});

		test("shows success message on valid token", async () => {
			mockVerify2FA.mockResolvedValue(true);

			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "123456" } });
			fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

			await waitFor(() =>
				expect(
					screen.getByText("¡2FA activado correctamente!"),
				).toBeInTheDocument(),
			);
		});

		test("navigates to /settings after successful verification", async () => {
			jest.useFakeTimers();
			mockVerify2FA.mockResolvedValue(true);

			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "123456" } });
			fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

			await waitFor(() =>
				expect(
					screen.getByText("¡2FA activado correctamente!"),
				).toBeInTheDocument(),
			);

			// Advance past the 2000ms timeout
			jest.advanceTimersByTime(2000);

			expect(mockNavigate).toHaveBeenCalledWith("/settings");

			jest.useRealTimers();
		});

		test("shows error on wrong token", async () => {
			mockVerify2FA.mockResolvedValue(false);

			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
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

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "123456" } });
			fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

			await waitFor(() =>
				expect(screen.getByText("Token expirado")).toBeInTheDocument(),
			);
		});

		test("shows generic error on exception without message", async () => {
			mockVerify2FA.mockRejectedValue(new Error());

			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "123456" } });
			fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

			await waitFor(() =>
				expect(
					screen.getByText("Error al verificar código"),
				).toBeInTheDocument(),
			);
		});

		test("shows button loading state while verifying", async () => {
			let resolveVerify!: (value: boolean) => void;
			mockVerify2FA.mockReturnValue(
				new Promise((resolve) => {
					resolveVerify = resolve;
				}),
			);

			renderScreen();

			await waitFor(() =>
				expect(screen.getByAltText("2FA QR Code")).toBeInTheDocument(),
			);

			const input = screen.getByPlaceholderText("000000");
			fireEvent.change(input, { target: { value: "123456" } });
			fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

			expect(screen.getByText("Verificando...")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /verificando/i }),
			).toBeDisabled();

			resolveVerify(true);
		});
	});
});

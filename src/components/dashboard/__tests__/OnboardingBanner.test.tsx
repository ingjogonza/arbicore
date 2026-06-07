// ============================================
// ONBOARDING BANNER TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingBanner } from "../OnboardingBanner";

const mockOnSetup2FA = jest.fn();
const mockOnConnectApi = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
});

describe("OnboardingBanner", () => {
	describe("loading state", () => {
		test("renders nothing when loading is true", () => {
			const { container } = render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={false}
					loading={true}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("fully configured state", () => {
		test("renders green banner when has2FA and hasApiKeys are both true", () => {
			render(
				<OnboardingBanner
					has2FA={true}
					hasApiKeys={true}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(screen.getByText(/todo listo para operar/i)).toBeInTheDocument();
			expect(screen.getByText("✅")).toBeInTheDocument();
		});

		test("green banner is dismissible via close button", () => {
			render(
				<OnboardingBanner
					has2FA={true}
					hasApiKeys={true}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(screen.getByText(/todo listo para operar/i)).toBeInTheDocument();

			const closeButton = screen.getByRole("button", { name: /cerrar/i });
			fireEvent.click(closeButton);

			expect(
				screen.queryByText(/todo listo para operar/i),
			).not.toBeInTheDocument();
		});

		test("dismissed state persists in localStorage", () => {
			const { unmount } = render(
				<OnboardingBanner
					has2FA={true}
					hasApiKeys={true}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			const closeButton = screen.getByRole("button", { name: /cerrar/i });
			fireEvent.click(closeButton);

			expect(localStorage.getItem("onboarding-banner-dismissed")).toBe("true");

			unmount();

			// Re-render: should still be dismissed
			const { container } = render(
				<OnboardingBanner
					has2FA={true}
					hasApiKeys={true}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("missing 2FA", () => {
		test("shows setup step when has2FA is false", () => {
			render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={true}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(screen.getByText(/configurar 2fa/i)).toBeInTheDocument();
			expect(screen.getByText(/protegé tu cuenta/i)).toBeInTheDocument();
		});

		test("calls onSetup2FA when setup button is clicked", () => {
			render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={true}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			fireEvent.click(screen.getByText(/configurar 2fa/i));
			expect(mockOnSetup2FA).toHaveBeenCalledTimes(1);
		});
	});

	describe("missing API keys", () => {
		test("shows setup step when hasApiKeys is false", () => {
			render(
				<OnboardingBanner
					has2FA={true}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(screen.getByText(/conectar api/i)).toBeInTheDocument();
			expect(screen.getByText(/vinculá tu cuenta/i)).toBeInTheDocument();
		});

		test("calls onConnectApi when connect button is clicked", () => {
			render(
				<OnboardingBanner
					has2FA={true}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			fireEvent.click(screen.getByText(/conectar api/i));
			expect(mockOnConnectApi).toHaveBeenCalledTimes(1);
		});
	});

	describe("both missing", () => {
		test("shows both setup steps when both are missing", () => {
			render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(screen.getByText(/configurar 2fa/i)).toBeInTheDocument();
			expect(screen.getByText(/conectar api/i)).toBeInTheDocument();
		});

		test("calls onSetup2FA when 2FA button clicked", () => {
			render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			const setupButton = buttons.find((btn) =>
				btn.textContent?.includes("Configurar 2FA"),
			);
			if (setupButton) fireEvent.click(setupButton);

			expect(mockOnSetup2FA).toHaveBeenCalled();
		});

		test("calls onConnectApi when API button clicked", () => {
			render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			const apiButton = buttons.find((btn) =>
				btn.textContent?.includes("Conectar API"),
			);
			if (apiButton) fireEvent.click(apiButton);

			expect(mockOnConnectApi).toHaveBeenCalled();
		});

		test("banner is dismissible via close button", () => {
			render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			expect(screen.getByText(/bienvenido/i)).toBeInTheDocument();

			const closeButton = screen.getByRole("button", { name: /cerrar/i });
			fireEvent.click(closeButton);

			expect(screen.queryByText(/bienvenido/i)).not.toBeInTheDocument();
		});
	});

	describe("localStorage persistence", () => {
		test("reads dismissed state from localStorage on mount", () => {
			localStorage.setItem("onboarding-banner-dismissed", "true");

			const { container } = render(
				<OnboardingBanner
					has2FA={false}
					hasApiKeys={false}
					loading={false}
					onSetup2FA={mockOnSetup2FA}
					onConnectApi={mockOnConnectApi}
				/>,
			);

			// Should be dismissed from the start
			expect(container.firstChild).toBeNull();
		});
	});
});

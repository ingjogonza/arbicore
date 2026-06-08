// ============================================
// ONBOARDING SCREEN TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { OnboardingScreen } from "../OnboardingScreen";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

describe("OnboardingScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("renders brand logo and tagline", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText("CryptoInvestor")).toBeInTheDocument();
		expect(
			screen.getByText("Automated Execution. Full Custody. Transparent Fees."),
		).toBeInTheDocument();
	});

	test("renders main heading and description", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByText(/automate your trading strategy/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/connect your binance account via api and let our algorithm execute/i,
			),
		).toBeInTheDocument();
	});

	test("renders all three onboarding steps", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText("Connect API Keys")).toBeInTheDocument();
		expect(screen.getByText("Activate the Bot")).toBeInTheDocument();
		expect(screen.getByText("Withdraw Profits")).toBeInTheDocument();
	});

	test("renders step descriptions", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByText(
				/link your binance account securely with read-only and trading permissions/i,
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/choose your risk profile and start automated execution in seconds/i,
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(/withdraw anytime. only 7% fee on profits withdrawn/i),
		).toBeInTheDocument();
	});

	test("renders security alert", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByText(
				/your funds remain in your binance account at all times/i,
			),
		).toBeInTheDocument();
		expect(screen.getByText(/we never hold custody/i)).toBeInTheDocument();
	});

	test("navigates to /connect when Connect Binance Account is clicked", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /connect binance account/i }),
		);
		expect(mockNavigate).toHaveBeenCalledWith("/connect", { replace: true });
	});

	test("navigates to /login when Iniciar sesión is clicked", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
		expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
	});

	test("navigates to /register when Crear cuenta is clicked", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
		expect(mockNavigate).toHaveBeenCalledWith("/register", { replace: true });
	});

	test("renders footer disclaimer", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(
			screen.getByText(/no custodial trading automation software/i),
		).toBeInTheDocument();
	});

	test("renders credit card free message", () => {
		render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
	});

	test("renders decorative SVG in desktop panel", () => {
		const { container } = render(
			<BrowserRouter>
				<OnboardingScreen />
			</BrowserRouter>,
		);
		// The SVG with concentric circles is present
		expect(container.querySelector("svg")).toBeInTheDocument();
	});
});

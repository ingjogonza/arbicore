// ============================================
// SIDEBAR TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Sidebar } from "../Sidebar";

jest.mock("../../../hooks/useTheme", () => ({
	useTheme: jest.fn(),
}));

jest.mock("../../../hooks/useTrading", () => ({
	useTrading: jest.fn(),
}));

import { useTheme } from "../../../hooks/useTheme";
import { useTrading } from "../../../hooks/useTrading";

const mockToggleTheme = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
	const actual = jest.requireActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const renderSidebar = (
	props: { isOpen?: boolean; onClose?: () => void } = {},
) =>
	render(
		<BrowserRouter>
			<Sidebar
				isOpen={props.isOpen ?? false}
				onClose={props.onClose ?? jest.fn()}
			/>
		</BrowserRouter>,
	);

describe("Sidebar", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useTheme as jest.Mock).mockReturnValue({
			theme: "light",
			toggleTheme: mockToggleTheme,
		});
		(useTrading as jest.Mock).mockReturnValue({
			account: {
				botStatus: "active",
			},
		});
	});

	describe("desktop sidebar", () => {
		test("renders desktop sidebar with brand name", () => {
			renderSidebar();
			expect(screen.getByText("CryptoInvestor")).toBeInTheDocument();
		});

		test("renders all navigation items", () => {
			renderSidebar();
			expect(screen.getByText("Dashboard")).toBeInTheDocument();
			expect(screen.getByText("API Connection")).toBeInTheDocument();
			expect(screen.getByText("Withdrawals")).toBeInTheDocument();
			expect(screen.getByText("Settings")).toBeInTheDocument();
		});

		test("navigates on nav item click", () => {
			renderSidebar();
			fireEvent.click(screen.getByText("Dashboard"));
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
		});

		test("navigates to connect page", () => {
			renderSidebar();
			fireEvent.click(screen.getByText("API Connection"));
			expect(mockNavigate).toHaveBeenCalledWith("/connect");
		});

		test("shows active state for current route", () => {
			window.history.pushState({}, "", "/dashboard");
			renderSidebar();
			const dashboardBtn = screen.getByText("Dashboard").closest("button")!;
			expect(dashboardBtn.className).toContain("teal");
		});

		test("shows bot status indicator for active bot as lowercase text", () => {
			renderSidebar();
			// botStatus is 'active' (lowercase), capitalize is CSS-only in JSDOM
			expect(screen.getByText("active")).toBeInTheDocument();
			expect(screen.getByText("Bot running")).toBeInTheDocument();
		});

		test("shows bot status for paused", () => {
			(useTrading as jest.Mock).mockReturnValue({
				account: { botStatus: "paused" },
			});
			renderSidebar();
			expect(screen.getByText("paused")).toBeInTheDocument();
			expect(screen.getByText("Bot stopped")).toBeInTheDocument();
		});

		test("shows bot status for error", () => {
			(useTrading as jest.Mock).mockReturnValue({
				account: { botStatus: "error" },
			});
			renderSidebar();
			expect(screen.getByText("error")).toBeInTheDocument();
			expect(screen.getByText("Bot stopped")).toBeInTheDocument();
		});

		test("toggles theme from light to dark", () => {
			renderSidebar();
			const themeBtn = screen.getByText("Dark Mode");
			fireEvent.click(themeBtn);
			expect(mockToggleTheme).toHaveBeenCalled();
		});

		test("shows light mode button when dark theme", () => {
			(useTheme as jest.Mock).mockReturnValue({
				theme: "dark",
				toggleTheme: mockToggleTheme,
			});
			renderSidebar();
			expect(screen.getByText("Light Mode")).toBeInTheDocument();
		});
	});

	describe("mobile sidebar", () => {
		test("does not render mobile sidebar when isOpen is false", () => {
			renderSidebar({ isOpen: false });
			// The mobile sidebar is wrapped in a fixed overlay
			const overlay = document.querySelector(".fixed.inset-0");
			expect(overlay).not.toBeInTheDocument();
		});

		test("renders mobile sidebar when isOpen is true", () => {
			const onClose = jest.fn();
			renderSidebar({ isOpen: true, onClose });

			const overlay = document.querySelector(".fixed.inset-0");
			expect(overlay).toBeInTheDocument();
		});

		test("mobile sidebar has navigation items", () => {
			renderSidebar({ isOpen: true });

			const dashboardLinks = screen.getAllByText("Dashboard");
			// Desktop + mobile = 2 buttons
			expect(dashboardLinks.length).toBe(2);
		});

		test("desktop nav click does not call onClose", () => {
			const onClose = jest.fn();
			renderSidebar({ isOpen: true, onClose });

			// getAllByText returns both desktop and mobile buttons
			// The first one is the desktop sidebar nav button
			const dashboardBtns = screen.getAllByText("Dashboard");
			fireEvent.click(dashboardBtns[0]);

			expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
			expect(onClose).not.toHaveBeenCalled();
		});

		test("shows bot status in mobile sidebar", () => {
			renderSidebar({ isOpen: true });
			const statusElements = screen.getAllByText("active");
			// Appears in both desktop and mobile bot status sections
			expect(statusElements.length).toBe(2);
		});

		test("toggles theme in mobile sidebar", () => {
			renderSidebar({ isOpen: true });
			const darkModeButtons = screen.getAllByText("Dark Mode");
			// Desktop + mobile = 2 buttons
			expect(darkModeButtons.length).toBe(2);
			fireEvent.click(darkModeButtons[0]);
			expect(mockToggleTheme).toHaveBeenCalled();
		});
	});
});

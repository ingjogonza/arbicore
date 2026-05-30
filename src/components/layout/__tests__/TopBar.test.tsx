// ============================================
// TOP BAR TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { TopBar } from "../TopBar";

jest.mock("../../../hooks/useTrading", () => ({
	useTrading: jest.fn(),
}));

jest.mock("../../../contexts/AuthContext", () => ({
	useAuth: jest.fn(),
}));

import { useTrading } from "../../../hooks/useTrading";
import { useAuth } from "../../../contexts/AuthContext";

const mockLogout = jest.fn();

const renderTopBar = (pathname = "/dashboard") => {
	window.history.pushState({}, "", pathname);
	return render(
		<BrowserRouter>
			<TopBar onMenuClick={jest.fn()} />
		</BrowserRouter>,
	);
};

describe("TopBar", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useTrading as jest.Mock).mockReturnValue({
			user: {
				name: "John Doe",
				email: "john@test.com",
				avatar: "JD",
			},
		});
		(useAuth as jest.Mock).mockReturnValue({
			state: { user: null },
			logout: mockLogout,
		});
	});

	test("renders dashboard title by default", () => {
		renderTopBar("/dashboard");
		expect(
			screen.getByRole("heading", { name: /dashboard/i }),
		).toBeInTheDocument();
	});

	test("renders correct title for API connection page", () => {
		renderTopBar("/connect");
		expect(
			screen.getByRole("heading", { name: /api connection/i }),
		).toBeInTheDocument();
	});

	test("renders correct title for withdrawals page", () => {
		renderTopBar("/withdrawals");
		expect(
			screen.getByRole("heading", { name: /withdrawal history/i }),
		).toBeInTheDocument();
	});

	test("renders correct title for settings page", () => {
		renderTopBar("/settings");
		expect(
			screen.getByRole("heading", { name: /settings & legal/i }),
		).toBeInTheDocument();
	});

	test("shows default title for unknown path", () => {
		renderTopBar("/unknown");
		expect(
			screen.getByRole("heading", { name: /cryptoinvestor/i }),
		).toBeInTheDocument();
	});

	test("shows user avatar from trading context when no auth user", () => {
		renderTopBar();
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	test("shows user avatar from auth user when present", () => {
		(useAuth as jest.Mock).mockReturnValue({
			state: {
				user: {
					firstName: "Jane",
					lastName: "Doe",
					email: "jane@test.com",
				},
			},
			logout: mockLogout,
		});

		renderTopBar();
		expect(screen.getByText("JD")).toBeInTheDocument();
	});

	test("shows auth user name and email", () => {
		(useAuth as jest.Mock).mockReturnValue({
			state: {
				user: {
					firstName: "Jane",
					lastName: "Doe",
					email: "jane@test.com",
				},
			},
			logout: mockLogout,
		});

		renderTopBar();
		expect(screen.getByText("Jane Doe")).toBeInTheDocument();
		expect(screen.getByText("jane@test.com")).toBeInTheDocument();
	});

	test("shows fallback user name from useTrading when no auth", () => {
		renderTopBar();
		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.getByText("john@test.com")).toBeInTheDocument();
	});

	test("shows logout button when auth user is present", () => {
		(useAuth as jest.Mock).mockReturnValue({
			state: {
				user: {
					firstName: "Jane",
					email: "jane@test.com",
				},
			},
			logout: mockLogout,
		});

		renderTopBar();
		expect(screen.getByTitle("Cerrar sesión")).toBeInTheDocument();
	});

	test("calls logout when logout button is clicked", () => {
		(useAuth as jest.Mock).mockReturnValue({
			state: {
				user: {
					firstName: "Jane",
					email: "jane@test.com",
				},
			},
			logout: mockLogout,
		});

		renderTopBar();
		fireEvent.click(screen.getByTitle("Cerrar sesión"));
		expect(mockLogout).toHaveBeenCalled();
	});

	test("hides logout button when no auth user", () => {
		renderTopBar();
		expect(screen.queryByTitle("Cerrar sesión")).not.toBeInTheDocument();
	});

	test("calls onMenuClick when menu button is clicked", () => {
		const onMenuClick = jest.fn();
		render(
			<BrowserRouter>
				<TopBar onMenuClick={onMenuClick} />
			</BrowserRouter>,
		);
		const menuBtn = screen.getAllByRole("button")[0];
		fireEvent.click(menuBtn);
		expect(onMenuClick).toHaveBeenCalled();
	});

	test("shows notification bell", () => {
		renderTopBar();
		// Lucide renders Bell as inline SVG — just verify it's present
		const bellIcon = document.querySelector(".lucide-bell");
		expect(bellIcon).toBeInTheDocument();
	});
});

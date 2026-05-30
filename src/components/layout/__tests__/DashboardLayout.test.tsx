// ============================================
// DASHBOARD LAYOUT TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayout } from "../DashboardLayout";

jest.mock("../Sidebar", () => ({
	Sidebar: jest.fn(({ isOpen, onClose }) => (
		<div data-testid="sidebar" data-open={isOpen}>
			<button data-testid="sidebar-close" onClick={onClose}>
				Close
			</button>
		</div>
	)),
}));

jest.mock("../TopBar", () => ({
	TopBar: jest.fn(({ onMenuClick }) => (
		<div data-testid="topbar">
			<button data-testid="menu-btn" onClick={onMenuClick}>
				Menu
			</button>
		</div>
	)),
}));

describe("DashboardLayout", () => {
	test("renders children", () => {
		render(
			<DashboardLayout>
				<p>Content</p>
			</DashboardLayout>,
		);
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	test("renders Sidebar and TopBar", () => {
		render(
			<DashboardLayout>
				<p>Content</p>
			</DashboardLayout>,
		);
		expect(screen.getByTestId("sidebar")).toBeInTheDocument();
		expect(screen.getByTestId("topbar")).toBeInTheDocument();
	});

	test("sidebar starts closed", () => {
		render(
			<DashboardLayout>
				<p>Content</p>
			</DashboardLayout>,
		);
		expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
	});

	test("opens sidebar overlay when menu button is clicked", () => {
		render(
			<DashboardLayout>
				<p>Content</p>
			</DashboardLayout>,
		);

		fireEvent.click(screen.getByTestId("menu-btn"));

		expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");
	});

	test("closes sidebar when overlay is clicked", () => {
		render(
			<DashboardLayout>
				<p>Content</p>
			</DashboardLayout>,
		);

		// Open sidebar first
		fireEvent.click(screen.getByTestId("menu-btn"));
		expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");

		// Click overlay — it's the backdrop div created when sidebarOpen is true
		const overlay = document.querySelector(".fixed.inset-0");
		expect(overlay).toBeInTheDocument();
		fireEvent.click(overlay!);

		expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
	});

	test("sidebar close button calls onClose", () => {
		render(
			<DashboardLayout>
				<p>Content</p>
			</DashboardLayout>,
		);

		// Open sidebar
		fireEvent.click(screen.getByTestId("menu-btn"));

		// Close through sidebar's close button
		fireEvent.click(screen.getByTestId("sidebar-close"));

		expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
	});
});

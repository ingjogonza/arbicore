// ============================================
// useTheme HOOK TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../useTheme";

const TestComponent: React.FC = () => {
	const { theme, toggleTheme } = useTheme();
	return (
		<div>
			<span data-testid="theme-value">{theme}</span>
			<button data-testid="toggle-btn" onClick={toggleTheme}>
				Toggle
			</button>
		</div>
	);
};

const renderWithProvider = () =>
	render(
		<ThemeProvider>
			<TestComponent />
		</ThemeProvider>,
	);

describe("ThemeProvider", () => {
	beforeEach(() => {
		document.documentElement.classList.remove("dark");
	});

	test("provides light theme by default", () => {
		renderWithProvider();
		expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	test("toggleTheme switches from light to dark", () => {
		renderWithProvider();
		fireEvent.click(screen.getByTestId("toggle-btn"));
		expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	test("toggleTheme switches from dark back to light", () => {
		renderWithProvider();
		fireEvent.click(screen.getByTestId("toggle-btn"));
		fireEvent.click(screen.getByTestId("toggle-btn"));
		expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	test("dark class is added to html element when theme is dark", () => {
		renderWithProvider();
		fireEvent.click(screen.getByTestId("toggle-btn"));
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	test("removes dark class when toggling back to light", () => {
		renderWithProvider();
		fireEvent.click(screen.getByTestId("toggle-btn"));
		fireEvent.click(screen.getByTestId("toggle-btn"));
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});
});

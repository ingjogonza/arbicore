// ============================================
// VERIFY EMAIL SCREEN TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { VerifyEmailScreen } from "../VerifyEmailScreen";

const renderVerifyEmail = () =>
	render(
		<BrowserRouter>
			<VerifyEmailScreen />
		</BrowserRouter>,
	);

describe("VerifyEmailScreen", () => {
	test("renders heading and instructions", () => {
		renderVerifyEmail();

		expect(
			screen.getByRole("heading", { name: /verificá tu correo/i }),
		).toBeInTheDocument();

		expect(
			screen.getByText(/te enviamos un email con un enlace de verificación/i),
		).toBeInTheDocument();
	});

	test("renders resend verification email button", () => {
		renderVerifyEmail();

		const resendButton = screen.getByRole("button", {
			name: /reenviar email de verificación/i,
		});
		expect(resendButton).toBeInTheDocument();
	});

	test("renders link to login page", () => {
		renderVerifyEmail();

		const loginLink = screen.getByRole("link", {
			name: /ya verifiqué mi email/i,
		});
		expect(loginLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute("href", "/login");
	});

	test("renders spam tip", () => {
		renderVerifyEmail();

		expect(
			screen.getByText(/revisá tu carpeta de spam/i),
		).toBeInTheDocument();
	});

	test("shows success alert when resend button is clicked", () => {
		renderVerifyEmail();

		const resendButton = screen.getByRole("button", {
			name: /reenviar email de verificación/i,
		});

		expect(
			screen.queryByText(/email reenviado correctamente/i),
		).not.toBeInTheDocument();

		fireEvent.click(resendButton);

		expect(
			screen.getByText(/email reenviado correctamente/i),
		).toBeInTheDocument();
	});

	test("persists success alert on multiple clicks", () => {
		renderVerifyEmail();

		const resendButton = screen.getByRole("button", {
			name: /reenviar email de verificación/i,
		});

		fireEvent.click(resendButton);
		fireEvent.click(resendButton);
		fireEvent.click(resendButton);

		const alerts = screen.getAllByText(/email reenviado correctamente/i);
		expect(alerts.length).toBeGreaterThanOrEqual(1);
	});
});

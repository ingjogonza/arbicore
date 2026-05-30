// ============================================
// WITHDRAW MODAL TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { WithdrawModal } from "../WithdrawModal";

jest.mock("../../hooks/useTrading", () => ({
	useTrading: jest.fn(),
}));

import { useTrading } from "../../hooks/useTrading";

const mockWithdraw = jest.fn();
const onClose = jest.fn();

const defaultAccount = {
	initialBalance: 10000,
	currentBalance: 12500,
	apiConnected: true,
	apiKey: "••••••••••••",
	botStatus: "active" as const,
	botRunningSince: "2026-01-15",
	strategy: "Conservative",
};

const fillFormAndSubmit = () => {
	fireEvent.change(
		screen.getByPlaceholderText(/enter your USDT.*wallet address/i),
		{ target: { value: "0x1234567890abcdef" } },
	);
	const checkboxes = screen.getAllByRole("checkbox");
	fireEvent.click(checkboxes[0]);
	fireEvent.click(checkboxes[1]);
	fireEvent.click(screen.getByRole("button", { name: /confirm withdrawal/i }));
};

const renderModal = (isOpen = true) =>
	render(<WithdrawModal isOpen={isOpen} onClose={onClose} />);

describe("WithdrawModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useTrading as jest.Mock).mockReturnValue({
			account: defaultAccount,
			withdraw: mockWithdraw,
		});
	});

	test("does not render when isOpen is false", () => {
		renderModal(false);
		expect(
			screen.queryByRole("heading", { name: /withdraw profits/i }),
		).not.toBeInTheDocument();
	});

	test("renders profit summary when open", () => {
		renderModal();
		expect(
			screen.getByRole("heading", { name: /withdraw profits/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/Initial Balance/i)).toBeInTheDocument();
		expect(screen.getByText(/10,000.00 USDT/)).toBeInTheDocument();
		expect(screen.getByText(/12,500.00 USDT/)).toBeInTheDocument();
	});

	test("shows correct gross profit, fee, and net amount", () => {
		renderModal();
		// Gross profit = 12500 - 10000 = 2500
		expect(screen.getByText(/\+2,500\.00 USDT/)).toBeInTheDocument();
		// Fee = 2500 * 0.07 = 175
		expect(screen.getByText(/-175\.00 USDT/)).toBeInTheDocument();
		// Net = 2500 * 0.93 = 2325
		expect(screen.getByText(/2,325\.00 USDT/)).toBeInTheDocument();
	});

	test("renders address input and network select", () => {
		renderModal();
		expect(
			screen.getByPlaceholderText(/enter your USDT.*wallet address/i),
		).toBeInTheDocument();
		expect(screen.getByDisplayValue("TRC20")).toBeInTheDocument();
	});

	test("confirm button is disabled when checkboxes are unchecked", () => {
		renderModal();
		const confirmBtn = screen.getByRole("button", {
			name: /confirm withdrawal/i,
		});
		expect(confirmBtn).toBeDisabled();
	});

	test("confirm button enables when both checkboxes checked and address filled", () => {
		renderModal();

		fireEvent.change(
			screen.getByPlaceholderText(/enter your USDT.*wallet address/i),
			{ target: { value: "0x1234567890abcdef" } },
		);

		const checkboxes = screen.getAllByRole("checkbox");
		fireEvent.click(checkboxes[0]);
		fireEvent.click(checkboxes[1]);

		const confirmBtn = screen.getByRole("button", {
			name: /confirm withdrawal/i,
		});
		expect(confirmBtn).not.toBeDisabled();
	});

	test("calls withdraw and shows submitted state on confirm", () => {
		jest.useFakeTimers();
		renderModal();

		fillFormAndSubmit();

		expect(mockWithdraw).toHaveBeenCalledWith(2500, "0x1234567890abcdef");
		expect(screen.getByText(/Withdrawal Initiated/i)).toBeInTheDocument();
		expect(
			screen.getByText(/your withdrawal is being processed/i),
		).toBeInTheDocument();

		jest.useRealTimers();
	});

	test("resets and closes after 2 seconds in submitted state", () => {
		jest.useFakeTimers();
		renderModal();

		fillFormAndSubmit();

		expect(screen.getByText(/Withdrawal Initiated/i)).toBeInTheDocument();

		jest.advanceTimersByTime(2000);

		expect(onClose).toHaveBeenCalled();
		jest.useRealTimers();
	});

	test("does not call withdraw when checkboxes unchecked", () => {
		renderModal();
		fireEvent.click(
			screen.getByRole("button", { name: /confirm withdrawal/i }),
		);
		expect(mockWithdraw).not.toHaveBeenCalled();
	});

	test("does not call withdraw when address is empty", () => {
		renderModal();
		const checkboxes = screen.getAllByRole("checkbox");
		fireEvent.click(checkboxes[0]);
		fireEvent.click(checkboxes[1]);
		fireEvent.click(
			screen.getByRole("button", { name: /confirm withdrawal/i }),
		);
		expect(mockWithdraw).not.toHaveBeenCalled();
	});

	test("shows visual split with 93% and 7%", () => {
		renderModal();
		expect(screen.getByText(/You: 93%/)).toBeInTheDocument();
		expect(screen.getByText(/Fee: 7%/)).toBeInTheDocument();
	});

	test("renders network options", () => {
		renderModal();
		const select = screen.getByDisplayValue("TRC20");
		expect(select).toBeInTheDocument();
		fireEvent.change(select, { target: { value: "ERC20" } });
		expect(screen.getByDisplayValue("ERC20")).toBeInTheDocument();
	});

	test("renders fee breakdown text", () => {
		renderModal();
		expect(
			screen.getByText(/the 7% fee.*will be sent to the platform wallet/i),
		).toBeInTheDocument();
	});
});

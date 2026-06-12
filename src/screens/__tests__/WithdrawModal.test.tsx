// ============================================
// WITHDRAW MODAL TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { WithdrawModal } from "../WithdrawModal";
import type { InitialOperation } from "../../types";

const onClose = jest.fn();
const onWithdraw = jest.fn();

const depositOperation: InitialOperation = {
	type: "deposit",
	coin: "USDT",
	amount: 10000,
	time: 1700000000000,
};

const transferOperation: InitialOperation = {
	type: "transfer",
	coin: "USDT",
	amount: 5000,
	time: 1700000000000,
};

const renderModal = (
	overrides: {
		isOpen?: boolean;
		initialOperation?: InitialOperation | null;
		currentBalance?: number;
	} = {},
) =>
	render(
		<WithdrawModal
			isOpen={overrides.isOpen ?? true}
			onClose={onClose}
			initialOperation={
				overrides.initialOperation === undefined
					? depositOperation
					: overrides.initialOperation
			}
			currentBalance={overrides.currentBalance ?? 12500}
			onWithdraw={onWithdraw}
		/>,
	);

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

describe("WithdrawModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("does not render when isOpen is false", () => {
		renderModal({ isOpen: false });
		expect(
			screen.queryByRole("heading", { name: /withdraw profits/i }),
		).not.toBeInTheDocument();
	});

	// ── Spec: WithdrawModal shows real operation data (deposit) ──
	test("displays deposit operation label and amount from props", () => {
		renderModal({ initialOperation: depositOperation, currentBalance: 12500 });

		expect(screen.getByText("Depósito Inicial")).toBeInTheDocument();
		expect(screen.getByText("10000 USDT")).toBeInTheDocument();
	});

	// ── Triangulation: transfer operation produces a different label ──
	test("displays transfer operation label and amount from props", () => {
		renderModal({ initialOperation: transferOperation, currentBalance: 8000 });

		expect(screen.getByText("Transferencia Inicial")).toBeInTheDocument();
		expect(screen.getByText("5000 USDT")).toBeInTheDocument();
	});

	// ── Spec: WithdrawModal with no operation ──
	test("shows fallback label when initialOperation is null", () => {
		renderModal({ initialOperation: null, currentBalance: 12500 });

		expect(screen.getByText("Sin operación inicial")).toBeInTheDocument();
	});

	test("shows correct gross profit, fee, and net amount based on real props", () => {
		renderModal({ initialOperation: depositOperation, currentBalance: 12500 });
		// Gross = 12500 - 10000 = 2500
		expect(screen.getByText(/\+2,500\.00 USDT/)).toBeInTheDocument();
		// Fee = 2500 * 0.07 = 175
		expect(screen.getByText(/-175\.00 USDT/)).toBeInTheDocument();
		// Net = 2500 * 0.93 = 2325
		expect(screen.getByText(/2,325\.00 USDT/)).toBeInTheDocument();
	});

	// ── Triangulation: different prop values produce different math ──
	test("recalculates breakdown for a different currentBalance", () => {
		renderModal({ initialOperation: depositOperation, currentBalance: 15000 });
		// Gross = 15000 - 10000 = 5000
		expect(screen.getByText(/\+5,000\.00 USDT/)).toBeInTheDocument();
		// Fee = 5000 * 0.07 = 350
		expect(screen.getByText(/-350\.00 USDT/)).toBeInTheDocument();
		// Net = 5000 * 0.93 = 4650
		expect(screen.getByText(/4,650\.00 USDT/)).toBeInTheDocument();
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

	test("calls onWithdraw with gross profit and address on confirm", () => {
		jest.useFakeTimers();
		renderModal({ initialOperation: depositOperation, currentBalance: 12500 });

		fillFormAndSubmit();

		expect(onWithdraw).toHaveBeenCalledWith(2500, "0x1234567890abcdef");
		expect(screen.getByText(/Withdrawal Initiated/i)).toBeInTheDocument();

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

	test("does not call onWithdraw when checkboxes unchecked", () => {
		renderModal();
		fireEvent.click(
			screen.getByRole("button", { name: /confirm withdrawal/i }),
		);
		expect(onWithdraw).not.toHaveBeenCalled();
	});

	test("does not call onWithdraw when address is empty", () => {
		renderModal();
		const checkboxes = screen.getAllByRole("checkbox");
		fireEvent.click(checkboxes[0]);
		fireEvent.click(checkboxes[1]);
		fireEvent.click(
			screen.getByRole("button", { name: /confirm withdrawal/i }),
		);
		expect(onWithdraw).not.toHaveBeenCalled();
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

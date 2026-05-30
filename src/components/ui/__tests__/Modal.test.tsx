// ============================================
// MODAL COMPONENT TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../Modal";

describe("Modal", () => {
	test("renders children when open", () => {
		render(
			<Modal isOpen onClose={() => {}}>
				<div data-testid="modal-content">Content</div>
			</Modal>,
		);
		expect(screen.getByTestId("modal-content")).toBeInTheDocument();
	});

	test("does not render when closed", () => {
		render(
			<Modal isOpen={false} onClose={() => {}}>
				<div data-testid="modal-content">Content</div>
			</Modal>,
		);
		expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument();
	});

	test("calls onClose when backdrop is clicked", () => {
		const handleClose = jest.fn();
		render(
			<Modal isOpen onClose={handleClose}>
				<div>Content</div>
			</Modal>,
		);
		const backdrop = document.querySelector(".bg-black\\/50");
		if (backdrop) fireEvent.click(backdrop);
		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	test("applies custom maxWidth class", () => {
		const { container } = render(
			<Modal isOpen onClose={() => {}} maxWidth="max-w-2xl">
				<div>Content</div>
			</Modal>,
		);
		expect(container.querySelector(".max-w-2xl")).toBeInTheDocument();
	});
});

// ============================================
// SESSION WARNING MODAL TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { SessionWarningModal } from "../SessionWarningModal";

describe("SessionWarningModal", () => {
	const defaultProps = {
		isOpen: true,
		remainingSeconds: 25,
		onExtend: jest.fn(),
		onLogout: jest.fn(),
	};

	it("renders when open", () => {
		render(<SessionWarningModal {...defaultProps} />);
		expect(screen.getByText(/Sesión por expirar/i)).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(<SessionWarningModal {...defaultProps} isOpen={false} />);
		expect(screen.queryByText(/Sesión por expirar/i)).not.toBeInTheDocument();
	});

	it("shows remaining seconds", () => {
		render(<SessionWarningModal {...defaultProps} remainingSeconds={25} />);
		expect(screen.getByText("25s")).toBeInTheDocument();
	});

	it('calls onExtend when "Seguir conectado" is clicked', () => {
		const onExtend = jest.fn();
		render(<SessionWarningModal {...defaultProps} onExtend={onExtend} />);
		fireEvent.click(screen.getByText("Seguir conectado"));
		expect(onExtend).toHaveBeenCalledTimes(1);
	});

	it('calls onLogout when "Cerrar sesión ahora" is clicked', () => {
		const onLogout = jest.fn();
		render(<SessionWarningModal {...defaultProps} onLogout={onLogout} />);
		fireEvent.click(screen.getByText("Cerrar sesión ahora"));
		expect(onLogout).toHaveBeenCalledTimes(1);
	});

	it("clicking backdrop calls onExtend (extends session)", () => {
		const onExtend = jest.fn();
		const { container } = render(
			<SessionWarningModal {...defaultProps} onExtend={onExtend} />,
		);
		// The backdrop is the first child of the fixed inset div
		const backdrop = container.querySelector(".absolute.inset-0");
		expect(backdrop).toBeInTheDocument();
		fireEvent.click(backdrop!);
		expect(onExtend).toHaveBeenCalledTimes(1);
	});
});

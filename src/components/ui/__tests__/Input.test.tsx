// ============================================
// INPUT COMPONENT TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "../Input";

describe("Input", () => {
	test("renders with label", () => {
		render(<Input label="Email" value="" onChange={() => {}} />);
		expect(screen.getByText(/email/i)).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	test("calls onChange when typing", () => {
		const handleChange = jest.fn();
		render(<Input value="" onChange={handleChange} />);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "hello" },
		});
		expect(handleChange).toHaveBeenCalledWith("hello");
	});

	test("shows error message", () => {
		render(<Input value="" onChange={() => {}} error="Required field" />);
		expect(screen.getByText(/required field/i)).toBeInTheDocument();
	});

	test("shows helper text when no error", () => {
		render(
			<Input
				value=""
				onChange={() => {}}
				helper="Tip: use a strong password"
			/>,
		);
		expect(screen.getByText(/tip: use a strong password/i)).toBeInTheDocument();
	});

	test("toggles password visibility when masked", () => {
		render(<Input value="secret" onChange={() => {}} masked />);
		const input = screen.getByDisplayValue("secret");
		expect(input).toHaveAttribute("type", "password");

		fireEvent.click(screen.getByRole("button"));
		expect(input).toHaveAttribute("type", "text");

		fireEvent.click(screen.getByRole("button"));
		expect(input).toHaveAttribute("type", "password");
	});

	test("renders placeholder", () => {
		render(<Input value="" onChange={() => {}} placeholder="Enter email" />);
		expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
	});
});

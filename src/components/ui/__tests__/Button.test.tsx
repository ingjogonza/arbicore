// ============================================
// BUTTON COMPONENT TESTS
// ============================================

import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
	test("renders with children", () => {
		render(<Button>Click me</Button>);
		expect(
			screen.getByRole("button", { name: /click me/i }),
		).toBeInTheDocument();
	});

	test("calls onClick when clicked", () => {
		const handleClick = jest.fn();
		render(<Button onClick={handleClick}>Click me</Button>);
		fireEvent.click(screen.getByRole("button"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test("is disabled when disabled prop is true", () => {
		render(<Button disabled>Click me</Button>);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	test("renders as submit type", () => {
		render(<Button type="submit">Submit</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	test("applies variant and size classes", () => {
		const { container } = render(
			<Button variant="danger" size="lg">
				Delete
			</Button>,
		);
		const button = container.querySelector("button");
		expect(button).toHaveClass("bg-red-500");
		expect(button).toHaveClass("px-7");
	});
});

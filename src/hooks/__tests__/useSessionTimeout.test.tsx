// ============================================
// useSessionTimeout HOOK TESTS
// ============================================

import { renderHook, act } from "@testing-library/react";
import { useSessionTimeout } from "../useSessionTimeout";

const TIMEOUT = 10_000; // 10 s
const WARNING = 3_000; // 3 s before expiry

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(1_000_000_000_000);
});

afterEach(() => {
	jest.useRealTimers();
});

describe("useSessionTimeout", () => {
	it("does not show warning while user is active", () => {
		const onExpire = jest.fn();
		const { result } = renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		// Advance just below warning threshold
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - WARNING - 1_000);
		});

		expect(result.current.showWarning).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);
		expect(onExpire).not.toHaveBeenCalled();
	});

	it("shows warning after inactivity reaches threshold", () => {
		const onExpire = jest.fn();
		const { result } = renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		// Advance into warning zone
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - WARNING + 1_000);
		});

		expect(result.current.showWarning).toBe(true);
		expect(result.current.remainingSeconds).toBeGreaterThan(0);
		expect(onExpire).not.toHaveBeenCalled();
	});

	it("shows correct remaining seconds", () => {
		const onExpire = jest.fn();
		const { result } = renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		// Advance to just past warning threshold
		// At t=7_001, elapsed = 7_001, remaining = ceil((10_000 - 7_001)/1000) = 3
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - WARNING + 1);
		});

		expect(result.current.showWarning).toBe(true);
		expect(result.current.remainingSeconds).toBe(3);
	});

	it("calls onExpire after full inactivity timeout", () => {
		const onExpire = jest.fn();
		renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		// Advance to exactly the timeout (10th tick at t=10_000)
		act(() => {
			jest.advanceTimersByTime(TIMEOUT);
		});

		expect(onExpire).toHaveBeenCalledTimes(1);
	});

	it("extendSession resets the timer", () => {
		const onExpire = jest.fn();
		const { result } = renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		// Advance into warning zone
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - WARNING + 1_000);
		});

		expect(result.current.showWarning).toBe(true);

		// Extend session
		act(() => {
			result.current.extendSession();
		});

		expect(result.current.showWarning).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);

		// Advance past original expiry — should NOT fire because timer was reset
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - 1_000);
		});

		expect(onExpire).not.toHaveBeenCalled();
	});

	it("user activity resets the timer and dismisses warning", () => {
		const onExpire = jest.fn();
		const { result } = renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		// Advance into warning zone
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - WARNING + 1_000);
		});

		expect(result.current.showWarning).toBe(true);

		// Simulate activity (mousedown)
		act(() => {
			window.dispatchEvent(new MouseEvent("mousedown"));
		});

		expect(result.current.showWarning).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);

		// Advance past original expiry — should NOT fire
		act(() => {
			jest.advanceTimersByTime(TIMEOUT - 1_000);
		});

		expect(onExpire).not.toHaveBeenCalled();
	});

	it("cleans up interval on unmount", () => {
		const onExpire = jest.fn();
		const { unmount } = renderHook(() =>
			useSessionTimeout(onExpire, {
				inactivityTimeout: TIMEOUT,
				warningBefore: WARNING,
			}),
		);

		unmount();

		// Advance past timeout — should NOT fire because hook is unmounted
		act(() => {
			jest.advanceTimersByTime(TIMEOUT + 1_000);
		});

		expect(onExpire).not.toHaveBeenCalled();
	});
});

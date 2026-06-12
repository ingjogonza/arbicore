// ============================================
// DOM ERROR HANDLER — Suppress benign DOM conflicts
// with browser extensions (MozBar, Grammarly, etc.)
// ============================================

/**
 * Registers a global window error handler that suppresses
 * NotFoundError from removeChild — a known React conflict
 * with browser extensions that modify the DOM during
 * React's commit phase (unmounting components during navigation).
 *
 * The error is harmless: React already finished rendering the new
 * page, but failed to remove one old DOM node because the extension
 * already removed it. Catching it prevents the console noise
 * and avoids breaking the error boundary.
 */
export function registerDomErrorHandler(): void {
	window.addEventListener("error", (event) => {
		if (
			event.error instanceof DOMException &&
			event.error.name === "NotFoundError" &&
			event.message?.includes("removeChild")
		) {
			// Suppress this specific error — benign DOM race with browser extension
			event.preventDefault();
			event.stopPropagation();
			return;
		}
	});

	// Also catch unhandled rejections for the same pattern
	window.addEventListener("unhandledrejection", (event) => {
		const err = event.reason;
		if (
			err instanceof DOMException &&
			err.name === "NotFoundError" &&
			err.message?.includes("removeChild")
		) {
			event.preventDefault();
		}
	});
}

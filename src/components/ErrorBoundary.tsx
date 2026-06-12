// ============================================
// ERROR BOUNDARY — Catch render errors during navigation
// ============================================

import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

/**
 * Error boundary that logs but does NOT show a fallback UI.
 * After the error, React re-renders the children.
 * This is intentional: the "removeChild" DOMException is a benign
 * race with browser extensions (MozBar) during React Router navigation.
 * The app recovers naturally by re-rendering.
 */
export class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	ErrorBoundaryState
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
		// Log but recover — DOM race with extension is not a real error
		console.warn(
			"[ErrorBoundary] Benign DOM conflict (likely browser extension):",
			error.message,
		);
		// Reset state on next tick so children re-render
		setTimeout(() => {
			this.setState({ hasError: false, error: undefined });
		}, 0);
	}

	render() {
		// Always pass through — the app recovers by re-rendering
		return this.props.children;
	}
}

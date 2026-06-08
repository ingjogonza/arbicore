// ============================================
// ERROR BOUNDARY — Catch render errors during navigation
// ============================================

import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

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
		// Log error but keep the app running
		console.warn("[ErrorBoundary] Caught render error:", error.message);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
					<div className="text-center">
						<div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
							Something went wrong
						</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
							{this.state.error?.message || "Unexpected render error"}
						</p>
						<button
							onClick={() => {
								this.setState({ hasError: false, error: undefined });
								window.location.href = "/";
							}}
							className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
						>
							Reload app
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

// ============================================
// SAFE NAVIGATE — Fallback to full page reload
// when React Router navigation fails due to
// browser extension DOM conflicts
// ============================================

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Like `navigate()` but falls back to `window.location.href`
 * on NotFoundError during React Router navigation.
 *
 * This is needed because browser extensions (MozBar, Grammarly)
 * modify the DOM during React's commit phase, causing
 * "Failed to execute 'removeChild' on 'Node'" errors.
 * React Router's internal `navigate` triggers React reconciliation
 * which conflicts with these DOM modifications.
 *
 * When the error occurs, the ErrorBoundary resets and React
 * re-renders the Routes. At that point the URL is already set,
 * so the new route renders correctly.
 */
export function useSafeNavigate(): (to: string) => void {
	const navigate = useNavigate();

	return useCallback(
		(to: string) => {
			try {
				navigate(to, { replace: true });
			} catch {
				// Fallback: full page reload avoids React reconciliation
				window.location.href = to;
			}
		},
		[navigate],
	);
}

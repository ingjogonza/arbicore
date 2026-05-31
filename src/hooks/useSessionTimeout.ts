// ============================================
// USE SESSION TIMEOUT — inactivity logout hook
// ============================================
//
// Detecta inactividad del usuario y muestra una
// advertencia antes de expirar la sesión.
//
// Uso:
//   const { showWarning, remainingSeconds, extendSession } =
//     useSessionTimeout(logout, { inactivityTimeout: 15 * 60 * 1000 });
//

import { useState, useEffect, useRef, useCallback } from "react";

export interface SessionTimeoutOptions {
	/** Total inactivity time before logout (ms). Default: 15 min */
	inactivityTimeout?: number;
	/** How long before expiry to show warning (ms). Default: 30 s */
	warningBefore?: number;
}

const DEFAULT_OPTIONS: Required<SessionTimeoutOptions> = {
	inactivityTimeout: 15 * 60 * 1000,
	warningBefore: 30 * 1000,
};

type ActivityEvent = "mousedown" | "keydown" | "touchstart";

const ACTIVITY_EVENTS: ActivityEvent[] = ["mousedown", "keydown", "touchstart"];

export function useSessionTimeout(
	onExpire: () => void,
	options?: SessionTimeoutOptions,
) {
	const { inactivityTimeout, warningBefore } = {
		...DEFAULT_OPTIONS,
		...options,
	};

	const [showWarning, setShowWarning] = useState(false);
	const [remainingSeconds, setRemainingSeconds] = useState(0);

	// Store latest callback in ref so interval always calls the latest version
	const onExpireRef = useRef(onExpire);
	onExpireRef.current = onExpire;

	// Store last activity timestamp
	const lastActivityRef = useRef(Date.now());

	// Reset timer and hide warning
	const resetTimer = useCallback(() => {
		lastActivityRef.current = Date.now();
		setShowWarning(false);
		setRemainingSeconds(0);
	}, []);

	// — Activity listeners
	useEffect(() => {
		const handler = () => {
			lastActivityRef.current = Date.now();
			// If warning was showing, dismiss it (user is back)
			setShowWarning(false);
			setRemainingSeconds(0);
		};

		ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handler));

		return () => {
			ACTIVITY_EVENTS.forEach((event) =>
				window.removeEventListener(event, handler),
			);
		};
	}, []);

	// — Periodic check for inactivity
	useEffect(() => {
		const interval = setInterval(() => {
			const elapsed = Date.now() - lastActivityRef.current;

			if (elapsed >= inactivityTimeout) {
				onExpireRef.current();
				return;
			}

			if (elapsed >= inactivityTimeout - warningBefore) {
				const remaining = Math.ceil((inactivityTimeout - elapsed) / 1000);
				setRemainingSeconds(remaining);
				setShowWarning(true);
			}
		}, 1_000);

		return () => clearInterval(interval);
	}, [inactivityTimeout, warningBefore]);

	const extendSession = useCallback(() => {
		resetTimer();
	}, [resetTimer]);

	return { showWarning, remainingSeconds, extendSession };
}

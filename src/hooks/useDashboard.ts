// ============================================
// USE DASHBOARD HOOK — Fetch dashboard summary
// ============================================

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { env } from "../lib/env";
import type {
	DashboardSummaryData,
	DashboardSummaryResponse,
	DashboardError,
} from "../types";

interface UseDashboardReturn {
	data: DashboardSummaryData | null;
	loading: boolean;
	error: string | null;
	errors: DashboardError[];
	refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
	const { state } = useAuth();
	const [data, setData] = useState<DashboardSummaryData | null>(null);
	const [errors, setErrors] = useState<DashboardError[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchDashboard = useCallback(async () => {
		if (!state.session) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);
		setErrors([]);

		try {
			const API_BASE = env.VITE_API_BASE_URL || "http://localhost:3000";
			const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
				headers: {
					Authorization: `Bearer ${state.session.access_token}`,
				},
			});

			if (!res.ok) {
				if (res.status === 401) {
					setError("Authentication expired. Please log in again.");
				} else {
					setError(`Server error: ${res.status}`);
				}
				setData(null);
				return;
			}

			const result: DashboardSummaryResponse = await res.json();

			if (!result.success) {
				setError(
					result.errors?.[0]?.message || "Failed to load dashboard data",
				);
				setData(null);
				return;
			}

			setData(result.data);
			setErrors(result.errors ?? []);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Network error";
			setError(message);
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [state.session]);

	useEffect(() => {
		fetchDashboard();
	}, [fetchDashboard]);

	return { data, loading, error, errors, refetch: fetchDashboard };
}

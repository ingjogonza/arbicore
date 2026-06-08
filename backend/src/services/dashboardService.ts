// ============================================
// DASHBOARD DATA ORCHESTRATOR
// ============================================

import { getApiKeys } from "./keysService";
import {
	getAccount,
	getMyTrades,
	getAccountSnapshot,
	getDepositHistory,
} from "./binanceService";
import { NotFoundError } from "../utils/errors";
import type {
	DashboardBalance,
	DashboardTrade,
	DashboardEquityPoint,
	DashboardBotStatus,
	InitialBalance,
	BinanceAccountResponse,
	BinanceTradeResponse,
	BinanceSnapshotResponse,
	BinanceDeposit,
} from "../types/binance";

export interface DashboardError {
	source: "balances" | "trades" | "deposits" | "equity";
	message: string;
	code?: string;
}

export interface DashboardSummaryData {
	balances: DashboardBalance[] | null;
	trades: DashboardTrade[] | null;
	equityHistory: DashboardEquityPoint[] | null;
	botStatus: DashboardBotStatus;
	initialBalance: InitialBalance; // from first FDUSD deposit
}

export interface DashboardSummaryResult {
	data: DashboardSummaryData;
	errors: DashboardError[];
}

// ---- Pure mapping functions (exported for unit testing) ----

/**
 * Maps raw Binance account response to dashboard balance list.
 * Filters out zero-balance assets.
 */
export function mapBalances(
	account: BinanceAccountResponse,
): DashboardBalance[] {
	return account.balances
		.filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
		.map((b) => ({ asset: b.asset, free: b.free, locked: b.locked }));
}

/**
 * Maps raw Binance trade responses to dashboard trade list.
 */
export function mapTrades(trades: BinanceTradeResponse[]): DashboardTrade[] {
	return trades.map((t) => ({
		id: t.id,
		symbol: t.symbol,
		price: t.price,
		qty: t.qty,
		quoteQty: t.quoteQty,
		commission: t.commission,
		commissionAsset: t.commissionAsset,
		time: t.time,
		isBuyer: t.isBuyer,
		isMaker: t.isMaker,
	}));
}

/**
 * Maps raw Binance snapshot response to dashboard equity history.
 * Filters snapshots with no totalAssetOfBtc, sorts by time ascending.
 */
export function mapEquityHistory(
	snapshot: BinanceSnapshotResponse,
): DashboardEquityPoint[] {
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	const validSnapshots = snapshot.snapshotVos.filter(
		(s) => s.data.totalAssetOfBtc,
	);
	validSnapshots.sort((a, b) => a.time - b.time);

	return validSnapshots
		.map((s) => {
			const d = new Date(s.time);
			return {
				date: `${months[d.getMonth()]} ${d.getDate()}`,
				value: parseFloat(s.data.totalAssetOfBtc),
			};
		})
		.filter((p) => !Number.isNaN(p.value));
}

/**
 * Computes bot status from keys state.
 * In v1: if keys exist → active, strategy defaults to "Conservative Spot Trading".
 */
export function buildBotStatus(hasKeys: boolean): DashboardBotStatus {
	return {
		active: hasKeys,
		runningSince: null,
		strategy: "Conservative Spot Trading",
	};
}

// ---- Pure functions for deposits ----

/**
 * Computes initial balance from deposit history.
 * Uses the first completed FDUSD deposit as the initial investment.
 * Falls back to the first deposit of any coin if no FDUSD found.
 */
export function computeInitialBalance(
	deposits: BinanceDeposit[],
): InitialBalance {
	// Sort by time ascending
	const sorted = [...deposits].sort((a, b) => a.insertTime - b.insertTime);

	if (sorted.length === 0) return null;

	// Prefer first FDUSD deposit
	const firstFdusd = sorted.find((d) => d.coin === "FDUSD");
	if (firstFdusd) return firstFdusd.amount;

	// Fallback to first deposit of any coin
	return sorted[0].amount;
}

// ---- Orchestrator ----

/**
 * Main orchestrator — called by routes/dashboard.ts
 */
export async function getDashboardSummary(
	userId: string,
): Promise<DashboardSummaryResult> {
	const errors: DashboardError[] = [];

	// Step 1: Get user's API keys
	let apiKey: string;
	let secretKey: string;
	try {
		const keys = await getApiKeys(userId);
		apiKey = keys.apiKey;
		secretKey = keys.secretKey;
	} catch (err) {
		if (err instanceof NotFoundError) {
			return {
				data: {
					balances: null,
					trades: null,
					equityHistory: null,
					botStatus: buildBotStatus(false),
					initialBalance: null,
				},
				errors: [
					{
						source: "balances",
						message: "No API keys configured",
						code: "NO_API_KEYS",
					},
				],
			};
		}
		throw err; // Unexpected error — let error handler catch
	}

	// Step 2: Parallel Binance calls
	const [accountResult, tradesResult, snapshotResult, depositResult] =
		await Promise.allSettled([
			getAccount(apiKey, secretKey),
			getMyTrades(apiKey, secretKey, "BTCFDUSD", 20),
			getAccountSnapshot(apiKey, secretKey),
			getDepositHistory(apiKey, secretKey),
		]);

	// Step 3: Map balances
	let balances: DashboardBalance[] | null = null;
	if (accountResult.status === "fulfilled") {
		balances = mapBalances(accountResult.value);
	} else {
		errors.push({
			source: "balances",
			message: accountResult.reason?.message || "Failed to fetch account",
		});
	}

	// Step 4: Map trades
	let trades: DashboardTrade[] | null = null;
	if (tradesResult.status === "fulfilled") {
		trades = mapTrades(tradesResult.value);
	} else {
		errors.push({
			source: "trades",
			message: tradesResult.reason?.message || "Failed to fetch trades",
		});
	}

	// Step 5: Map equity history from snapshots
	let equityHistory: DashboardEquityPoint[] | null = null;
	if (snapshotResult.status === "fulfilled") {
		equityHistory = mapEquityHistory(snapshotResult.value);
	} else {
		// 404 from accountSnapshot means daily snapshots not enabled.
		// This is common — silently return null instead of showing an error.
		const msg = snapshotResult.reason?.message || "";
		if (!msg.includes("404") && !msg.includes("Daily account snapshot")) {
			errors.push({
				source: "equity",
				message: msg || "Failed to fetch snapshots",
			});
		}
	}

	// Step 6: Compute initial balance from deposits
	let initialBalance: InitialBalance = null;
	if (depositResult.status === "fulfilled") {
		initialBalance = computeInitialBalance(depositResult.value);
	} else {
		const msg = depositResult.reason?.message || "";
		// Only add error for non-404 failures (permissions, rate limits, etc.)
		if (!msg.includes("404")) {
			errors.push({
				source: "deposits",
				message: msg || "Failed to fetch deposit history",
			});
		}
	}

	// Step 7: Compute bot status
	const botStatus = buildBotStatus(true); // Keys exist → bot is considered active

	return {
		data: { balances, trades, equityHistory, botStatus, initialBalance },
		errors,
	};
}

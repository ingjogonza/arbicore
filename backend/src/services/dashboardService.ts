// ============================================
// DASHBOARD DATA ORCHESTRATOR
// ============================================

import { getApiKeys } from "./keysService";
import {
	getAccount,
	getMyTrades,
	getAccountSnapshot,
	getDepositHistory,
	getTransferHistory,
	getSubAccountTransferHistory,
} from "./binanceService";
import { cacheGet, cacheSet } from "./cacheService";
import { NotFoundError } from "../utils/errors";
import {
	STABLECOINS,
} from "../types/binance";
import type {
	DashboardBalance,
	DashboardTrade,
	DashboardEquityPoint,
	DashboardBotStatus,
	CumulativeDeposits,
	BinanceAccountResponse,
	BinanceTradeResponse,
	BinanceSnapshotResponse,
	BinanceDeposit,
	BinanceTransfer,
} from "../types/binance";

/** Transfer sources to query in parallel for cumulative-deposits detection. */
const TRANSFER_SOURCES = [
	{ name: "MAIN_UMFUTURE", call: (k: string, s: string) => getTransferHistory(k, s, "MAIN_UMFUTURE") },
	{ name: "MAIN_FUNDING", call: (k: string, s: string) => getTransferHistory(k, s, "MAIN_FUNDING") },
	{ name: "sub-account-received", call: (k: string, s: string) => getSubAccountTransferHistory(k, s) },
] as const;

export interface DashboardError {
	source: "balances" | "trades" | "deposits" | "transfers" | "equity";
	message: string;
	code?: string;
}

export interface DashboardSummaryData {
	balances: DashboardBalance[] | null;
	trades: DashboardTrade[] | null;
	equityHistory: DashboardEquityPoint[] | null;
	botStatus: DashboardBotStatus;
	/** Per-coin cumulative deposits. Empty when no deposits detected. */
	cumulativeDeposits: CumulativeDeposits;
	/**
	 * Sum of stablecoin deposits (USDT + FDUSD + USDC). Represents the user's
	 * seed capital in USD-equivalent terms. Falls back to current account
	 * balance when no stablecoin deposits are detected.
	 */
	totalStablecoinDepositedUSD: number;
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
	validSnapshots.sort((a, b) => a.updateTime - b.updateTime);

	return validSnapshots
		.map((s) => {
			const d = new Date(s.updateTime);
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

// ---- Pure functions for deposits & transfers ----

/**
 * Aggregates the cumulative amount of deposits and incoming transfers grouped by coin.
 *
 * Per the `total-deposited-detection` spec:
 * - Sums deposits with status=1 (success) and status=6 (credited).
 * - Excludes pending deposits (status=0).
 * - Sums incoming transfers from fan-out sources.
 * - Returns `{}` when both sources are empty or undefined.
 */
export function computeTotalDeposited(
	deposits: BinanceDeposit[],
	transfers?: BinanceTransfer[],
): CumulativeDeposits {
	const totals: CumulativeDeposits = {};

	for (const d of deposits) {
		if (d.status === 0) continue; // Exclude pending
		const amount = parseFloat(d.amount);
		if (Number.isNaN(amount)) continue;
		totals[d.coin] = (totals[d.coin] ?? 0) + amount;
	}

	for (const t of transfers ?? []) {
		const amount = parseFloat(t.amount);
		if (Number.isNaN(amount)) continue;
		totals[t.asset] = (totals[t.asset] ?? 0) + amount;
	}

	return totals;
}

// ---- Orchestrator ----

/**
 * Main orchestrator — called by routes/dashboard.ts
 * Results are cached in MongoDB for 30s to avoid Binance rate limits.
 */
export async function getDashboardSummary(
	userId: string,
): Promise<DashboardSummaryResult> {
	const errors: DashboardError[] = [];
	const CACHE_TTL = 30; // seconds

	// Check cache first
	const cached = await cacheGet<DashboardSummaryResult>(`dashboard:${userId}`);
	if (cached) return cached;

	// Step 1: Get user's API keys
	let apiKey: string;
	let secretKey: string;
	try {
		const keys = await getApiKeys(userId);
		apiKey = keys.apiKey;
		secretKey = keys.secretKey;
	} catch (err) {
		if (err instanceof NotFoundError) {
			const result: DashboardSummaryResult = {
				data: {
					balances: null,
					trades: null,
					equityHistory: null,
					botStatus: buildBotStatus(false),
					cumulativeDeposits: {},
					totalStablecoinDepositedUSD: 0,
				},
				errors: [
					{
						source: "balances",
						message: "No API keys configured",
						code: "NO_API_KEYS",
					},
				],
			};
			return result;
		}
		throw err; // Unexpected error — let error handler catch
	}

	// Step 2: Parallel Binance calls (non-transfer sources + transfer fan-out)
	const [
		accountResult,
		tradesResult,
		snapshotResult,
		depositResult,
		...transferResults
	] = await Promise.allSettled([
		getAccount(apiKey, secretKey),
		getMyTrades(apiKey, secretKey, "BTCFDUSD", 20),
		getAccountSnapshot(apiKey, secretKey),
		getDepositHistory(apiKey, secretKey),
		...TRANSFER_SOURCES.map((src) => src.call(apiKey, secretKey)),
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

	// Step 6: Aggregate cumulative deposits and incoming transfers per coin.
	// Transfer sources degrade gracefully: if any source fails (e.g.
	// missing permission), we log a warning and continue with other sources.
	const deposits: BinanceDeposit[] =
		depositResult.status === "fulfilled" ? depositResult.value : [];

	if (depositResult.status === "rejected") {
		const msg = depositResult.reason?.message || "";
		if (!msg.includes("404")) {
			errors.push({
				source: "deposits",
				message: msg || "Failed to fetch deposit history",
			});
		}
	}

	const allTransfers: BinanceTransfer[] = [];
	for (let i = 0; i < transferResults.length; i++) {
		const result = transferResults[i];
		if (result.status === "fulfilled") {
			allTransfers.push(...result.value);
		} else {
			console.warn(
				`[Dashboard] ${TRANSFER_SOURCES[i].name} transfer source failed: ${result.reason?.message || "unknown"}`,
			);
		}
	}

	const cumulativeDeposits: CumulativeDeposits = computeTotalDeposited(
		deposits,
		allTransfers,
	);

	// Derive totalStablecoinDepositedUSD for KPI math chain. Sums USDT + FDUSD
	// + USDC (treated as 1:1 with USD). Falls back to current account balance
	// when no stablecoin deposits are detected, preserving the existing KPI
	// math (grossProfit, performance%) which depends on a positive baseline.
	const stablecoinSum = STABLECOINS.reduce(
		(sum, coin) => sum + (cumulativeDeposits[coin] ?? 0),
		0,
	);

	const fallbackBalance =
		balances?.reduce((sum, b) => {
			const v = parseFloat(b.free) + parseFloat(b.locked);
			return sum + (Number.isNaN(v) ? 0 : v);
		}, 0) ?? 0;

	const totalStablecoinDepositedUSD =
		stablecoinSum > 0 ? stablecoinSum : fallbackBalance;

	// Step 7: Compute bot status
	const botStatus = buildBotStatus(true); // Keys exist → bot is considered active

	const result: DashboardSummaryResult = {
		data: {
			balances,
			trades,
			equityHistory,
			botStatus,
			cumulativeDeposits,
			totalStablecoinDepositedUSD,
		},
		errors,
	};

	// Cache result (best-effort, don't block response)
	await cacheSet(`dashboard:${userId}`, result, CACHE_TTL).catch(() => {});

	return result;
}

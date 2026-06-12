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
} from "./binanceService";
import { cacheGet, cacheSet } from "./cacheService";
import { NotFoundError } from "../utils/errors";
import type {
	DashboardBalance,
	DashboardTrade,
	DashboardEquityPoint,
	DashboardBotStatus,
	InitialOperation,
	BinanceAccountResponse,
	BinanceTradeResponse,
	BinanceSnapshotResponse,
	BinanceDeposit,
	BinanceTransfer,
} from "../types/binance";

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
	/** Earliest funding operation (deposit or transfer); null when none found. */
	initialBalance: InitialOperation | null;
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
 * Internal unified shape for sorting deposits and transfers together.
 */
interface CandidateOperation {
	type: "deposit" | "transfer";
	coin: string;
	amount: number;
	time: number;
}

/**
 * Computes the earliest account funding operation across deposits and transfers.
 *
 * Per the `initial-operation-detection` spec:
 * - Merges deposits and transfers, normalizes to a unified shape, and returns
 *   the single earliest one by timestamp.
 * - If `transfers` is undefined (transfer API unavailable) or empty, falls back
 *   to deposits only — graceful degradation, no error propagation.
 * - Returns `null` when both sources are empty.
 */
export function computeInitialBalance(
	deposits: BinanceDeposit[],
	transfers?: BinanceTransfer[],
): InitialOperation | null {
	const candidates: CandidateOperation[] = [];

	for (const d of deposits) {
		const amount = parseFloat(d.amount);
		if (Number.isNaN(amount)) continue;
		candidates.push({
			type: "deposit",
			coin: d.coin,
			amount,
			time: d.insertTime,
		});
	}

	for (const t of transfers ?? []) {
		const amount = parseFloat(t.amount);
		if (Number.isNaN(amount)) continue;
		candidates.push({
			type: "transfer",
			coin: t.asset,
			amount,
			time: t.timestamp,
		});
	}

	if (candidates.length === 0) return null;

	candidates.sort((a, b) => a.time - b.time);
	return candidates[0];
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
			return result;
		}
		throw err; // Unexpected error — let error handler catch
	}

	// Step 2: Parallel Binance calls
	const [
		accountResult,
		tradesResult,
		snapshotResult,
		depositResult,
		transferResult,
	] = await Promise.allSettled([
		getAccount(apiKey, secretKey),
		getMyTrades(apiKey, secretKey, "BTCFDUSD", 20),
		getAccountSnapshot(apiKey, secretKey),
		getDepositHistory(apiKey, secretKey),
		getTransferHistory(apiKey, secretKey),
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

	// Step 6: Compute earliest funding operation from deposits + transfers.
	// Transfers degrade gracefully: if the endpoint fails (e.g. missing
	// permission), we log a warning and fall back to deposits only.
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

	let transfers: BinanceTransfer[] | undefined;
	if (transferResult.status === "fulfilled") {
		transfers = transferResult.value;
	} else {
		transfers = undefined;
		const msg = transferResult.reason?.message || "";
		console.warn(
			`[Dashboard] Transfer history unavailable, falling back to deposits only: ${msg}`,
		);
	}

	const initialBalance: InitialOperation | null = computeInitialBalance(
		deposits,
		transfers,
	);

	// Step 7: Compute bot status
	const botStatus = buildBotStatus(true); // Keys exist → bot is considered active

	const result: DashboardSummaryResult = {
		data: { balances, trades, equityHistory, botStatus, initialBalance },
		errors,
	};

	// Cache result (fire-and-forget, ignore errors)
	cacheSet(`dashboard:${userId}`, result, CACHE_TTL).catch(() => {});

	return result;
}

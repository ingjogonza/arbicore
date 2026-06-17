// ============================================
// BINANCE API CLIENT (low-level HTTPS calls)
// ============================================

import https from "https";
import { buildSignedUrl } from "../utils/binanceAuth";
import type {
	BinanceAccountResponse,
	BinanceTradeResponse,
	BinanceSnapshotResponse,
} from "../types/binance";

const BINANCE_BASE = "https://api.binance.com";

// Retry configuration for 429 (rate limit) errors
const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 2000;

/**
 * Checks if an error message indicates a 429 rate limit.
 */
function isRateLimitError(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.message.includes("429") || error.message.includes("-1003"))
	);
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic HTTPS GET with Binance auth headers.
 * Retries with exponential backoff on 429 rate limit errors.
 */
async function binanceGet<T>(
	path: string,
	query: Record<string, string | number>,
	apiKey: string,
	secretKey: string,
	attempt: number = 1,
): Promise<T> {
	try {
		return await new Promise<T>((resolve, reject) => {
			const { url } = buildSignedUrl(BINANCE_BASE, path, query, secretKey);
			const parsedUrl = new URL(url);

			const req = https.get(
				{
					hostname: parsedUrl.hostname,
					path: parsedUrl.pathname + parsedUrl.search,
					headers: {
						"X-MBX-APIKEY": apiKey,
					},
					timeout: 15000,
				},
				(res) => {
					let data = "";
					res.on("data", (chunk) => (data += chunk));
					res.on("end", () => {
						if (
							res.statusCode &&
							res.statusCode >= 200 &&
							res.statusCode < 300
						) {
							try {
								resolve(JSON.parse(data) as T);
							} catch {
								reject(
									new Error(`Invalid JSON from Binance: ${data.slice(0, 200)}`),
								);
							}
						} else {
							reject(
								new Error(
									`Binance API ${res.statusCode}: ${data.slice(0, 200)}`,
								),
							);
						}
					});
				},
			);

			req.on("error", reject);
			req.on("timeout", () => {
				req.destroy();
				reject(new Error("Binance API timeout"));
			});
		});
	} catch (err) {
		if (isRateLimitError(err) && attempt <= MAX_RETRIES) {
			const delay = INITIAL_DELAY_MS * 2 ** (attempt - 1);
			console.warn(
				`[Binance] Rate limited on ${path}, retry ${attempt}/${MAX_RETRIES} after ${delay}ms`,
			);
			await sleep(delay);
			return binanceGet(path, query, apiKey, secretKey, attempt + 1);
		}
		throw err;
	}
}

/**
 * GET /api/v3/account — returns all spot balances.
 */
export async function getAccount(
	apiKey: string,
	secretKey: string,
): Promise<BinanceAccountResponse> {
	return binanceGet<BinanceAccountResponse>(
		"/api/v3/account",
		{},
		apiKey,
		secretKey,
	);
}

/**
 * GET /api/v3/myTrades — returns recent trades for a symbol.
 */
export async function getMyTrades(
	apiKey: string,
	secretKey: string,
	symbol: string = "BTCFDUSD",
	limit: number = 20,
): Promise<BinanceTradeResponse[]> {
	return binanceGet<BinanceTradeResponse[]>(
		"/api/v3/myTrades",
		{ symbol, limit },
		apiKey,
		secretKey,
	);
}

/**
 * GET /sapi/v1/accountSnapshot?type=SPOT — returns historical balance snapshots.
 *
 * Note: This is a SAPI (Wallet API) endpoint, not /api/v3.
 * Requires the API key to have Spot & Margin Trading permission enabled.
 * Returns 404 if the account hasn't enabled daily snapshots.
 */
export async function getAccountSnapshot(
	apiKey: string,
	secretKey: string,
): Promise<BinanceSnapshotResponse> {
	return binanceGet<BinanceSnapshotResponse>(
		"/sapi/v1/accountSnapshot",
		{ type: "SPOT" },
		apiKey,
		secretKey,
	);
}

import type { BinanceDeposit, BinanceTransfer } from "../types/binance";

/**
 * GET /sapi/v1/capital/deposit/hisrec — returns deposit history.
 * Issues parallel calls for status=1 (success) and status=6 (credited)
 * and concatenates results. If one status call fails, the other is still
 * returned so the caller can degrade gracefully.
 * When no coin filter is provided, returns deposits for all coins.
 */
export async function getDepositHistory(
	apiKey: string,
	secretKey: string,
	coin?: string,
): Promise<BinanceDeposit[]> {
	const baseQuery: Record<string, string | number> = {};
	if (coin) baseQuery.coin = coin;

	const [status1, status6] = await Promise.allSettled([
		binanceGet<BinanceDeposit[]>(
			"/sapi/v1/capital/deposit/hisrec",
			{ ...baseQuery, status: 1 },
			apiKey,
			secretKey,
		),
		binanceGet<BinanceDeposit[]>(
			"/sapi/v1/capital/deposit/hisrec",
			{ ...baseQuery, status: 6 },
			apiKey,
			secretKey,
		),
	]);

	const results: BinanceDeposit[] = [];
	if (status1.status === "fulfilled") results.push(...(status1.value ?? []));
	if (status6.status === "fulfilled") results.push(...(status6.value ?? []));
	return results;
}

/** Wrapper shape returned by /sapi/v1/asset/transfer. */
interface BinanceTransferResponse {
	total: number;
	rows: BinanceTransfer[];
}

/**
 * GET /sapi/v1/asset/transfer — returns universal transfer history.
 *
 * Binance requires the `type` parameter for this endpoint. We query the most
 * common transfer flow (`MAIN_UMFUTURE`); callers that need other types can
 * pass a different value. The API key needs the "Universal Transfer" permission;
 * if missing, the endpoint returns an error and callers should degrade gracefully.
 */
export async function getTransferHistory(
	apiKey: string,
	secretKey: string,
	type: string = "MAIN_UMFUTURE",
): Promise<BinanceTransfer[]> {
	const response = await binanceGet<BinanceTransferResponse>(
		"/sapi/v1/asset/transfer",
		{ type },
		apiKey,
		secretKey,
	);
	return response?.rows ?? [];
}

/**
 * GET /sapi/v1/sub-account/transfer/subUserHistory — returns sub-account
 * internal transfer history. FDUSD internal/sub-account transfers populate
 * this endpoint, not the universal-transfer endpoint with MAIN_UMFUTURE.
 *
 * Requires "Sub-account Transfer" API key permission. If missing, the caller
 * should degrade gracefully (the dashboard fan-out handles this).
 */
export async function getSubAccountTransferHistory(
	apiKey: string,
	secretKey: string,
): Promise<BinanceTransfer[]> {
	const response = await binanceGet<BinanceTransferResponse>(
		"/sapi/v1/sub-account/transfer/subUserHistory",
		{},
		apiKey,
		secretKey,
	);
	return response?.rows ?? [];
}

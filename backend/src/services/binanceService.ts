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

/**
 * Generic HTTPS GET with Binance auth headers.
 * Returns parsed JSON on 2xx, rejects with Error otherwise.
 */
function binanceGet<T>(
	path: string,
	query: Record<string, string | number>,
	apiKey: string,
	secretKey: string,
): Promise<T> {
	return new Promise((resolve, reject) => {
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
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							resolve(JSON.parse(data) as T);
						} catch {
							reject(
								new Error(`Invalid JSON from Binance: ${data.slice(0, 200)}`),
							);
						}
					} else {
						reject(
							new Error(`Binance API ${res.statusCode}: ${data.slice(0, 200)}`),
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

// ============================================
// BINANCE API AUTH UTILS (HMAC-SHA256 SIGNING)
// ============================================

import { createHmac } from "crypto";

/**
 * Builds the HMAC-SHA256 signature required by Binance REST APIs.
 *
 * Binance expects the signature over the full request line:
 *   ${METHOD} ${PATH}?${QUERY_STRING}
 *
 * @param method    HTTP method (GET, POST, etc.)
 * @param path      API path, e.g. '/api/v3/account'
 * @param query     Query string (may be empty for SIGNED endpoints)
 * @param secretKey Binance secret key (decrypted)
 * @returns hex-encoded signature string to append as &signature=...
 */
export function buildSignature(
	method: string,
	path: string,
	query: string,
	secretKey: string,
): string {
	const signPayload = query
		? `${method} ${path}?${query}`
		: `${method} ${path}`;
	return createHmac("sha256", secretKey).update(signPayload).digest("hex");
}

/**
 * Builds a complete Binance signed request URL with timestamp + signature.
 *
 * @param baseUrl   e.g. 'https://api.binance.com'
 * @param path      API path, e.g. '/api/v3/account'
 * @param query     Optional query parameters (e.g. { symbol: 'BTCFDUSD', limit: 20 })
 * @param secretKey Binance secret key
 * @returns Object with url (full signed URL) and headers (empty for GET, X-MBX-APIKEY added at call site)
 */
export function buildSignedUrl(
	baseUrl: string,
	path: string,
	query: Record<string, string | number> | undefined,
	secretKey: string,
): { url: string; headers: Record<string, string> } {
	const timestamp = Date.now();
	const params = new URLSearchParams({
		timestamp: String(timestamp),
	});

	if (query) {
		for (const [key, value] of Object.entries(query)) {
			params.append(key, String(value));
		}
	}

	const queryString = params.toString();
	const signature = buildSignature("GET", path, queryString, secretKey);

	return {
		url: `${baseUrl}${path}?${queryString}&signature=${signature}`,
		headers: {},
	};
}

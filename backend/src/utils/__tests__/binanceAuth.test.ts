// ============================================
// BINANCE AUTH UTILS TESTS
// ============================================

import { describe, it } from "node:test";
import assert from "node:assert";
import { createHmac } from "crypto";

// We import the functions we're going to test
// RED phase: these imports will fail until we create the module
import { buildSignature, buildSignedUrl } from "../binanceAuth";

describe("binanceAuth", () => {
	describe("buildSignature", () => {
		it("should produce correct HMAC-SHA256 hex digest for known inputs", () => {
			// Known test vector:
			// method=GET, path=/api/v3/account, query='', secret=testsecret
			const secret = "testsecret";
			const method = "GET";
			const path = "/api/v3/account";
			const query = "";

			// Compute expected using Node.js crypto directly
			const payload = `${method} ${path}${query ? "?" + query : ""}`;
			const expected = createHmac("sha256", secret)
				.update(payload)
				.digest("hex");

			const result = buildSignature(method, path, query, secret);

			assert.strictEqual(result, expected);
		});

		it("should include query string in signature payload", () => {
			const secret = "testsecret";
			const method = "GET";
			const path = "/api/v3/myTrades";
			const query = "symbol=BTCFDUSD&limit=20";

			const payload = `${method} ${path}?${query}`;
			const expected = createHmac("sha256", secret)
				.update(payload)
				.digest("hex");

			const result = buildSignature(method, path, query, secret);

			assert.strictEqual(result, expected);
		});

		it("should produce different signatures for different secrets", () => {
			const sig1 = buildSignature("GET", "/api/v3/account", "", "secretA");
			const sig2 = buildSignature("GET", "/api/v3/account", "", "secretB");

			assert.notStrictEqual(sig1, sig2);
		});

		it("should produce different signatures for different paths", () => {
			const sig1 = buildSignature("GET", "/api/v3/account", "", "secret");
			const sig2 = buildSignature("GET", "/api/v3/myTrades", "", "secret");

			assert.notStrictEqual(sig1, sig2);
		});
	});

	describe("buildSignedUrl", () => {
		it("should return a URL containing timestamp and signature", () => {
			const baseUrl = "https://api.binance.com";
			const path = "/api/v3/account";
			const query: Record<string, string | number> = {};
			const secret = "testsecret";

			const result = buildSignedUrl(baseUrl, path, query, secret);

			assert.ok(result.url.startsWith(`${baseUrl}${path}?`));
			assert.ok(result.url.includes("timestamp="));
			assert.ok(result.url.includes("&signature="));

			// Extract timestamp and validate it's a recent number
			const urlObj = new URL(result.url);
			const ts = parseInt(urlObj.searchParams.get("timestamp")!, 10);
			const now = Date.now();
			assert.ok(ts <= now && ts >= now - 5000, "timestamp should be recent");
		});

		it("should include provided query params in the URL", () => {
			const baseUrl = "https://api.binance.com";
			const path = "/api/v3/myTrades";
			const query: Record<string, string | number> = {
				symbol: "BTCFDUSD",
				limit: 20,
			};
			const secret = "testsecret";

			const result = buildSignedUrl(baseUrl, path, query, secret);

			assert.ok(result.url.includes("symbol=BTCFDUSD"));
			assert.ok(result.url.includes("limit=20"));
			assert.ok(result.url.includes("timestamp="));
			assert.ok(result.url.includes("&signature="));
		});

		it("should handle undefined query gracefully", () => {
			const baseUrl = "https://api.binance.com";
			const path = "/api/v3/account";
			const secret = "testsecret";

			const result = buildSignedUrl(baseUrl, path, undefined, secret);

			assert.ok(result.url.startsWith(`${baseUrl}${path}?`));
			assert.ok(result.url.includes("timestamp="));
			assert.ok(result.url.includes("&signature="));
		});
	});
});

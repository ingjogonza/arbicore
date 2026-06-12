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
		it("should sign empty query string (HMAC of '')", () => {
			const secret = "testsecret";
			const result = buildSignature("GET", "/api/v3/account", "", secret);

			const expected = createHmac("sha256", secret).update("").digest("hex");

			assert.strictEqual(result, expected);
		});

		it("should sign only the query string (Binance spec)", () => {
			const secret = "testsecret";
			const query = "symbol=BTCFDUSD&limit=20&timestamp=1234567890123";

			// Binance expects signature over the query string ONLY:
			//   echo -n "symbol=BTCFDUSD&limit=20&timestamp=1234567890123" | openssl dgst -sha256 -hmac "testsecret"
			const expected = createHmac("sha256", secret).update(query).digest("hex");

			const result = buildSignature("GET", "/api/v3/myTrades", query, secret);

			assert.strictEqual(
				result,
				expected,
				"Build MUST NOT include method or path in the payload",
			);
		});

		it("should match Binance official test vector", () => {
			// From Binance docs:
			// secretKey = "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j"
			// payload = "symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559"
			// signature = c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71
			const secret =
				"NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j";
			const query =
				"symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559";
			const expected =
				"c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71";

			const result = buildSignature("POST", "/api/v3/order", query, secret);

			assert.strictEqual(
				result,
				expected,
				"Must match Binance official example — method and path must NOT be part of the signature payload",
			);
		});

		it("should produce different signatures for different secrets", () => {
			const sig1 = buildSignature("GET", "/api/v3/account", "", "secretA");
			const sig2 = buildSignature("GET", "/api/v3/account", "", "secretB");

			assert.notStrictEqual(sig1, sig2);
		});

		it("should produce different signatures for different query strings", () => {
			const sig1 = buildSignature(
				"GET",
				"/api/v3/account",
				"timestamp=100",
				"secret",
			);
			const sig2 = buildSignature(
				"GET",
				"/api/v3/account",
				"timestamp=200",
				"secret",
			);

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

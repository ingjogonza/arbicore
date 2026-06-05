// ============================================
// BINANCE SERVICE TESTS (mocked https)
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import https from "https";
import { EventEmitter } from "events";

// RED phase: import will fail until module exists
import { getAccount, getMyTrades, getAccountSnapshot } from "../binanceService";

/**
 * Helper: creates a mock IncomingMessage that emits data + end.
 */
function createMockResponse(
	statusCode: number,
	body: unknown,
): EventEmitter & { statusCode: number } {
	const res = new EventEmitter() as EventEmitter & { statusCode: number };
	res.statusCode = statusCode;
	// Emit data + end on next tick so listeners can attach
	process.nextTick(() => {
		res.emit("data", typeof body === "string" ? body : JSON.stringify(body));
		res.emit("end");
	});
	return res;
}

describe("binanceService", () => {
	let originalGet: typeof https.get;

	before(() => {
		originalGet = https.get;
	});

	after(() => {
		https.get = originalGet;
	});

	describe("getAccount", () => {
		it("should call the correct Binance endpoint and parse response", async () => {
			const mockBalances = {
				makerCommission: 10,
				takerCommission: 10,
				buyerCommission: 0,
				sellerCommission: 0,
				canTrade: true,
				canWithdraw: true,
				canDeposit: true,
				updateTime: 1700000000000,
				accountType: "SPOT",
				balances: [
					{ asset: "BTC", free: "1.5", locked: "0.0" },
					{ asset: "FDUSD", free: "50000.0", locked: "100.0" },
					{ asset: "ETH", free: "0.0", locked: "0.0" },
				],
				permissions: ["SPOT"],
			};

			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const url =
					typeof urlOrOpts === "string"
						? urlOrOpts
						: ((urlOrOpts as any)?.path ?? "");
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				// Verify URL and headers
				assert.ok(
					urlStr.includes("/api/v3/account"),
					`URL should include /api/v3/account, got ${urlStr}`,
				);
				assert.ok(
					urlStr.includes("timestamp="),
					"URL should include timestamp",
				);
				assert.ok(
					urlStr.includes("signature="),
					"URL should include signature",
				);

				const headers =
					typeof urlOrOpts === "object" ? (urlOrOpts as any)?.headers : {};
				assert.strictEqual(
					headers["X-MBX-APIKEY"],
					"test-api-key",
					"Should include X-MBX-APIKEY header",
				);

				if (callback) {
					callback(createMockResponse(200, mockBalances));
				}

				return createMockResponse(200, mockBalances) as any;
			}) as typeof https.get;

			const result = await getAccount("test-api-key", "test-secret-key");

			assert.strictEqual(result.makerCommission, 10);
			assert.strictEqual(result.balances.length, 3);
			assert.strictEqual(result.balances[0].asset, "BTC");
		});

		it("should reject with an error on HTTP error status", async () => {
			https.get = ((_url: unknown, callback?: (res: unknown) => void) => {
				const res = createMockResponse(401, "Unauthorized");
				if (callback) callback(res);
				return res as any;
			}) as typeof https.get;

			await assert.rejects(
				() => getAccount("bad-key", "bad-secret"),
				/Binance API 401/,
			);
		});
	});

	describe("getMyTrades", () => {
		it("should call binance with default symbol and limit", async () => {
			const mockTrades = [
				{
					id: 1,
					symbol: "BTCFDUSD",
					orderId: 100,
					orderListId: -1,
					price: "50000.00",
					qty: "0.01",
					quoteQty: "500.00",
					commission: "0.50",
					commissionAsset: "FDUSD",
					time: 1700000000000,
					isBuyer: true,
					isMaker: false,
					isBestMatch: true,
				},
			];

			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				assert.ok(
					urlStr.includes("/api/v3/myTrades"),
					"URL should include /api/v3/myTrades",
				);
				assert.ok(
					urlStr.includes("symbol=BTCFDUSD"),
					"URL should include default symbol",
				);
				assert.ok(
					urlStr.includes("limit=20"),
					"URL should include default limit",
				);

				if (callback) callback(createMockResponse(200, mockTrades));
				return createMockResponse(200, mockTrades) as any;
			}) as typeof https.get;

			const result = await getMyTrades("test-api-key", "test-secret-key");

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].symbol, "BTCFDUSD");
			assert.strictEqual(result[0].isBuyer, true);
		});
	});

	describe("getAccountSnapshot", () => {
		it("should call binance with type=SPOT", async () => {
			const mockSnapshot = {
				code: 200,
				msg: "",
				snapshotVos: [
					{
						time: 1700000000000,
						data: {
							balances: [
								{
									asset: "BTC",
									totalAsset: "1.5",
									freeAsset: "1.5",
									lockedAsset: "0.0",
								},
								{
									asset: "FDUSD",
									totalAsset: "50100.0",
									freeAsset: "50000.0",
									lockedAsset: "100.0",
								},
							],
							totalAssetOfBtc: "1.8",
						},
					},
				],
			};

			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				assert.ok(
					urlStr.includes("/api/v3/accountSnapshot"),
					"URL should include /api/v3/accountSnapshot",
				);
				assert.ok(urlStr.includes("type=SPOT"), "URL should include type=SPOT");

				if (callback) callback(createMockResponse(200, mockSnapshot));
				return createMockResponse(200, mockSnapshot) as any;
			}) as typeof https.get;

			const result = await getAccountSnapshot(
				"test-api-key",
				"test-secret-key",
			);

			assert.strictEqual(result.code, 200);
			assert.strictEqual(result.snapshotVos.length, 1);
			assert.strictEqual(result.snapshotVos[0].data.balances[0].asset, "BTC");
		});
	});
});

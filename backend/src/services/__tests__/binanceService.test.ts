// ============================================
// BINANCE SERVICE TESTS (mocked https)
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import https from "https";
import { EventEmitter } from "events";

// RED phase: import will fail until module exists
import {
	getAccount,
	getMyTrades,
	getAccountSnapshot,
	getDepositHistory,
	getTransferHistory,
	getSubAccountTransferHistory,
} from "../binanceService";

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
					urlStr.includes("/sapi/v1/accountSnapshot"),
					"URL should include /sapi/v1/accountSnapshot (SAPI endpoint)",
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

	describe("getDepositHistory", () => {
		it("issues parallel calls for status=1 and status=6 and concatenates results (Cumulative deposits scenario)", async () => {
			const mockStatus1 = [
				{
					amount: "5.0",
					coin: "FDUSD",
					network: "BSC",
					status: 1,
					address: "0xabc",
					addressTag: "",
					txId: "tx-1",
					insertTime: 1_700_000_000_000,
					confirmTimes: "1/1",
				},
			];
			const mockStatus6 = [
				{
					amount: "5.14",
					coin: "FDUSD",
					network: "BSC",
					status: 6,
					address: "0xdef",
					addressTag: "",
					txId: "tx-2",
					insertTime: 1_710_000_000_000,
					confirmTimes: "12/12",
				},
			];

			const seenStatuses = new Set<string>();
			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				assert.ok(
					urlStr.includes("/sapi/v1/capital/deposit/hisrec"),
					`URL should include /sapi/v1/capital/deposit/hisrec, got ${urlStr}`,
				);

				if (urlStr.includes("status=1")) {
					seenStatuses.add("1");
					if (callback) callback(createMockResponse(200, mockStatus1));
					return createMockResponse(200, mockStatus1) as any;
				}
				if (urlStr.includes("status=6")) {
					seenStatuses.add("6");
					if (callback) callback(createMockResponse(200, mockStatus6));
					return createMockResponse(200, mockStatus6) as any;
				}
				throw new Error(`Unexpected URL without status=1 or status=6: ${urlStr}`);
			}) as typeof https.get;

			const result = await getDepositHistory(
				"test-api-key",
				"test-secret-key",
			);

			assert.strictEqual(seenStatuses.size, 2, "should call both status=1 and status=6");
			assert.ok(seenStatuses.has("1"), "should call status=1");
			assert.ok(seenStatuses.has("6"), "should call status=6");
			assert.strictEqual(result.length, 2, "should return both status=1 and status=6 deposits concatenated");
			const fdusdSum = result
				.filter((d) => d.coin === "FDUSD")
				.reduce((s, d) => s + parseFloat(d.amount), 0);
			assert.strictEqual(fdusdSum, 10.14, "sum of FDUSD should be 5.0 + 5.14 = 10.14");
		});

		it("degrades gracefully when one status call fails (Partial source failure scenario)", async () => {
			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);
				if (urlStr.includes("status=1")) {
					if (callback)
						callback(
							createMockResponse(200, [
								{
									amount: "5.0",
									coin: "FDUSD",
									network: "BSC",
									status: 1,
									address: "0xabc",
									addressTag: "",
									txId: "tx-1",
									insertTime: 1_700_000_000_000,
									confirmTimes: "1/1",
								},
							]),
						);
					return createMockResponse(200, []) as any;
				}
				if (urlStr.includes("status=6")) {
					if (callback) callback(createMockResponse(500, "internal error"));
					return createMockResponse(500, "internal error") as any;
				}
				throw new Error(`Unexpected URL: ${urlStr}`);
			}) as typeof https.get;

			const result = await getDepositHistory(
				"test-api-key",
				"test-secret-key",
			);

			assert.strictEqual(result.length, 1, "should return only the successful status=1 deposit");
			assert.strictEqual(result[0].coin, "FDUSD");
			assert.strictEqual(result[0].amount, "5.0");
		});

		it("returns deposit records when Binance has deposits (Deposits available scenario)", async () => {
			const mockDeposits = [
				{
					amount: "1000.00",
					coin: "FDUSD",
					network: "BSC",
					status: 1,
					address: "0xabc",
					addressTag: "",
					txId: "tx-1",
					insertTime: 1_700_000_000_000,
					confirmTimes: "1/1",
				},
				{
					amount: "0.5",
					coin: "BTC",
					network: "BTC",
					status: 1,
					address: "1abc",
					addressTag: "",
					txId: "tx-2",
					insertTime: 1_710_000_000_000,
					confirmTimes: "2/2",
				},
			];

			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				assert.ok(
					urlStr.includes("/sapi/v1/capital/deposit/hisrec"),
					`URL should include /sapi/v1/capital/deposit/hisrec, got ${urlStr}`,
				);
				assert.ok(
					urlStr.includes("status=1"),
					"URL should include status=1 to filter successful deposits",
				);
				assert.ok(
					urlStr.includes("timestamp="),
					"URL should include timestamp",
				);
				assert.ok(
					urlStr.includes("signature="),
					"URL should include signature",
				);

				if (callback) callback(createMockResponse(200, mockDeposits));
				return createMockResponse(200, mockDeposits) as any;
			}) as typeof https.get;

			const result = await getDepositHistory(
				"test-api-key",
				"test-secret-key",
			);

			assert.strictEqual(result.length, 2, "should return both deposits");
			assert.strictEqual(result[0].coin, "FDUSD");
			assert.strictEqual(result[0].amount, "1000.00");
			assert.strictEqual(result[0].insertTime, 1_700_000_000_000);
			assert.strictEqual(result[1].coin, "BTC");
			assert.strictEqual(result[1].insertTime, 1_710_000_000_000);
		});

		it("returns an empty array when Binance has no deposits (No deposits exist scenario)", async () => {
			https.get = ((_urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				if (callback) callback(createMockResponse(200, []));
				return createMockResponse(200, []) as any;
			}) as typeof https.get;

			const result = await getDepositHistory(
				"test-api-key",
				"test-secret-key",
			);

			assert.ok(
				Array.isArray(result),
				"result must be an array per spec",
			);
			assert.strictEqual(
				result.length,
				0,
				"should return empty array when Binance returns []",
			);
		});
	});

	describe("getTransferHistory", () => {
		it("returns transfer rows when Binance has transfers (Transfers available scenario)", async () => {
			const mockTransferResponse = {
				total: 2,
				rows: [
					{
						asset: "USDT",
						amount: "250.00",
						type: "MAIN_UMFUTURE",
						status: "CONFIRMED",
						tranId: 9001,
						timestamp: 1_700_000_000_000,
					},
					{
						asset: "FDUSD",
						amount: "100.00",
						type: "MAIN_UMFUTURE",
						status: "CONFIRMED",
						tranId: 9002,
						timestamp: 1_705_000_000_000,
					},
				],
			};

			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				assert.ok(
					urlStr.includes("/sapi/v1/asset/transfer"),
					`URL should include /sapi/v1/asset/transfer, got ${urlStr}`,
				);
				assert.ok(
					urlStr.includes("type=MAIN_UMFUTURE"),
					"URL should include the transfer type parameter",
				);
				assert.ok(
					urlStr.includes("signature="),
					"URL should include signature",
				);

				if (callback) callback(createMockResponse(200, mockTransferResponse));
				return createMockResponse(200, mockTransferResponse) as any;
			}) as typeof https.get;

			const result = await getTransferHistory(
				"test-api-key",
				"test-secret-key",
			);

			assert.ok(Array.isArray(result), "result must be the rows array");
			assert.strictEqual(
				result.length,
				2,
				"should unwrap rows from the Binance wrapper",
			);
			assert.strictEqual(result[0].asset, "USDT");
			assert.strictEqual(result[0].amount, "250.00");
			assert.strictEqual(result[0].timestamp, 1_700_000_000_000);
			assert.strictEqual(result[1].asset, "FDUSD");
		});

		it("rejects when the transfer endpoint returns an error (Transfer API unavailable scenario)", async () => {
			// Binance returns 4xx with a JSON error body when the API key lacks
			// the Universal Transfer permission. The service must reject so the
			// caller (dashboardService) can degrade gracefully via Promise.allSettled.
			https.get = ((_urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const errorBody = JSON.stringify({
					code: -2015,
					msg: "Invalid API-key, IP, or permissions for action.",
				});
				if (callback) callback(createMockResponse(401, errorBody));
				return createMockResponse(401, errorBody) as any;
			}) as typeof https.get;

			await assert.rejects(
				() => getTransferHistory("bad-key", "bad-secret"),
				/Binance API 401/,
			);
		});
	});

	describe("getSubAccountTransferHistory", () => {
		it("returns sub-account transfer rows with FDUSD internal transfer (Internal FDUSD transfer detected scenario)", async () => {
			const mockSubAccountResponse = {
				total: 1,
				rows: [
					{
						asset: "FDUSD",
						amount: "10.14119044",
						type: "FUNDING_MAIN",
						status: "CONFIRMED",
						tranId: 8001,
						timestamp: 1_700_000_000_000,
					},
				],
			};

			https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const urlStr =
					typeof urlOrOpts === "string" ? urlOrOpts : JSON.stringify(urlOrOpts);

				assert.ok(
					urlStr.includes("/sapi/v1/sub-account/transfer/subUserHistory"),
					`URL should include /sapi/v1/sub-account/transfer/subUserHistory, got ${urlStr}`,
				);
				assert.ok(
					urlStr.includes("timestamp="),
					"URL should include timestamp",
				);
				assert.ok(
					urlStr.includes("signature="),
					"URL should include signature",
				);

				if (callback) callback(createMockResponse(200, mockSubAccountResponse));
				return createMockResponse(200, mockSubAccountResponse) as any;
			}) as typeof https.get;

			const result = await getSubAccountTransferHistory(
				"test-api-key",
				"test-secret-key",
			);

			assert.ok(Array.isArray(result), "result must be the rows array");
			assert.strictEqual(
				result.length,
				1,
				"should unwrap rows from the Binance wrapper",
			);
			assert.strictEqual(result[0].asset, "FDUSD");
			assert.strictEqual(result[0].amount, "10.14119044");
			assert.strictEqual(result[0].timestamp, 1_700_000_000_000);
		});

		it("rejects when the sub-account endpoint returns 401 (Transfer API unavailable scenario)", async () => {
			https.get = ((_urlOrOpts: unknown, callback?: (res: unknown) => void) => {
				const errorBody = JSON.stringify({
					code: -2015,
					msg: "Invalid API-key, IP, or permissions for action.",
				});
				if (callback) callback(createMockResponse(401, errorBody));
				return createMockResponse(401, errorBody) as any;
			}) as typeof https.get;

			await assert.rejects(
				() => getSubAccountTransferHistory("bad-key", "bad-secret"),
				/Binance API 401/,
			);
		});
	});
});

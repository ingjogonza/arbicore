// ============================================
// DASHBOARD ROUTE INTEGRATION TESTS
// ============================================

import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import https from "https";
import { EventEmitter } from "events";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { supabaseAdmin } from "../../config/supabase";
import { registerCors } from "../../plugins/cors";
import { registerAuth } from "../../plugins/auth";
import { setupErrorHandler } from "../../utils/errors";
import { dashboardRoutes } from "../dashboard";
import { storeApiKeys, deleteApiKeys } from "../../services/keysService";
import { getDb } from "../../config/database";

/** Helper for mocked https.get responses — mirrors binanceService.test.ts. */
function createMockResponse(
	statusCode: number,
	body: unknown,
): EventEmitter & { statusCode: number } {
	const res = new EventEmitter() as EventEmitter & { statusCode: number };
	res.statusCode = statusCode;
	process.nextTick(() => {
		res.emit("data", typeof body === "string" ? body : JSON.stringify(body));
		res.emit("end");
	});
	return res;
}

/**
 * Dispatches a mocked https.get call by Binance path.
 * Each handler returns either a body or null to reject with a 4xx.
 */
type Handler = () =>
	| { status: number; body: unknown }
	| { status: number; body: unknown; reject?: false };
type HandlerMap = {
	account?: Handler;
	myTrades?: Handler;
	snapshot?: Handler;
	deposit?: Handler;
	transfer?: Handler;
	subAccountTransfer?: Handler;
};

function installBinanceMock(handlers: HandlerMap): () => void {
	const original = https.get;
	https.get = ((urlOrOpts: unknown, callback?: (res: unknown) => void) => {
		const urlStr =
			typeof urlOrOpts === "string"
				? urlOrOpts
				: ((urlOrOpts as any)?.path ?? JSON.stringify(urlOrOpts));

		let handler: Handler | undefined;
		if (urlStr.includes("/api/v3/account")) handler = handlers.account;
		else if (urlStr.includes("/api/v3/myTrades")) handler = handlers.myTrades;
		else if (urlStr.includes("/sapi/v1/accountSnapshot"))
			handler = handlers.snapshot;
		else if (urlStr.includes("/sapi/v1/capital/deposit/hisrec"))
			handler = handlers.deposit;
		else if (urlStr.includes("/sapi/v1/sub-account/transfer/subUserHistory"))
			handler = handlers.subAccountTransfer;
		else if (urlStr.includes("/sapi/v1/asset/transfer"))
			handler = handlers.transfer;

		const result = handler
			? handler()
			: { status: 404, body: { msg: "no handler" } };
		const res = createMockResponse(result.status, result.body);
		if (callback) callback(res);
		return res as any;
	}) as typeof https.get;

	return () => {
		https.get = original;
	};
}

/** Clear the dashboard cache row so each test sees fresh service execution. */
async function clearDashboardCache(userId: string): Promise<void> {
	try {
		const db = getDb();
		await db.collection("cache").deleteOne({ _id: `dashboard:${userId}` });
	} catch {
		/* ignore — collection may not exist yet */
	}
}

describe("Dashboard Routes", () => {
	let app: FastifyInstance;
	let authToken: string;
	let userId: string;

	before(async () => {
		await connectDatabase();

		// Create test user
		const email = `dashboard-test-${Date.now()}@cryptoinvestor.local`;
		const { data: userData, error: userError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password: "TestPassword123!",
				email_confirm: true,
			});
		if (userError) throw userError;
		userId = userData.user!.id;

		// Sign in to get token
		const { data: signInData, error: signInError } =
			await supabaseAdmin.auth.signInWithPassword({
				email,
				password: "TestPassword123!",
			});
		if (signInError) throw signInError;
		authToken = signInData.session!.access_token;

		// Build test app
		app = Fastify({ logger: false });
		await registerCors(app);
		await registerAuth(app);
		setupErrorHandler(app);
		await app.register(dashboardRoutes);
		await app.ready();
	});

	after(async () => {
		await app.close();
		// Clean up test keys
		try {
			await deleteApiKeys(userId);
		} catch {
			/* ignore */
		}
		// Clean up Supabase user
		await supabaseAdmin.auth.admin.deleteUser(userId);
		await disconnectDatabase();
	});

	it("GET /api/dashboard/summary without auth returns 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/dashboard/summary",
		});

		assert.strictEqual(res.statusCode, 401);
	});

	it("GET /api/dashboard/summary with auth but no API keys returns 200 with NO_API_KEYS error", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/dashboard/summary",
			headers: { authorization: `Bearer ${authToken}` },
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.balances, null);
		assert.strictEqual(body.data.trades, null);
		assert.strictEqual(body.data.equityHistory, null);
		assert.strictEqual(body.data.botStatus.active, false);
		assert.strictEqual(
			body.data.botStatus.strategy,
			"Conservative Spot Trading",
		);
		assert.ok(body.errors, "should have errors");
		assert.strictEqual(body.errors.length, 1);
		assert.strictEqual(body.errors[0].code, "NO_API_KEYS");
	});

	it("GET /api/dashboard/summary with stored keys returns 200 (Binance calls may fail gracefully)", async () => {
		// Store fake API keys so the service tries to call Binance
		await storeApiKeys(userId, "fake-api-key", "fake-secret-key", "Test");

		const res = await app.inject({
			method: "GET",
			url: "/api/dashboard/summary",
			headers: { authorization: `Bearer ${authToken}` },
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);

		// Bot should be active since keys exist
		assert.strictEqual(body.data.botStatus.active, true);

		// Since fake keys are used, Binance API calls will likely fail
		// The endpoint should still return 200 with partial errors
		// (but we don't check specific errors since Binance response varies)
		assert.ok(body.data, "should have data");

		// initialBalance is now either null or an InitialOperation object
		// (never a bare string). The Fastify schema must permit object shape.
		const ib = body.data.initialBalance;
		if (ib !== null && ib !== undefined) {
			assert.strictEqual(
				typeof ib,
				"object",
				"initialBalance must be null or an InitialOperation object, never a string",
			);
			assert.ok(
				["deposit", "transfer"].includes(ib.type),
				`initialBalance.type must be "deposit" or "transfer", got: ${ib.type}`,
			);
			assert.strictEqual(typeof ib.coin, "string");
			assert.strictEqual(typeof ib.amount, "number");
			assert.strictEqual(typeof ib.time, "number");
		}
	});

	// ----------------------------------------------------------------
	// Deterministic mocked-Binance integration tests (Task 2.4 GREEN)
	// These prove the route returns the exact InitialOperation contract
	// without depending on real Binance behavior or fake-key error paths.
	// ----------------------------------------------------------------

	describe("with mocked Binance HTTPS responses", () => {
		let restoreHttps: (() => void) | null = null;

		// Clear before AND after each scenario:
		// - Before: previous tests (real fake-key path) cache initialBalance=null
		//   under `dashboard:${userId}` for 30s; without clearing, these mocked
		//   scenarios receive the cached null and the orchestrator never executes.
		// - After: prevent leaking mocked responses into other suites.
		const ensureFreshCache = async () => {
			await clearDashboardCache(userId);
		};

		beforeEach(async () => {
			await ensureFreshCache();
		});

		afterEach(async () => {
			if (restoreHttps) {
				restoreHttps();
				restoreHttps = null;
			}
			await ensureFreshCache();
		});

		it("returns the earliest deposit as initialBalance when deposit precedes transfer (unconditional object-shape contract)", async () => {
			restoreHttps = installBinanceMock({
				account: () => ({
					status: 200,
					body: {
						makerCommission: 10,
						takerCommission: 10,
						buyerCommission: 0,
						sellerCommission: 0,
						canTrade: true,
						canWithdraw: true,
						canDeposit: true,
						updateTime: 1_700_000_000_000,
						accountType: "SPOT",
						balances: [{ asset: "BTC", free: "0.5", locked: "0.0" }],
						permissions: ["SPOT"],
					},
				}),
				myTrades: () => ({ status: 200, body: [] }),
				snapshot: () => ({
					status: 200,
					body: { code: 200, msg: "", snapshotVos: [] },
				}),
				deposit: () => ({
					status: 200,
					body: [
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
					],
				}),
				transfer: () => ({
					status: 200,
					body: {
						total: 1,
						rows: [
							{
								asset: "USDT",
								amount: "500.00",
								type: "MAIN_UMFUTURE",
								status: "CONFIRMED",
								tranId: 9001,
								timestamp: 1_710_000_000_000, // later than deposit
							},
						],
					},
				}),
			});

			const res = await app.inject({
				method: "GET",
				url: "/api/dashboard/summary",
				headers: { authorization: `Bearer ${authToken}` },
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);

			// Unconditional object-shape assertions — this is the contract test
			// that the previous version skipped when initialBalance was null.
			assert.deepStrictEqual(body.data.initialBalance, {
				type: "deposit",
				coin: "FDUSD",
				amount: 1000,
				time: 1_700_000_000_000,
			});
		});

		it("returns the earliest transfer as initialBalance when transfer precedes deposit", async () => {
			restoreHttps = installBinanceMock({
				account: () => ({
					status: 200,
					body: {
						makerCommission: 0,
						takerCommission: 0,
						buyerCommission: 0,
						sellerCommission: 0,
						canTrade: true,
						canWithdraw: true,
						canDeposit: true,
						updateTime: 1_700_000_000_000,
						accountType: "SPOT",
						balances: [],
						permissions: ["SPOT"],
					},
				}),
				myTrades: () => ({ status: 200, body: [] }),
				snapshot: () => ({
					status: 200,
					body: { code: 200, msg: "", snapshotVos: [] },
				}),
				deposit: () => ({
					status: 200,
					body: [
						{
							amount: "1000.00",
							coin: "FDUSD",
							network: "BSC",
							status: 1,
							address: "0xabc",
							addressTag: "",
							txId: "tx-late",
							insertTime: 1_710_000_000_000, // later than transfer
							confirmTimes: "1/1",
						},
					],
				}),
				transfer: () => ({
					status: 200,
					body: {
						total: 1,
						rows: [
							{
								asset: "USDT",
								amount: "250.00",
								type: "MAIN_UMFUTURE",
								status: "CONFIRMED",
								tranId: 9001,
								timestamp: 1_700_000_000_000,
							},
						],
					},
				}),
			});

			const res = await app.inject({
				method: "GET",
				url: "/api/dashboard/summary",
				headers: { authorization: `Bearer ${authToken}` },
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.deepStrictEqual(body.data.initialBalance, {
				type: "transfer",
				coin: "USDT",
				amount: 250,
				time: 1_700_000_000_000,
			});
		});

		it("falls back to deposit when transfer API fails (graceful degradation, no error propagation)", async () => {
			restoreHttps = installBinanceMock({
				account: () => ({
					status: 200,
					body: {
						makerCommission: 0,
						takerCommission: 0,
						buyerCommission: 0,
						sellerCommission: 0,
						canTrade: true,
						canWithdraw: true,
						canDeposit: true,
						updateTime: 1_700_000_000_000,
						accountType: "SPOT",
						balances: [],
						permissions: ["SPOT"],
					},
				}),
				myTrades: () => ({ status: 200, body: [] }),
				snapshot: () => ({
					status: 200,
					body: { code: 200, msg: "", snapshotVos: [] },
				}),
				deposit: () => ({
					status: 200,
					body: [
						{
							amount: "750.00",
							coin: "FDUSD",
							network: "BSC",
							status: 1,
							address: "0xabc",
							addressTag: "",
							txId: "tx-1",
							insertTime: 1_700_000_000_000,
							confirmTimes: "1/1",
						},
					],
				}),
				// Transfer endpoint returns -2015 (no permission) — common Binance failure.
				transfer: () => ({
					status: 401,
					body: {
						code: -2015,
						msg: "Invalid API-key, IP, or permissions for action.",
					},
				}),
			});

			const res = await app.inject({
				method: "GET",
				url: "/api/dashboard/summary",
				headers: { authorization: `Bearer ${authToken}` },
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);

			// Unconditional shape assertion — fallback MUST yield the deposit.
			assert.deepStrictEqual(body.data.initialBalance, {
				type: "deposit",
				coin: "FDUSD",
				amount: 750,
				time: 1_700_000_000_000,
			});

			// Graceful degradation: transfer failure SHALL NOT propagate to errors[].
			const errs = (body.errors ?? []) as Array<{ source: string }>;
			const hasTransferError = errs.some((e) => e.source === "transfers");
			assert.strictEqual(
				hasTransferError,
				false,
				"transfer failure must NOT propagate as a public error per spec 'Fallback on Partial API Failure'",
			);
		});

		it("detects FDUSD internal transfer via sub-account when universal-transfer sources fail (Partial transfer source failure scenario)", async () => {
			restoreHttps = installBinanceMock({
				account: () => ({
					status: 200,
					body: {
						makerCommission: 0,
						takerCommission: 0,
						buyerCommission: 0,
						sellerCommission: 0,
						canTrade: true,
						canWithdraw: true,
						canDeposit: true,
						updateTime: 1_700_000_000_000,
						accountType: "SPOT",
						balances: [],
						permissions: ["SPOT"],
					},
				}),
				myTrades: () => ({ status: 200, body: [] }),
				snapshot: () => ({
					status: 200,
					body: { code: 200, msg: "", snapshotVos: [] },
				}),
				deposit: () => ({
					status: 200,
					body: [],
				}),
				// All universal-transfer endpoints return 401 (no permission).
				transfer: () => ({
					status: 401,
					body: {
						code: -2015,
						msg: "Invalid API-key, IP, or permissions for action.",
					},
				}),
				// Sub-account endpoint returns the FDUSD internal transfer.
				subAccountTransfer: () => ({
					status: 200,
					body: {
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
					},
				}),
			});

			const res = await app.inject({
				method: "GET",
				url: "/api/dashboard/summary",
				headers: { authorization: `Bearer ${authToken}` },
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);

			// The FDUSD sub-account transfer is the only funding operation.
			assert.deepStrictEqual(body.data.initialBalance, {
				type: "transfer",
				coin: "FDUSD",
				amount: 10.14119044,
				time: 1_700_000_000_000,
			});

			// No transfers error in public errors per partial-failure spec.
			const errs = (body.errors ?? []) as Array<{ source: string }>;
			const hasTransferError = errs.some((e) => e.source === "transfers");
			assert.strictEqual(
				hasTransferError,
				false,
				"transfer source failure must NOT propagate as a public error",
			);
		});

		it("falls back to universal transfer when sub-account source fails (Partial transfer source failure scenario)", async () => {
			restoreHttps = installBinanceMock({
				account: () => ({
					status: 200,
					body: {
						makerCommission: 0,
						takerCommission: 0,
						buyerCommission: 0,
						sellerCommission: 0,
						canTrade: true,
						canWithdraw: true,
						canDeposit: true,
						updateTime: 1_700_000_000_000,
						accountType: "SPOT",
						balances: [],
						permissions: ["SPOT"],
					},
				}),
				myTrades: () => ({ status: 200, body: [] }),
				snapshot: () => ({
					status: 200,
					body: { code: 200, msg: "", snapshotVos: [] },
				}),
				deposit: () => ({
					status: 200,
					body: [],
				}),
				// Universal-transfer endpoint returns USDT transfer.
				transfer: () => ({
					status: 200,
					body: {
						total: 1,
						rows: [
							{
								asset: "USDT",
								amount: "250.00",
								type: "MAIN_UMFUTURE",
								status: "CONFIRMED",
								tranId: 9001,
								timestamp: 1_700_000_000_000,
							},
						],
					},
				}),
				// Sub-account endpoint returns 401 (no permission).
				subAccountTransfer: () => ({
					status: 401,
					body: {
						code: -2015,
						msg: "Invalid API-key, IP, or permissions for action.",
					},
				}),
			});

			const res = await app.inject({
				method: "GET",
				url: "/api/dashboard/summary",
				headers: { authorization: `Bearer ${authToken}` },
			});

			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);

			// The USDT universal transfer is the earliest (and only) funding operation.
			assert.deepStrictEqual(body.data.initialBalance, {
				type: "transfer",
				coin: "USDT",
				amount: 250,
				time: 1_700_000_000_000,
			});

			// No transfers error in public errors per partial-failure spec.
			const errs = (body.errors ?? []) as Array<{ source: string }>;
			const hasTransferError = errs.some((e) => e.source === "transfers");
			assert.strictEqual(
				hasTransferError,
				false,
				"transfer source failure must NOT propagate as a public error",
			);
		});
	});
});

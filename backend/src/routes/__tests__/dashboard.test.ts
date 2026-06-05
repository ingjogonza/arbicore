// ============================================
// DASHBOARD ROUTE INTEGRATION TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { supabaseAdmin } from "../../config/supabase";
import { registerCors } from "../../plugins/cors";
import { registerAuth } from "../../plugins/auth";
import { setupErrorHandler } from "../../utils/errors";
import { dashboardRoutes } from "../dashboard";
import { storeApiKeys, deleteApiKeys } from "../../services/keysService";

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
	});
});

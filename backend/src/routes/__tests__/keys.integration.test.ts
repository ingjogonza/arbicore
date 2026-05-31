// ============================================
// API KEYS INTEGRATION TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { supabaseAdmin } from "../../config/supabase";
import { registerCors } from "../../plugins/cors";
import { registerAuth } from "../../plugins/auth";
import { setupErrorHandler } from "../../utils/errors";
import { keysRoutes } from "../keys";

describe("Keys Routes", () => {
	let app: FastifyInstance;
	let authToken: string;
	let userId: string;

	before(async () => {
		await connectDatabase();

		// Create test user
		const { data: userData, error: userError } =
			await supabaseAdmin.auth.admin.createUser({
				email: `keys-test-${Date.now()}@cryptoinvestor.local`,
				password: "TestPassword123!",
				email_confirm: true,
			});
		if (userError) throw userError;
		userId = userData.user!.id;

		// Sign in to get token
		const { data: signInData, error: signInError } =
			await supabaseAdmin.auth.signInWithPassword({
				email: userData.user!.email!,
				password: "TestPassword123!",
			});
		if (signInError) throw signInError;
		authToken = signInData.session!.access_token;

		// Build test app
		app = Fastify({ logger: false });
		await registerCors(app);
		await registerAuth(app);
		setupErrorHandler(app);
		await app.register(keysRoutes);
	});

	after(async () => {
		await app.close();
		await supabaseAdmin.auth.admin.deleteUser(userId);
		// Clean up API keys from MongoDB
		const db = (await import("../../config/database")).getDb();
		await db.collection("api_keys").deleteMany({});
		await disconnectDatabase();
	});

	it("POST /api/keys without auth returns 401", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/keys",
			payload: { apiKey: "test", secretKey: "test" },
		});
		assert.strictEqual(res.statusCode, 401);
	});

	it("POST /api/keys with valid auth stores keys", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/keys",
			headers: { authorization: `Bearer ${authToken}` },
			payload: {
				apiKey: "test-api-key",
				secretKey: "test-secret-key",
				label: "Test",
			},
		});
		assert.strictEqual(res.statusCode, 201);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.ok(body.data.id);
		assert.strictEqual(body.data.label, "Test");
	});

	it("POST /api/keys again returns 409 conflict", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/keys",
			headers: { authorization: `Bearer ${authToken}` },
			payload: { apiKey: "another", secretKey: "another", label: "Test2" },
		});
		assert.strictEqual(res.statusCode, 409);
	});

	it("GET /api/keys/status returns hasKeys true", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/keys/status",
			headers: { authorization: `Bearer ${authToken}` },
		});
		assert.strictEqual(res.statusCode, 200);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.hasKeys, true);
	});

	it("DELETE /api/keys removes stored keys", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: "/api/keys",
			headers: { authorization: `Bearer ${authToken}` },
		});
		assert.strictEqual(res.statusCode, 200);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.deleted, true);
	});

	it("GET /api/keys/status after delete returns false", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/keys/status",
			headers: { authorization: `Bearer ${authToken}` },
		});
		assert.strictEqual(res.statusCode, 200);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.data.hasKeys, false);
	});
});

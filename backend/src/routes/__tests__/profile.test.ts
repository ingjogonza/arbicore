// ============================================
// PROFILE ROUTE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { supabaseAdmin } from "../../config/supabase";
import { registerCors } from "../../plugins/cors";
import { registerAuth } from "../../plugins/auth";
import { setupErrorHandler } from "../../utils/errors";
import { profileRoutes } from "../profile";
import { invalidateProfileCache } from "../../services/userProfileService";

describe("Profile Routes", () => {
	let app: FastifyInstance;
	let authToken: string;
	let userId: string;
	const testEmail = `profile-route-test-${Date.now()}@cryptoinvestor.local`;
	const testPassword = "TestPassword123!";

	before(async () => {
		await connectDatabase();

		// Create a test user with metadata
		const { data: userData, error: userError } =
			await supabaseAdmin.auth.admin.createUser({
				email: testEmail,
				password: testPassword,
				email_confirm: true,
				user_metadata: { first_name: "Test", last_name: "User" },
			});
		if (userError) throw userError;
		userId = userData.user!.id;

		// Sign in to get a real JWT token
		const { data: signInData, error: signInError } =
			await supabaseAdmin.auth.signInWithPassword({
				email: testEmail,
				password: testPassword,
			});
		if (signInError) throw signInError;
		authToken = signInData.session!.access_token;

		// Build test app
		app = Fastify({ logger: false });
		await registerCors(app);
		await registerAuth(app);
		setupErrorHandler(app);
		await app.register(profileRoutes);
	});

	after(async () => {
		await app.close();
		await invalidateProfileCache(userId);
		await supabaseAdmin.auth.admin.deleteUser(userId);
		await disconnectDatabase();
	});

	it("GET /api/profile without auth returns 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/profile",
		});
		assert.strictEqual(res.statusCode, 401);
	});

	it("GET /api/profile with auth returns user profile", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/profile",
			headers: { authorization: `Bearer ${authToken}` },
		});
		assert.strictEqual(res.statusCode, 200);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.userId, userId);
		assert.strictEqual(body.data.email, testEmail);
	});

	it("GET /api/profile returns cached profile after first call", async () => {
		// First call caches the profile via getOrCacheProfile in the auth plugin
		const res = await app.inject({
			method: "GET",
			url: "/api/profile",
			headers: { authorization: `Bearer ${authToken}` },
		});
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);

		// After the auth plugin runs getOrCacheProfile, the route should find it cached
		const cached = body.data.cached;
		assert.strictEqual(cached, true);
	});

	it("GET /api/profile returns correct name fields", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/profile",
			headers: { authorization: `Bearer ${authToken}` },
		});
		assert.strictEqual(res.statusCode, 200);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.data.firstName, "Test");
		assert.strictEqual(body.data.lastName, "User");
	});

	it("GET /api/profile content-type is JSON", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/profile",
			headers: { authorization: `Bearer ${authToken}` },
		});
		assert.ok(String(res.headers["content-type"]).includes("application/json"));
	});

	it("GET /api/profile with invalid token returns 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/profile",
			headers: { authorization: "Bearer invalid-token-123" },
		});
		assert.strictEqual(res.statusCode, 401);

		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, false);
		assert.strictEqual(body.error.code, "UNAUTHORIZED");
	});
});

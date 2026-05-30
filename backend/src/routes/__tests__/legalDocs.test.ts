// ============================================
// LEGAL DOCUMENTS ROUTE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { getDb } from "../../config/database";
import { supabaseAdmin } from "../../config/supabase";
import { registerCors } from "../../plugins/cors";
import { registerAuth } from "../../plugins/auth";
import { setupErrorHandler } from "../../utils/errors";
import { legalDocsRoutes } from "../legalDocs";

describe("LegalDocs Routes", () => {
	let app: FastifyInstance;
	let authToken: string;
	let userId: string;
	const testEmail = `legaldocs-route-test-${Date.now()}@cryptoinvestor.local`;
	const testPassword = "TestPassword123!";

	before(async () => {
		await connectDatabase();

		// Create a test user
		const { data: userData, error: userError } =
			await supabaseAdmin.auth.admin.createUser({
				email: testEmail,
				password: testPassword,
				email_confirm: true,
			});
		if (userError) throw userError;
		userId = userData.user!.id;

		// Sign in to get JWT token
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
		await app.register(legalDocsRoutes);
	});

	after(async () => {
		await app.close();

		// Clean up legal docs
		const db = getDb();
		await db.collection("legal_docs").deleteMany({ userId });

		await supabaseAdmin.auth.admin.deleteUser(userId);
		await disconnectDatabase();
	});

	describe("GET /api/legal-docs/required", () => {
		it("returns required docs list (public, no auth)", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/legal-docs/required",
			});
			assert.strictEqual(res.statusCode, 200);

			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);
			assert.ok(Array.isArray(body.data.requiredDocs));
			assert.strictEqual(body.data.requiredDocs.length, 4);

			// Verify known doc IDs
			const ids = body.data.requiredDocs.map((d: { id: string }) => d.id);
			assert.ok(ids.includes("tos"));
			assert.ok(ids.includes("risk"));
			assert.ok(ids.includes("api-auth"));
			assert.ok(ids.includes("no-custody"));
		});

		it("returns JSON content-type", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/legal-docs/required",
			});
			assert.ok(
				String(res.headers["content-type"]).includes("application/json"),
			);
		});
	});

	describe("POST /api/legal-docs/accept", () => {
		it("without auth returns 401", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/legal-docs/accept",
				payload: { docId: "tos" },
			});
			assert.strictEqual(res.statusCode, 401);
		});

		it("accepts a legal document with valid docId", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/legal-docs/accept",
				headers: { authorization: `Bearer ${authToken}` },
				payload: { docId: "tos" },
			});
			assert.strictEqual(res.statusCode, 200);

			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);
			assert.strictEqual(body.data.accepted, true);
			assert.strictEqual(body.data.docId, "tos");
		});

		it("accepts multiple documents", async () => {
			for (const docId of ["risk", "api-auth", "no-custody"]) {
				const res = await app.inject({
					method: "POST",
					url: "/api/legal-docs/accept",
					headers: { authorization: `Bearer ${authToken}` },
					payload: { docId },
				});
				assert.strictEqual(res.statusCode, 200);
				const body = JSON.parse(res.body);
				assert.strictEqual(body.data.accepted, true);
				assert.strictEqual(body.data.docId, docId);
			}
		});

		it("accepting the same doc twice is idempotent", async () => {
			const res1 = await app.inject({
				method: "POST",
				url: "/api/legal-docs/accept",
				headers: { authorization: `Bearer ${authToken}` },
				payload: { docId: "tos" },
			});
			assert.strictEqual(res1.statusCode, 200);

			const res2 = await app.inject({
				method: "POST",
				url: "/api/legal-docs/accept",
				headers: { authorization: `Bearer ${authToken}` },
				payload: { docId: "tos" },
			});
			assert.strictEqual(res2.statusCode, 200);
			const body = JSON.parse(res2.body);
			assert.strictEqual(body.data.accepted, true);
			assert.strictEqual(body.data.docId, "tos");
		});

		it("returns 400 for missing docId", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/legal-docs/accept",
				headers: { authorization: `Bearer ${authToken}` },
				payload: {},
			});
			assert.strictEqual(res.statusCode, 400);

			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, false);
			assert.strictEqual(body.error.code, "VALIDATION_ERROR");
		});

		it("accepting unknown docId silently succeeds (no-op)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/legal-docs/accept",
				headers: { authorization: `Bearer ${authToken}` },
				payload: { docId: "non-existent-doc" },
			});
			assert.strictEqual(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);
			assert.strictEqual(body.data.accepted, true);
			assert.strictEqual(body.data.docId, "non-existent-doc");
		});
	});

	describe("GET /api/legal-docs/status", () => {
		it("without auth returns 401", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/legal-docs/status",
			});
			assert.strictEqual(res.statusCode, 401);
		});

		it("returns status with accepted count", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/legal-docs/status",
				headers: { authorization: `Bearer ${authToken}` },
			});
			assert.strictEqual(res.statusCode, 200);

			const body = JSON.parse(res.body);
			assert.strictEqual(body.success, true);
			assert.strictEqual(body.data.requiredCount, 4);
			assert.ok(typeof body.data.acceptedCount === "number");
			assert.ok(typeof body.data.allAccepted === "boolean");
			assert.ok(Array.isArray(body.data.acceptedDocs));
		});

		it("returns accepted docs with correct fields", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/legal-docs/status",
				headers: { authorization: `Bearer ${authToken}` },
			});
			const body = JSON.parse(res.body);

			for (const doc of body.data.acceptedDocs) {
				assert.ok(doc.docId);
				assert.ok(doc.title);
				assert.ok(doc.acceptedAt);
			}
		});

		it("reports allAccepted once all 4 docs are accepted", async () => {
			// Accept all 4 docs
			for (const docId of ["tos", "risk", "api-auth", "no-custody"]) {
				await app.inject({
					method: "POST",
					url: "/api/legal-docs/accept",
					headers: { authorization: `Bearer ${authToken}` },
					payload: { docId },
				});
			}

			const res = await app.inject({
				method: "GET",
				url: "/api/legal-docs/status",
				headers: { authorization: `Bearer ${authToken}` },
			});
			const body = JSON.parse(res.body);
			assert.strictEqual(body.data.allAccepted, true);
			assert.strictEqual(body.data.acceptedCount, 4);
		});
	});
});

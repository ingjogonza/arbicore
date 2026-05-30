// ============================================
// ROBOT KEYS ROUTE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { setupErrorHandler } from "../../utils/errors";
import { robotKeysRoutes } from "../robotKeys";
import { storeApiKeys, deleteApiKeys } from "../../services/keysService";

describe("Robot Keys Routes", () => {
	let app: FastifyInstance;
	const userId = "robot-keys-test-user-123";

	before(async () => {
		await connectDatabase();

		// Clean any previous keys
		try {
			await deleteApiKeys(userId);
		} catch {
			// ignore if not exists
		}

		// Build test app
		app = Fastify({ logger: false });
		setupErrorHandler(app);
		await app.register(robotKeysRoutes);
	});

	after(async () => {
		await app.close();
		try {
			await deleteApiKeys(userId);
		} catch {
			// ignore
		}
		await disconnectDatabase();
	});

	it("GET /api/keys/:userId returns 404 when keys not found", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/keys/non-existent-user",
		});
		assert.strictEqual(res.statusCode, 404);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, false);
		assert.strictEqual(body.error.code, "NOT_FOUND");
	});

	it("GET /api/keys/:userId returns decrypted keys when stored", async () => {
		await storeApiKeys(
			userId,
			"test-api-key-123",
			"test-secret-key-456",
			"TestLabel",
		);

		const res = await app.inject({
			method: "GET",
			url: `/api/keys/${userId}`,
		});
		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.userId, userId);
		assert.strictEqual(body.data.apiKey, "test-api-key-123");
		assert.strictEqual(body.data.secretKey, "test-secret-key-456");
		assert.strictEqual(body.data.label, "TestLabel");
	});
});

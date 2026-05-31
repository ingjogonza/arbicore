// ============================================
// ROBOT KEYS ROUTE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import Fastify, { type FastifyInstance } from "fastify";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { setupErrorHandler } from "../../utils/errors";
import { robotKeysRoutes } from "../robotKeys";
import {
	storeApiKeys,
	deleteApiKeys,
	getAllActiveApiKeys,
} from "../../services/keysService";

describe("Robot Keys Routes", () => {
	let app: FastifyInstance;
	const userId = "robot-keys-test-user-123";
	const userId2 = "robot-keys-test-user-456";
	const userId3 = "robot-keys-test-user-789";
	const testUsers = [userId, userId2, userId3];

	before(async () => {
		await connectDatabase();

		// Clean any previous keys for all test users
		for (const uid of testUsers) {
			try {
				await deleteApiKeys(uid);
			} catch {
				// ignore if not exists
			}
		}

		// Build test app
		app = Fastify({ logger: false });
		setupErrorHandler(app);
		await app.register(robotKeysRoutes);
	});

	after(async () => {
		await app.close();
		for (const uid of testUsers) {
			try {
				await deleteApiKeys(uid);
			} catch {
				// ignore
			}
		}
		await disconnectDatabase();
	});

	it("GET /api/keys returns empty array when no active keys", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/keys",
		});
		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.deepStrictEqual(body.data, []);
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

	it("GET /api/keys returns all active keys decrypted", async () => {
		await storeApiKeys(userId2, "key-user-456", "secret-user-456", "User456");

		const res = await app.inject({
			method: "GET",
			url: "/api/keys",
		});
		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.length, 2);

		const user1 = body.data.find(
			(k: { userId: string }) => k.userId === userId,
		);
		assert.ok(user1);
		assert.strictEqual(user1.apiKey, "test-api-key-123");
		assert.strictEqual(user1.secretKey, "test-secret-key-456");

		const user2 = body.data.find(
			(k: { userId: string }) => k.userId === userId2,
		);
		assert.ok(user2);
		assert.strictEqual(user2.apiKey, "key-user-456");
		assert.strictEqual(user2.secretKey, "secret-user-456");
	});
});

describe("getAllActiveApiKeys (service)", () => {
	const userIdA = "get-all-active-a";
	const userIdB = "get-all-active-b";

	before(async () => {
		await connectDatabase();
		// Clean api_keys collection — integration test isolation
		const db = (await import("../../config/database")).getDb();
		await db.collection("api_keys").deleteMany({});
	});

	after(async () => {
		const db = (await import("../../config/database")).getDb();
		await db.collection("api_keys").deleteMany({});
		await disconnectDatabase();
	});

	it("returns decrypted keys for all stored users", async () => {
		await storeApiKeys(userIdA, "api-key-a", "secret-key-a", "UserA");
		await storeApiKeys(userIdB, "api-key-b", "secret-key-b", "UserB");

		const keys = await getAllActiveApiKeys();
		assert.strictEqual(keys.length, 2);

		const a = keys.find((k) => k.userId === userIdA)!;
		assert.strictEqual(a.apiKey, "api-key-a");
		assert.strictEqual(a.secretKey, "secret-key-a");

		const b = keys.find((k) => k.userId === userIdB)!;
		assert.strictEqual(b.apiKey, "api-key-b");
		assert.strictEqual(b.secretKey, "secret-key-b");
	});
});

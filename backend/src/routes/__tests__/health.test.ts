// ============================================
// HEALTH ROUTE TESTS
// ============================================

import { describe, it } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import { healthRoutes } from "../health";

describe("GET /health", () => {
	it("should return health status", async () => {
		const app = Fastify({ logger: false });
		await app.register(healthRoutes);

		const res = await app.inject({
			method: "GET",
			url: "/health",
		});

		assert.strictEqual(res.statusCode, 200);
		assert.ok(String(res.headers["content-type"]).includes("application/json"));

		const body = JSON.parse(res.body);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.data.status, "ok");
		assert.strictEqual(body.data.service, "cryptoinvestor-api");

		await app.close();
	});
});

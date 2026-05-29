// ============================================
// HEALTH CHECK ROUTE
// ============================================

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
	app.get("/health", async (_request, reply) => {
		reply.send({
			success: true,
			data: { status: "ok", service: "cryptoinvestor-api", version: "1.0.0" },
		});
	});
}

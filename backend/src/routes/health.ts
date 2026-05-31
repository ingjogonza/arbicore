// ============================================
// HEALTH CHECK ROUTE
// ============================================

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
	app.get(
		"/health",
		{
			schema: {
				tags: ["Health"],
				summary: "Health check endpoint",
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									status: { type: "string" },
									service: { type: "string" },
									version: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		async (_request, reply) => {
			reply.send({
				success: true,
				data: { status: "ok", service: "cryptoinvestor-api", version: "1.0.0" },
			});
		},
	);
}

// ============================================
// DASHBOARD ROUTE — GET /api/dashboard/summary
// ============================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDashboardSummary } from "../services/dashboardService";
import { UnauthorizedError } from "../utils/errors";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
	app.get(
		"/api/dashboard/summary",
		{
			schema: {
				tags: ["Dashboard"],
				summary: "Get consolidated dashboard data from Binance",
				security: [{ bearerAuth: [] }],
				querystring: {
					type: "object",
					properties: {
						refresh: { type: "string", enum: ["true"] },
					},
				},
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								additionalProperties: true,
								properties: {
									balances: { type: ["array", "null"] },
									trades: { type: ["array", "null"] },
									equityHistory: { type: ["array", "null"] },
									initialBalance: {
										// InitialOperation | null — earliest deposit or transfer
										type: ["object", "null"],
										additionalProperties: false,
										properties: {
											type: {
												type: "string",
												enum: ["deposit", "transfer"],
											},
											coin: { type: "string" },
											amount: { type: "number" },
											time: { type: "number" },
										},
										required: ["type", "coin", "amount", "time"],
									},
									botStatus: {
										type: "object",
										additionalProperties: true,
										properties: {
											active: { type: "boolean" },
											runningSince: { type: ["string", "null"] },
											strategy: { type: "string" },
										},
									},
								},
							},
							errors: {
								type: "array",
								items: {
									type: "object",
									properties: {
										source: { type: "string" },
										message: { type: "string" },
										code: { type: "string" },
									},
								},
							},
						},
					},
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!request.user) {
				throw new UnauthorizedError();
			}

			const userId = request.user.sub;
			// v1: no caching. Future: check ?refresh=true query param.

			const result = await getDashboardSummary(userId);

			reply.send({
				success: true,
				data: result.data,
				...(result.errors.length > 0 ? { errors: result.errors } : {}),
			});
		},
	);
}

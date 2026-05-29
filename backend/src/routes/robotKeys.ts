// ============================================
// ROBOT KEYS ROUTE (mTLS-only in PR 3)
// ============================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getApiKeys } from "../services/keysService";
import { NotFoundError } from "../utils/errors";

export async function robotKeysRoutes(app: FastifyInstance): Promise<void> {
	// GET /api/keys/:userId — returns decrypted keys for the robot
	// In PR 3 this route will be protected by mTLS
	app.get(
		"/api/keys/:userId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { userId } = request.params as { userId: string };

			if (!userId || typeof userId !== "string") {
				reply.status(400).send({
					success: false,
					error: { code: "VALIDATION_ERROR", message: "userId is required" },
				});
				return;
			}

			try {
				const keys = await getApiKeys(userId);
				reply.send({
					success: true,
					data: {
						userId,
						apiKey: keys.apiKey,
						secretKey: keys.secretKey,
						label: keys.label,
					},
				});
			} catch (err) {
				if (err instanceof NotFoundError) {
					reply.status(404).send({
						success: false,
						error: { code: "NOT_FOUND", message: err.message },
					});
					return;
				}
				throw err;
			}
		},
	);
}

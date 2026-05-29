// ============================================
// API KEYS ROUTES (user-facing, JWT auth)
// ============================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	storeApiKeys,
	getApiKeys,
	deleteApiKeys,
	hasApiKeys,
} from "../services/keysService";
import { ValidationError, UnauthorizedError } from "../utils/errors";

const storeKeysSchema = z.object({
	apiKey: z.string().min(1, "API key is required"),
	secretKey: z.string().min(1, "Secret key is required"),
	label: z.string().optional(),
});

export async function keysRoutes(app: FastifyInstance): Promise<void> {
	// POST /api/keys — store encrypted API keys
	app.post("/api/keys", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();

		const parsed = storeKeysSchema.safeParse(request.body);
		if (!parsed.success) {
			throw new ValidationError(
				parsed.error.issues.map((i) => i.message).join("; "),
			);
		}

		const { apiKey, secretKey, label } = parsed.data;
		const doc = await storeApiKeys(
			request.user.sub,
			apiKey,
			secretKey,
			label || "Binance",
		);

		request.log.info(
			{ userId: request.user.sub, action: "store_api_keys" },
			"API keys stored",
		);

		reply.status(201).send({
			success: true,
			data: {
				id: doc._id,
				label: doc.label,
				isActive: doc.isActive,
				createdAt: doc.createdAt,
			},
		});
	});

	// GET /api/keys/status — check if user has stored keys
	app.get("/api/keys/status", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();

		const hasKeys = await hasApiKeys(request.user.sub);
		reply.send({ success: true, data: { hasKeys } });
	});

	// DELETE /api/keys — delete stored keys
	app.delete("/api/keys", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();

		await deleteApiKeys(request.user.sub);
		request.log.info(
			{ userId: request.user.sub, action: "delete_api_keys" },
			"API keys deleted",
		);
		reply.send({ success: true, data: { deleted: true } });
	});
}

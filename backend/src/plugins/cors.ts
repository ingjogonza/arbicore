// ============================================
// CORS PLUGIN (public server only)
// ============================================

import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env";

function parseOrigins(raw: string): string | string[] {
	const trimmed = raw.trim();
	if (!trimmed.includes(",")) {
		return trimmed;
	}
	return trimmed.split(",").map((o) => o.trim()).filter(Boolean);
}

export async function registerCors(app: FastifyInstance): Promise<void> {
	await app.register(cors, {
		origin: parseOrigins(env.CORS_ORIGIN),
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	});
}

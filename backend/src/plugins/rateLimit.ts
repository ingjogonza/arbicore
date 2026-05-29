// ============================================
// RATE LIMITING PLUGIN
// ============================================

import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env";

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
	await app.register(rateLimit, {
		max: env.RATE_LIMIT_MAX,
		timeWindow: `${env.RATE_LIMIT_WINDOW_MINUTES} minute`,
		keyGenerator: (request) => {
			// Use authenticated user ID if available, else IP
			return request.user?.sub || request.ip;
		},
		errorResponseBuilder: (_req, context) => ({
			statusCode: 429,
			error: "Too Many Requests",
			message: `Rate limit exceeded. Retry after ${context.after}`,
			retryAfter: context.after,
		}),
	});
}

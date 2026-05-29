// ============================================
// LOGGER CONFIGURATION (Pino)
// ============================================

import type { FastifyInstance } from "fastify";

export function configureLogger(app: FastifyInstance): void {
	// Pino is built into Fastify. We add hooks for structured request/response logging.
	app.addHook("onRequest", async (request) => {
		request.log.info(
			{
				req: {
					id: request.id,
					method: request.method,
					url: request.url,
					ip: request.ip,
				},
			},
			"Incoming request",
		);
	});

	app.addHook("onSend", async (request, reply, _payload) => {
		request.log.info(
			{ res: { statusCode: reply.statusCode, duration: reply.elapsedTime } },
			"Response sent",
		);
	});
}

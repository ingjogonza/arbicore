// ============================================
// SERVER BOOTSTRAP (dual ports)
// ============================================

import Fastify from "fastify";
import { createServer } from "https";
import type { Server } from "https";
import type { FastifyInstance } from "fastify";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { registerCors } from "./plugins/cors";
import { registerAuth } from "./plugins/auth";
import { registerRateLimit } from "./plugins/rateLimit";
import { getTlsOptions } from "./plugins/mtls";
import { configureLogger } from "./plugins/logger";
import { setupErrorHandler } from "./utils/errors";
import { healthRoutes } from "./routes/health";
import { keysRoutes } from "./routes/keys";
import { legalDocsRoutes } from "./routes/legalDocs";
import { profileRoutes } from "./routes/profile";
import { authRoutes } from "./routes/auth";
import { robotKeysRoutes } from "./routes/robotKeys";

async function buildPublicServer() {
	const app = Fastify({
		logger: {
			level: process.env.LOG_LEVEL || "info",
			redact: [
				"req.headers.authorization",
				"body.apiKey",
				"body.secretKey",
				"body.password",
			],
		},
		trustProxy: true,
	});

	configureLogger(app);

	await registerCors(app);
	await registerAuth(app);
	await registerRateLimit(app);
	setupErrorHandler(app);

	await app.register(healthRoutes);
	await app.register(keysRoutes);
	await app.register(legalDocsRoutes);
	await app.register(profileRoutes);
	await app.register(authRoutes);

	return app;
}

async function buildRobotServer(): Promise<FastifyInstance> {
	const tlsOptions = getTlsOptions();

	let httpsServer: Server | undefined;

	if (tlsOptions) {
		httpsServer = createServer({
			key: tlsOptions.key,
			cert: tlsOptions.cert,
			ca: tlsOptions.ca,
			requestCert: tlsOptions.requestCert,
			rejectUnauthorized: tlsOptions.rejectUnauthorized,
		});
	}

	const app = Fastify({
		logger: true,
		serverFactory: httpsServer
			? (handler) => {
					httpsServer!.on("request", handler);
					return httpsServer!;
				}
			: undefined,
	});

	if (tlsOptions) {
		app.log.info("[mTLS] Robot server configured with mutual TLS");
	} else {
		app.log.warn(
			"[mTLS] Robot server running WITHOUT mTLS. Configure TLS_* env vars for production.",
		);
	}

	setupErrorHandler(app);
	await app.register(robotKeysRoutes);

	return app;
}

async function main() {
	try {
		await connectDatabase();

		const publicApp = await buildPublicServer();
		const robotApp = await buildRobotServer();

		await publicApp.listen({ port: env.PORT, host: "0.0.0.0" });
		publicApp.log.info(
			`🚀 Public API server running on http://0.0.0.0:${env.PORT}`,
		);

		const robotProtocol = getTlsOptions() ? "https" : "http";
		await robotApp.listen({ port: env.ROBOT_PORT, host: "0.0.0.0" });
		robotApp.log.info(
			`🤖 Robot API server running on ${robotProtocol}://0.0.0.0:${env.ROBOT_PORT}`,
		);
	} catch (err) {
		console.error("Failed to start server:", err);
		process.exit(1);
	}
}

main();

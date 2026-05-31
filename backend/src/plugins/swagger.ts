// ============================================
// SWAGGER / OPENAPI PLUGIN (public server)
// ============================================

import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "../config/env";

export async function registerSwagger(app: FastifyInstance): Promise<void> {
	await app.register(swagger, {
		openapi: {
			info: {
				title: "CryptoInvestor API",
				description: "Backend API for algorithmic trading platform",
				version: "1.0.0",
			},
			servers: [
				{
					url: `http://localhost:${env.PORT}`,
					description: "Development server",
				},
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "JWT",
						description: "Supabase JWT token from login",
					},
				},
			},
		},
	});

	await app.register(swaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: true,
		},
	});
}

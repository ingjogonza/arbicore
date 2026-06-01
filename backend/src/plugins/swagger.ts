// ============================================
// SWAGGER / OPENAPI PLUGIN (public server)
// ============================================
// Custom implementation: spec generado con @fastify/swagger,
// HTML servido manualmente con control total del token JWT
// para que el fetch del spec y las llamadas a la API
// incluyan automáticamente el token de autenticación.
// ============================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import swagger from "@fastify/swagger";
import { env } from "../config/env";

function generateSwaggerHTML(requestUrl: string): string {
	// Extract token from query string (puesto por el frontend al redirigir)
	const qs = requestUrl.includes("?") ? requestUrl.split("?")[1] : "";
	const params = new URLSearchParams(qs);
	const token = params.get("token") || "";

	return `<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>CryptoInvestor API - Documentaci&oacute;n</title>
	<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
	<style>
		html { box-sizing: border-box; overflow-y: scroll; }
		*, *:before, *:after { box-sizing: inherit; }
		body { margin: 0; background: #fafafa; }
	</style>
</head>
<body>
	<div id="swagger-ui"></div>
	<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
	<script>
		var token = ${JSON.stringify(token)};
		var specUrl = "/docs/json" + (token ? "?token=" + encodeURIComponent(token) : "");

		SwaggerUIBundle({
			url: specUrl,
			dom_id: "#swagger-ui",
			presets: [
				SwaggerUIBundle.presets.apis,
				SwaggerUIBundle.SwaggerUIStandalonePreset,
			],
			layout: "BaseLayout",
			deepLinking: true,
			docExpansion: "list",
			requestInterceptor: function (req) {
				if (token) {
					req.headers["Authorization"] = "Bearer " + token;
				}
				return req;
			},
		});
	</script>
</body>
</html>`;
}

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
					description: "Local development",
				},
				{
					url: "https://api.glsolutions.tech",
					description: "Production (Raspberry Pi 5)",
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

	// Custom /docs — HTML con requestInterceptor que pasa el token
	// a TODAS las requests (spec + API calls), no solo al Authorize button
	app.get("/docs", async (request: FastifyRequest, reply: FastifyReply) => {
		reply.type("text/html").send(generateSwaggerHTML(request.url));
	});

	// Expose raw OpenAPI spec (accede via auth plugin con token en query param)
	app.get(
		"/docs/json",
		async (_request: FastifyRequest, reply: FastifyReply) => {
			reply.send(app.swagger());
		},
	);
}

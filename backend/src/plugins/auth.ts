// ============================================
// SUPABASE JWT VERIFICATION PLUGIN
// ============================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../config/supabase";
import { getOrCacheProfile } from "../services/userProfileService";
import { UnauthorizedError } from "../utils/errors";

const PUBLIC_PATHS = ["/health", "/api/legal-docs/required"];

const SWAGGER_ALLOWED_EMAILS = [
	"jorge.gonzalez@glsolutions.tech",
	"carlos.lameda@glsolutions.tech",
];

function extractToken(request: FastifyRequest): string | null {
	const authHeader = request.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice(7);
	}
	// Fallback: query param for Swagger browser access
	const qs = request.url.indexOf("?");
	if (qs >= 0) {
		const params = new URLSearchParams(request.url.slice(qs + 1));
		return params.get("token");
	}
	return null;
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
	app.addHook(
		"onRequest",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const urlPath = request.url.split("?")[0];

			// Skip auth for public paths
			if (PUBLIC_PATHS.some((p) => urlPath === p || urlPath.startsWith(p))) {
				return;
			}

			// Swagger docs: JWT required + email whitelist
			if (urlPath.startsWith("/docs")) {
				const token = extractToken(request);
				if (!token) {
					reply.status(401).send({
						success: false,
						error: {
							code: "UNAUTHORIZED",
							message:
								"Debes iniciar sesión en app.glsolutions.tech y usar tu token JWT para acceder a la documentación API. Agrega ?token=TU_TOKEN a la URL o usa el header Authorization.",
						},
					});
					return;
				}

				try {
					const { data, error } = await supabaseAdmin.auth.getUser(token);
					if (error || !data.user) {
						throw new UnauthorizedError("Invalid or expired token");
					}

					const email = data.user.email || "";
					if (!SWAGGER_ALLOWED_EMAILS.includes(email)) {
						app.log.warn(
							{ email, action: "swagger_access_denied" },
							"Access denied to Swagger docs",
						);
						reply.status(403).send({
							success: false,
							error: {
								code: "FORBIDDEN",
								message:
									"No tienes acceso a la documentación API. Contacta al administrador.",
							},
						});
						return;
					}

					// Allow access to docs without setting request.user
					return;
				} catch {
					reply.status(401).send({
						success: false,
						error: {
							code: "UNAUTHORIZED",
							message: "Token inválido o expirado. Inicia sesión de nuevo.",
						},
					});
					return;
				}
			}

			// Normal JWT auth for protected endpoints
			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.status(401).send({
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Missing or invalid Authorization header",
					},
				});
				return;
			}

			const token = authHeader.slice(7);

			try {
				const { data, error } = await supabaseAdmin.auth.getUser(token);
				if (error || !data.user) {
					throw new UnauthorizedError("Invalid or expired token");
				}

				// Cache profile in MongoDB for faster subsequent lookups
				const profile = await getOrCacheProfile(data.user.id);

				request.user = {
					sub: data.user.id,
					email: data.user.email || profile.email || "",
					app_metadata: data.user.app_metadata,
					user_metadata: {
						first_name:
							(data.user.user_metadata?.first_name as string | undefined) ||
							profile.firstName,
						last_name:
							(data.user.user_metadata?.last_name as string | undefined) ||
							profile.lastName,
						phone:
							(data.user.user_metadata?.phone as string | undefined) ||
							profile.phone,
					},
				};
			} catch (err) {
				app.log.warn({ err }, "JWT verification failed");
				reply.status(401).send({
					success: false,
					error: { code: "UNAUTHORIZED", message: "Authentication failed" },
				});
			}
		},
	);
}

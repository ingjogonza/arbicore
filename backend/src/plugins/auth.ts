// ============================================
// SUPABASE JWT VERIFICATION PLUGIN
// ============================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../config/supabase";
import { getOrCacheProfile } from "../services/userProfileService";
import { UnauthorizedError } from "../utils/errors";

const PUBLIC_PATHS = ["/health", "/api/legal-docs/required", "/docs"];

export async function registerAuth(app: FastifyInstance): Promise<void> {
	app.addHook(
		"onRequest",
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Skip auth for public paths
			if (
				PUBLIC_PATHS.some((p) => request.url === p || request.url.startsWith(p))
			) {
				return;
			}

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

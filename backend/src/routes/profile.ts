// ============================================
// USER PROFILE ROUTE (uses cache)
// ============================================

import type { FastifyInstance } from "fastify";
import { getCachedProfile } from "../services/userProfileService";
import { UnauthorizedError } from "../utils/errors";

export async function profileRoutes(app: FastifyInstance): Promise<void> {
	// GET /api/profile — returns cached user profile
	app.get("/api/profile", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();

		const profile = await getCachedProfile(request.user.sub);

		reply.send({
			success: true,
			data: {
				userId: request.user.sub,
				email: request.user.email,
				firstName: request.user.user_metadata?.first_name || profile?.firstName,
				lastName: request.user.user_metadata?.last_name || profile?.lastName,
				cached: !!profile,
			},
		});
	});
}

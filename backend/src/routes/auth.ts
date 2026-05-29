// ============================================
// AUTH ROUTES (2FA endpoints)
// ============================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	generateSecret,
	verifyAndEnable,
	disable2FA,
	is2FAEnabled,
} from "../services/twoFactorService";
import { UnauthorizedError, ValidationError } from "../utils/errors";

const tokenSchema = z.object({
	token: z.string().length(6, "Token must be 6 digits"),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
	// POST /api/auth/2fa/setup — start setup, return QR code
	app.post("/api/auth/2fa/setup", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();
		const { secret, qrCodeUrl } = await generateSecret(
			request.user.sub,
			request.user.email,
		);
		request.log.info(
			{ userId: request.user.sub, action: "2fa_setup" },
			"2FA setup initiated",
		);
		reply.send({ success: true, data: { secret, qrCodeUrl } });
	});

	// POST /api/auth/2fa/verify — verify first code and enable 2FA
	app.post("/api/auth/2fa/verify", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();
		const parsed = tokenSchema.safeParse(request.body);
		if (!parsed.success) throw new ValidationError(parsed.error.message);

		const success = await verifyAndEnable(request.user.sub, parsed.data.token);
		if (!success) {
			reply.status(400).send({
				success: false,
				error: { code: "INVALID_TOKEN", message: "Invalid 2FA code" },
			});
			return;
		}
		request.log.info(
			{ userId: request.user.sub, action: "2fa_enabled" },
			"2FA enabled",
		);
		reply.send({ success: true, data: { enabled: true } });
	});

	// POST /api/auth/2fa/disable
	app.post("/api/auth/2fa/disable", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();
		await disable2FA(request.user.sub);
		request.log.info(
			{ userId: request.user.sub, action: "2fa_disabled" },
			"2FA disabled",
		);
		reply.send({ success: true, data: { disabled: true } });
	});

	// GET /api/auth/2fa/status
	app.get("/api/auth/2fa/status", async (request, reply) => {
		if (!request.user) throw new UnauthorizedError();
		const enabled = await is2FAEnabled(request.user.sub);
		reply.send({ success: true, data: { enabled } });
	});
}

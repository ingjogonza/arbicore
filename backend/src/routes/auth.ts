// ============================================
// AUTH ROUTES (2FA endpoints + recovery)
// ============================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	generateSecret,
	verifyAndEnable,
	disable2FA,
	is2FAEnabled,
	recoverWithCode,
} from "../services/twoFactorService";
import { UnauthorizedError, ValidationError } from "../utils/errors";

const tokenSchema = z.object({
	token: z.string().length(6, "Token must be 6 digits"),
});

const recoveryCodeSchema = z.object({
	code: z.string().min(1, "Recovery code is required"),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
	// POST /api/auth/2fa/setup — start setup, return QR code + recovery codes
	app.post(
		"/api/auth/2fa/setup",
		{
			schema: {
				tags: ["2FA"],
				summary: "Start 2FA setup, return QR code and recovery codes",
				security: [{ bearerAuth: [] }],
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									secret: { type: "string" },
									qrCodeUrl: { type: "string" },
									recoveryCodes: {
										type: "array",
										items: { type: "string" },
									},
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			if (!request.user) throw new UnauthorizedError();
			const result = await generateSecret(request.user.sub, request.user.email);
			request.log.info(
				{ userId: request.user.sub, action: "2fa_setup" },
				"2FA setup initiated",
			);
			reply.send({
				success: true,
				data: {
					secret: result.secret,
					qrCodeUrl: result.qrCodeUrl,
					recoveryCodes: result.recoveryCodes,
				},
			});
		},
	);

	// POST /api/auth/2fa/verify — verify first code and enable 2FA
	app.post(
		"/api/auth/2fa/verify",
		{
			schema: {
				tags: ["2FA"],
				summary: "Verify 2FA code and enable 2FA",
				security: [{ bearerAuth: [] }],
				body: {
					type: "object",
					required: ["token"],
					properties: {
						token: {
							type: "string",
							minLength: 6,
							maxLength: 6,
							description: "6-digit 2FA code",
						},
					},
				},
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
								},
							},
						},
					},
					400: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							error: {
								type: "object",
								properties: {
									code: { type: "string" },
									message: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			if (!request.user) throw new UnauthorizedError();
			const parsed = tokenSchema.safeParse(request.body);
			if (!parsed.success) throw new ValidationError(parsed.error.message);

			const success = await verifyAndEnable(
				request.user.sub,
				parsed.data.token,
			);
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
		},
	);

	// POST /api/auth/2fa/disable
	app.post(
		"/api/auth/2fa/disable",
		{
			schema: {
				tags: ["2FA"],
				summary: "Disable 2FA for the authenticated user",
				security: [{ bearerAuth: [] }],
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									disabled: { type: "boolean" },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			if (!request.user) throw new UnauthorizedError();
			await disable2FA(request.user.sub);
			request.log.info(
				{ userId: request.user.sub, action: "2fa_disabled" },
				"2FA disabled",
			);
			reply.send({ success: true, data: { disabled: true } });
		},
	);

	// GET /api/auth/2fa/status
	app.get(
		"/api/auth/2fa/status",
		{
			schema: {
				tags: ["2FA"],
				summary: "Check if 2FA is enabled",
				security: [{ bearerAuth: [] }],
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			if (!request.user) throw new UnauthorizedError();
			const enabled = await is2FAEnabled(request.user.sub);
			reply.send({ success: true, data: { enabled } });
		},
	);

	// POST /api/auth/2fa/recovery — verify a recovery code and disable 2FA
	app.post(
		"/api/auth/2fa/recovery",
		{
			schema: {
				tags: ["2FA"],
				summary: "Verify a recovery code to disable 2FA (lost device)",
				security: [{ bearerAuth: [] }],
				body: {
					type: "object",
					required: ["code"],
					properties: {
						code: {
							type: "string",
							description: "Recovery code (e.g. AB12-CD34-EF56)",
						},
					},
				},
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									disabled: { type: "boolean" },
									message: { type: "string" },
								},
							},
						},
					},
					400: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							error: {
								type: "object",
								properties: {
									code: { type: "string" },
									message: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			if (!request.user) throw new UnauthorizedError();
			const parsed = recoveryCodeSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400).send({
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: parsed.error.message,
					},
				});
				return;
			}

			const result = await recoverWithCode(request.user.sub, parsed.data.code);
			if (!result.success) {
				reply.status(400).send({
					success: false,
					error: { code: "INVALID_RECOVERY_CODE", message: result.message },
				});
				return;
			}

			request.log.info(
				{ userId: request.user.sub, action: "2fa_recovery_used" },
				"2FA disabled via recovery code",
			);
			reply.send({
				success: true,
				data: { disabled: true, message: result.message },
			});
		},
	);
}

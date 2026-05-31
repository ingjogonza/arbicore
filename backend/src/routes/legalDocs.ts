// ============================================
// LEGAL DOCUMENTS ROUTES
// ============================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	acceptLegalDoc,
	getAcceptedLegalDocs,
	hasAcceptedAllLegalDocs,
	getRequiredDocsList,
} from "../services/legalDocsService";
import { UnauthorizedError } from "../utils/errors";

const acceptDocSchema = z.object({
	docId: z.string().min(1),
});

export async function legalDocsRoutes(app: FastifyInstance): Promise<void> {
	// GET /api/legal-docs/required — public list of required docs
	app.get(
		"/api/legal-docs/required",
		{
			schema: {
				tags: ["Legal Docs"],
				summary: "Get list of required legal documents",
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									requiredDocs: {
										type: "array",
										items: {
											type: "object",
											properties: {
												id: { type: "string" },
												title: { type: "string" },
												description: { type: "string" },
												required: { type: "boolean" },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		async (_request, reply) => {
			reply.send({
				success: true,
				data: { requiredDocs: getRequiredDocsList() },
			});
		},
	);

	// POST /api/legal-docs/accept — accept a legal document
	app.post(
		"/api/legal-docs/accept",
		{
			schema: {
				tags: ["Legal Docs"],
				summary: "Accept a legal document",
				security: [{ bearerAuth: [] }],
				body: {
					type: "object",
					properties: {
						docId: {
							type: "string",
							description: "Document ID (e.g. tos, risk, api-auth, no-custody)",
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
									accepted: { type: "boolean" },
									docId: { type: "string" },
								},
							},
						},
					},
				},
			},
		},
		async (request, reply) => {
			if (!request.user) throw new UnauthorizedError();

			const parsed = acceptDocSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.status(400).send({
					success: false,
					error: { code: "VALIDATION_ERROR", message: parsed.error.message },
				});
				return;
			}

			const { docId } = parsed.data;
			const ipAddress = request.ip;
			await acceptLegalDoc(request.user.sub, docId, ipAddress);

			reply.send({ success: true, data: { accepted: true, docId } });
		},
	);

	// GET /api/legal-docs/status — check which docs user has accepted
	app.get(
		"/api/legal-docs/status",
		{
			schema: {
				tags: ["Legal Docs"],
				summary: "Check accepted legal documents status",
				security: [{ bearerAuth: [] }],
				response: {
					200: {
						type: "object",
						properties: {
							success: { type: "boolean" },
							data: {
								type: "object",
								properties: {
									allAccepted: { type: "boolean" },
									acceptedCount: { type: "integer" },
									requiredCount: { type: "integer" },
									acceptedDocs: {
										type: "array",
										items: {
											type: "object",
											properties: {
												docId: { type: "string" },
												title: { type: "string" },
												acceptedAt: { type: "string", format: "date-time" },
											},
										},
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

			const [acceptedDocs, allAccepted] = await Promise.all([
				getAcceptedLegalDocs(request.user.sub),
				hasAcceptedAllLegalDocs(request.user.sub),
			]);

			reply.send({
				success: true,
				data: {
					allAccepted,
					acceptedCount: acceptedDocs.length,
					requiredCount: getRequiredDocsList().length,
					acceptedDocs: acceptedDocs.map((d) => ({
						docId: d.docId,
						title: d.title,
						acceptedAt: d.acceptedAt,
					})),
				},
			});
		},
	);
}

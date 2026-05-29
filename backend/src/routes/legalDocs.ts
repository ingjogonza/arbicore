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
	app.get("/api/legal-docs/required", async (_request, reply) => {
		reply.send({
			success: true,
			data: { requiredDocs: getRequiredDocsList() },
		});
	});

	// POST /api/legal-docs/accept — accept a legal document
	app.post("/api/legal-docs/accept", async (request, reply) => {
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
	});

	// GET /api/legal-docs/status — check which docs user has accepted
	app.get("/api/legal-docs/status", async (request, reply) => {
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
	});
}

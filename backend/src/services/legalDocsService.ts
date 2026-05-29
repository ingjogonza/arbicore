// ============================================
// LEGAL DOCUMENTS BUSINESS LOGIC
// ============================================

import { getDb } from "../config/database";
import type { LegalDocRecord } from "../types";

const REQUIRED_DOCS = [
	{ id: "tos", title: "Términos de Servicio" },
	{ id: "risk", title: "Divulgación de Riesgos" },
	{ id: "api-auth", title: "Autorización de API" },
	{ id: "no-custody", title: "Política de No Custodia" },
];

export async function acceptLegalDoc(
	userId: string,
	docId: string,
	ipAddress?: string,
): Promise<void> {
	const db = getDb();
	const collection = db.collection<LegalDocRecord>("legal_docs");

	const docInfo = REQUIRED_DOCS.find((d) => d.id === docId);
	if (!docInfo) return;

	await collection.updateOne(
		{ userId, docId },
		{
			$set: {
				userId,
				docId,
				title: docInfo.title,
				acceptedAt: new Date(),
				ipAddress,
			},
		},
		{ upsert: true },
	);
}

export async function getAcceptedLegalDocs(
	userId: string,
): Promise<LegalDocRecord[]> {
	const db = getDb();
	const collection = db.collection<LegalDocRecord>("legal_docs");
	return collection.find({ userId }).toArray();
}

export async function hasAcceptedAllLegalDocs(
	userId: string,
): Promise<boolean> {
	const db = getDb();
	const collection = db.collection<LegalDocRecord>("legal_docs");
	const count = await collection.countDocuments({ userId });
	return count >= REQUIRED_DOCS.length;
}

export function getRequiredDocsList(): { id: string; title: string }[] {
	return REQUIRED_DOCS.map((d) => ({ id: d.id, title: d.title }));
}

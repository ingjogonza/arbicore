// ============================================
// LEGAL DOCS SERVICE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import {
	acceptLegalDoc,
	getAcceptedLegalDocs,
	hasAcceptedAllLegalDocs,
	getRequiredDocsList,
} from "../legalDocsService";

describe("LegalDocsService", () => {
	const userId = "legal-docs-test-user-123";

	before(async () => {
		await connectDatabase();
		// Clean any previous state
		const db = (await import("../../config/database")).getDb();
		await db.collection("legal_docs").deleteMany({ userId });
	});

	after(async () => {
		const db = (await import("../../config/database")).getDb();
		await db.collection("legal_docs").deleteMany({ userId });
		await disconnectDatabase();
	});

	it("getRequiredDocsList returns 4 documents", () => {
		const docs = getRequiredDocsList();
		assert.strictEqual(docs.length, 4);
		assert.ok(docs.some((d) => d.id === "tos"));
		assert.ok(docs.some((d) => d.id === "risk"));
		assert.ok(docs.some((d) => d.id === "api-auth"));
		assert.ok(docs.some((d) => d.id === "no-custody"));
	});

	it("hasAcceptedAllLegalDocs returns false initially", async () => {
		const result = await hasAcceptedAllLegalDocs(userId);
		assert.strictEqual(result, false);
	});

	it("acceptLegalDoc stores a document acceptance", async () => {
		await acceptLegalDoc(userId, "tos", "127.0.0.1");
		const accepted = await getAcceptedLegalDocs(userId);
		assert.strictEqual(accepted.length, 1);
		assert.strictEqual(accepted[0].docId, "tos");
		assert.strictEqual(accepted[0].title, "Términos de Servicio");
		assert.strictEqual(accepted[0].ipAddress, "127.0.0.1");
	});

	it("acceptLegalDoc ignores invalid docId", async () => {
		await acceptLegalDoc(userId, "invalid-doc", "127.0.0.1");
		const accepted = await getAcceptedLegalDocs(userId);
		// Should still be 1 because invalid-doc is not in REQUIRED_DOCS
		assert.strictEqual(accepted.length, 1);
	});

	it("hasAcceptedAllLegalDocs returns true when all required docs accepted", async () => {
		const required = getRequiredDocsList();
		for (const doc of required) {
			if (doc.id !== "tos") {
				await acceptLegalDoc(userId, doc.id);
			}
		}
		const result = await hasAcceptedAllLegalDocs(userId);
		assert.strictEqual(result, true);
	});

	it("getAcceptedLegalDocs returns all accepted documents", async () => {
		const accepted = await getAcceptedLegalDocs(userId);
		assert.strictEqual(accepted.length, 4);
		const ids = accepted.map((d) => d.docId).sort();
		assert.deepStrictEqual(ids, ["api-auth", "no-custody", "risk", "tos"]);
	});
});

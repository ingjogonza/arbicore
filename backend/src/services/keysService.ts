// ============================================
// API KEYS BUSINESS LOGIC
// ============================================

import { getDb } from "../config/database";
import { encrypt, decrypt } from "./encryption";
import type { ApiKeyDoc, EncryptedData } from "../types";
import { NotFoundError, ConflictError } from "../utils/errors";

interface EncryptedKeys {
	apiKeyEncrypted: string;
	secretKeyEncrypted: string;
}

function serializeEncrypted(data: EncryptedData): string {
	return JSON.stringify(data);
}

function deserializeEncrypted(json: string): EncryptedData {
	return JSON.parse(json) as EncryptedData;
}

export async function storeApiKeys(
	userId: string,
	apiKey: string,
	secretKey: string,
	label: string,
): Promise<ApiKeyDoc> {
	const db = getDb();
	const collection = db.collection<ApiKeyDoc>("api_keys");

	const existing = await collection.findOne({ userId });
	if (existing) {
		throw new ConflictError(
			"API keys already stored for this user. Delete them first.",
		);
	}

	const encryptedApiKey = encrypt(apiKey);
	const encryptedSecretKey = encrypt(secretKey);

	const now = new Date();
	const doc: ApiKeyDoc = {
		userId,
		apiKeyEncrypted: serializeEncrypted(encryptedApiKey),
		secretKeyEncrypted: serializeEncrypted(encryptedSecretKey),
		label: label || "Binance",
		isActive: true,
		createdAt: now,
		updatedAt: now,
	};

	await collection.insertOne(doc);
	return doc;
}

export async function getApiKeys(
	userId: string,
): Promise<{ apiKey: string; secretKey: string; label: string }> {
	const db = getDb();
	const collection = db.collection<ApiKeyDoc>("api_keys");

	const doc = await collection.findOne({ userId });
	if (!doc) {
		throw new NotFoundError("API keys not found for this user");
	}

	const apiKey = decrypt(deserializeEncrypted(doc.apiKeyEncrypted));
	const secretKey = decrypt(deserializeEncrypted(doc.secretKeyEncrypted));

	return { apiKey, secretKey, label: doc.label };
}

export async function deleteApiKeys(userId: string): Promise<void> {
	const db = getDb();
	const collection = db.collection<ApiKeyDoc>("api_keys");

	const result = await collection.deleteOne({ userId });
	if (result.deletedCount === 0) {
		throw new NotFoundError("API keys not found for this user");
	}
}

export async function hasApiKeys(userId: string): Promise<boolean> {
	const db = getDb();
	const collection = db.collection<ApiKeyDoc>("api_keys");
	const count = await collection.countDocuments({ userId });
	return count > 0;
}

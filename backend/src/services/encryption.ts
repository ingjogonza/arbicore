// ============================================
// AES-256-GCM ENCRYPTION / DECRYPTION
// ============================================

import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive a fixed key from MASTER_KEY using a salt stored with each ciphertext
function deriveKey(masterKey: string, salt: Buffer): Buffer {
	return scryptSync(masterKey, salt, KEY_LENGTH);
}

export interface EncryptedData {
	iv: string;
	salt: string;
	authTag: string;
	ciphertext: string;
}

export function encrypt(plaintext: string): EncryptedData {
	const salt = randomBytes(SALT_LENGTH);
	const iv = randomBytes(IV_LENGTH);
	const key = deriveKey(env.MASTER_KEY, salt);

	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return {
		iv: iv.toString("base64"),
		salt: salt.toString("base64"),
		authTag: authTag.toString("base64"),
		ciphertext: encrypted.toString("base64"),
	};
}

export function decrypt(data: EncryptedData): string {
	const salt = Buffer.from(data.salt, "base64");
	const iv = Buffer.from(data.iv, "base64");
	const authTag = Buffer.from(data.authTag, "base64");
	const encrypted = Buffer.from(data.ciphertext, "base64");

	const key = deriveKey(env.MASTER_KEY, salt);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([
		decipher.update(encrypted),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

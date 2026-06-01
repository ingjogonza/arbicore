// ============================================
// 2FA TOTP SERVICE + RECOVERY CODES
// ============================================

import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getDb } from "../config/database";
import { encrypt, decrypt } from "./encryption";
import type { TwoFactorDoc, TwoFactorSetupResult } from "../types";
import { NotFoundError, ValidationError } from "../utils/errors";

const COLLECTION = "two_factor";
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 12; // characters

export async function generateSecret(
	userId: string,
	email: string,
): Promise<TwoFactorSetupResult> {
	const db = getDb();
	const existing = await db
		.collection<TwoFactorDoc>(COLLECTION)
		.findOne({ userId });
	if (existing?.enabled) throw new ValidationError("2FA already enabled");

	const secret = speakeasy.generateSecret({
		name: `CryptoInvestor (${email})`,
		issuer: "CryptoInvestor",
	});

	const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

	// Generate recovery codes (plain text to show user, hashed to store)
	const plainCodes: string[] = [];
	const hashedCodes: { codeHash: string; used: boolean }[] = [];

	for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
		const code =
			crypto
				.randomBytes(RECOVERY_CODE_LENGTH / 2)
				.toString("hex")
				.toUpperCase()
				.match(/.{4}/g)
				?.join("-") ?? crypto.randomBytes(6).toString("hex").toUpperCase();

		plainCodes.push(code);
		hashedCodes.push({
			codeHash: crypto.createHash("sha256").update(code).digest("hex"),
			used: false,
		});
	}

	const encrypted = encrypt(secret.base32!);
	await db.collection<TwoFactorDoc>(COLLECTION).updateOne(
		{ userId },
		{
			$set: {
				userId,
				secretEncrypted: JSON.stringify(encrypted),
				enabled: false,
				createdAt: new Date(),
				recoveryCodes: hashedCodes,
			},
		},
		{ upsert: true },
	);

	return { secret: secret.base32!, qrCodeUrl, recoveryCodes: plainCodes };
}

export async function verifyAndEnable(
	userId: string,
	token: string,
): Promise<boolean> {
	const db = getDb();
	const doc = await db.collection<TwoFactorDoc>(COLLECTION).findOne({ userId });
	if (!doc) throw new NotFoundError("2FA setup not started");

	const secret = decrypt(JSON.parse(doc.secretEncrypted));
	const verified = speakeasy.totp.verify({
		secret,
		encoding: "base32",
		token,
		window: 2,
	});

	if (!verified) return false;

	// Remove recovery codes from the response - they were shown once during setup.
	// We keep them stored for future recovery.
	await db
		.collection<TwoFactorDoc>(COLLECTION)
		.updateOne({ userId }, { $set: { enabled: true } });
	return true;
}

export async function verifyToken(
	userId: string,
	token: string,
): Promise<boolean> {
	const db = getDb();
	const doc = await db
		.collection<TwoFactorDoc>(COLLECTION)
		.findOne({ userId, enabled: true });
	if (!doc) return false;

	const secret = decrypt(JSON.parse(doc.secretEncrypted));
	return speakeasy.totp.verify({
		secret,
		encoding: "base32",
		token,
		window: 2,
	});
}

export async function disable2FA(userId: string): Promise<void> {
	const db = getDb();
	await db.collection<TwoFactorDoc>(COLLECTION).deleteOne({ userId });
}

export async function is2FAEnabled(userId: string): Promise<boolean> {
	const db = getDb();
	const doc = await db
		.collection<TwoFactorDoc>(COLLECTION)
		.findOne({ userId, enabled: true });
	return !!doc;
}

export async function recoverWithCode(
	userId: string,
	code: string,
): Promise<{ success: boolean; message: string }> {
	const db = getDb();
	const doc = await db
		.collection<TwoFactorDoc>(COLLECTION)
		.findOne({ userId, enabled: true });
	if (!doc || !doc.recoveryCodes) {
		return { success: false, message: "No hay recuperación configurada." };
	}

	const codeHash = crypto.createHash("sha256").update(code).digest("hex");
	const matchIndex = doc.recoveryCodes.findIndex(
		(rc) => rc.codeHash === codeHash && !rc.used,
	);

	if (matchIndex === -1) {
		return {
			success: false,
			message: "Código de recuperación inválido o ya usado.",
		};
	}

	// Mark the code as used
	doc.recoveryCodes[matchIndex].used = true;
	doc.recoveryCodes[matchIndex].usedAt = new Date();

	// Disable 2FA and save
	await db.collection<TwoFactorDoc>(COLLECTION).updateOne(
		{ userId },
		{
			$set: {
				enabled: false,
				recoveryCodes: doc.recoveryCodes,
			},
		},
	);

	return {
		success: true,
		message:
			"2FA desactivado. Podés volver a configurarlo desde Configuración.",
	};
}

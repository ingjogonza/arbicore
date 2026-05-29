// ============================================
// 2FA TOTP SERVICE
// ============================================

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getDb } from "../config/database";
import { encrypt, decrypt } from "./encryption";
import type { TwoFactorDoc } from "../types";
import { NotFoundError, ValidationError } from "../utils/errors";

const COLLECTION = "two_factor";

export async function generateSecret(
	userId: string,
	email: string,
): Promise<{ secret: string; qrCodeUrl: string }> {
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

	const encrypted = encrypt(secret.base32!);
	await db
		.collection<TwoFactorDoc>(COLLECTION)
		.updateOne(
			{ userId },
			{
				$set: {
					userId,
					secretEncrypted: JSON.stringify(encrypted),
					enabled: false,
					createdAt: new Date(),
				},
			},
			{ upsert: true },
		);

	return { secret: secret.base32!, qrCodeUrl };
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

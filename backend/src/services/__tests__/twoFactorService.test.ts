// ============================================
// 2FA SERVICE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import speakeasy from "speakeasy";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import {
	generateSecret,
	verifyAndEnable,
	verifyToken,
	disable2FA,
	is2FAEnabled,
} from "../twoFactorService";

describe("TwoFactorService", () => {
	const userId = "test-2fa-user-123";
	const email = "2fa-test@cryptoinvestor.local";

	before(async () => {
		await connectDatabase();
		// Clean any leftover state
		await disable2FA(userId);
	});

	after(async () => {
		await disable2FA(userId);
		await disconnectDatabase();
	});

	it("generateSecret returns secret and QR code", async () => {
		const result = await generateSecret(userId, email);
		assert.ok(result.secret);
		assert.ok(result.qrCodeUrl);
		assert.ok(result.qrCodeUrl.startsWith("data:image/png;base64,"));
	});

	it("generateSecret throws if 2FA already enabled", async () => {
		const token = speakeasy.totp({
			secret: (await generateSecret(userId, email)).secret,
			encoding: "base32",
		});
		await verifyAndEnable(userId, token);
		assert.ok(await is2FAEnabled(userId));

		await assert.rejects(async () => {
			await generateSecret(userId, email);
		}, /2FA already enabled/);

		// cleanup for next tests
		await disable2FA(userId);
	});

	it("verifyAndEnable enables 2FA with valid token", async () => {
		const { secret } = await generateSecret(userId, email);
		const token = speakeasy.totp({ secret, encoding: "base32" });

		const success = await verifyAndEnable(userId, token);
		assert.strictEqual(success, true);
		assert.strictEqual(await is2FAEnabled(userId), true);
	});

	it("verifyAndEnable returns false with invalid token", async () => {
		// 2FA is already enabled from previous test; disable first
		await disable2FA(userId);
		await generateSecret(userId, email);

		const success = await verifyAndEnable(userId, "000000");
		assert.strictEqual(success, false);
		assert.strictEqual(await is2FAEnabled(userId), false);
	});

	it("verifyToken validates a correct TOTP token", async () => {
		await disable2FA(userId);
		const { secret } = await generateSecret(userId, email);
		const token = speakeasy.totp({ secret, encoding: "base32" });
		await verifyAndEnable(userId, token);

		const nextToken = speakeasy.totp({ secret, encoding: "base32" });
		const valid = await verifyToken(userId, nextToken);
		assert.strictEqual(valid, true);
	});

	it("verifyToken returns false when 2FA not enabled", async () => {
		await disable2FA(userId);
		const valid = await verifyToken(userId, "123456");
		assert.strictEqual(valid, false);
	});

	it("disable2FA removes 2FA record", async () => {
		await generateSecret(userId, email);
		const token = speakeasy.totp({
			secret: (await generateSecret(userId, email)).secret,
			encoding: "base32",
		});
		await verifyAndEnable(userId, token);
		assert.strictEqual(await is2FAEnabled(userId), true);

		await disable2FA(userId);
		assert.strictEqual(await is2FAEnabled(userId), false);
	});
});

// ============================================
// USER PROFILE SERVICE TESTS
// ============================================

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { connectDatabase, disconnectDatabase } from "../../config/database";
import { supabaseAdmin } from "../../config/supabase";
import {
	cacheUserProfile,
	getCachedProfile,
	getOrCacheProfile,
	invalidateProfileCache,
} from "../userProfileService";

describe("UserProfileService", () => {
	const testEmail = `profile-test-${Date.now()}@cryptoinvestor.local`;
	const testPassword = "TestPassword123!";
	let userId: string;

	before(async () => {
		await connectDatabase();

		const { data, error } = await supabaseAdmin.auth.admin.createUser({
			email: testEmail,
			password: testPassword,
			email_confirm: true,
			user_metadata: { first_name: "Test", last_name: "User" },
		});
		if (error) throw error;
		userId = data.user!.id;
	});

	after(async () => {
		await invalidateProfileCache(userId);
		await supabaseAdmin.auth.admin.deleteUser(userId);
		await disconnectDatabase();
	});

	it("cacheUserProfile fetches from Supabase and stores in MongoDB", async () => {
		const profile = await cacheUserProfile(userId);
		assert.strictEqual(profile.userId, userId);
		assert.strictEqual(profile.email, testEmail);
		assert.strictEqual(profile.firstName, "Test");
		assert.strictEqual(profile.lastName, "User");
		assert.ok(profile.lastVerifiedAt);
	});

	it("getCachedProfile returns cached document", async () => {
		const cached = await getCachedProfile(userId);
		assert.ok(cached);
		assert.strictEqual(cached!.userId, userId);
		assert.strictEqual(cached!.email, testEmail);
	});

	it("getOrCacheProfile returns cached if fresh", async () => {
		const profile = await getOrCacheProfile(userId);
		assert.strictEqual(profile.userId, userId);
		// Should be the same cached document, not a new fetch
		const cached = await getCachedProfile(userId);
		assert.strictEqual(
			profile.lastVerifiedAt.getTime(),
			cached!.lastVerifiedAt.getTime(),
		);
	});

	it("invalidateProfileCache removes the document", async () => {
		await invalidateProfileCache(userId);
		const cached = await getCachedProfile(userId);
		assert.strictEqual(cached, null);
	});

	it("getOrCacheProfile re-caches after invalidation", async () => {
		const profile = await getOrCacheProfile(userId);
		assert.strictEqual(profile.userId, userId);
		assert.strictEqual(profile.firstName, "Test");
	});

	it("cacheUserProfile throws if user not found in Supabase", async () => {
		await assert.rejects(async () => {
			// Use a valid UUID that does not exist in Supabase
			await cacheUserProfile("00000000-0000-0000-0000-000000000000");
		}, /User not found in Supabase/);
	});
});

// ============================================
// USER PROFILE CACHE SERVICE
// ============================================
// Reduces latency by caching Supabase user profiles in MongoDB.
// Falls back to Supabase on cache miss, then populates cache.

import { getDb } from "../config/database";
import { supabaseAdmin } from "../config/supabase";
import type { UserProfileCache } from "../types";
import { NotFoundError } from "../utils/errors";

const COLLECTION = "user_profiles";

export async function cacheUserProfile(
	userId: string,
): Promise<UserProfileCache> {
	const db = getDb();

	// Fetch from Supabase
	const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
	if (error || !data.user) {
		throw new NotFoundError(`User not found in Supabase: ${userId}`);
	}

	const profile: UserProfileCache = {
		userId: data.user.id,
		email: data.user.email || "",
		firstName: (data.user.user_metadata?.first_name as string) || undefined,
		lastName: (data.user.user_metadata?.last_name as string) || undefined,
		phone: (data.user.user_metadata?.phone as string) || undefined,
		lastVerifiedAt: new Date(),
	};

	// Upsert into MongoDB cache
	await db
		.collection<UserProfileCache>(COLLECTION)
		.updateOne({ userId: profile.userId }, { $set: profile }, { upsert: true });

	return profile;
}

export async function getCachedProfile(
	userId: string,
): Promise<UserProfileCache | null> {
	const db = getDb();
	return db.collection<UserProfileCache>(COLLECTION).findOne({ userId });
}

export async function getOrCacheProfile(
	userId: string,
): Promise<UserProfileCache> {
	const cached = await getCachedProfile(userId);
	if (cached) {
		// Refresh if older than 1 hour
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		if (cached.lastVerifiedAt > oneHourAgo) {
			return cached;
		}
	}
	return cacheUserProfile(userId);
}

export async function invalidateProfileCache(userId: string): Promise<void> {
	const db = getDb();
	await db.collection<UserProfileCache>(COLLECTION).deleteOne({ userId });
}

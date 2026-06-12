// ============================================
// CACHE SERVICE — MongoDB TTL-based cache
// ============================================

import { getDb } from "../config/database";

const COLLECTION = "cache";

interface CacheDocument {
	_id: string;
	data: unknown;
	expiresAt: Date;
}

/**
 * Get a cached value by key.
 * Returns null if key doesn't exist or is expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
	try {
		const db = getDb();
		const doc = await db
			.collection<CacheDocument>(COLLECTION)
			.findOne({ _id: key, expiresAt: { $gt: new Date() } });
		return (doc?.data as T) ?? null;
	} catch {
		return null;
	}
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function cacheSet<T>(
	key: string,
	data: T,
	ttlSeconds: number,
): Promise<void> {
	try {
		const db = getDb();
		await db.collection<CacheDocument>(COLLECTION).updateOne(
			{ _id: key },
			{
				$set: {
					data: data as unknown,
					expiresAt: new Date(Date.now() + ttlSeconds * 1000),
				},
			},
			{ upsert: true },
		);
		// Ensure TTL index exists (runs only once per collection write)
		await db
			.collection(COLLECTION)
			.createIndex(
				{ expiresAt: 1 },
				{ expireAfterSeconds: 0, background: true },
			)
			.catch(() => {
				/* ignore if index already exists */
			});
	} catch {
		// Silently fail — cache miss is acceptable
	}
}

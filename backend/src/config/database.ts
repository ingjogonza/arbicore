// ============================================
// MONGODB CONNECTION
// ============================================

import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
	if (db) return db;

	client = new MongoClient(env.MONGODB_URI);
	await client.connect();
	db = client.db("cryptoinvestor");

	// Create indexes
	await db.collection("api_keys").createIndex({ userId: 1 }, { unique: true });
	await db
		.collection("legal_docs")
		.createIndex({ userId: 1, docId: 1 }, { unique: true });
	await db
		.collection("user_profiles")
		.createIndex({ userId: 1 }, { unique: true });

	console.log("✅ MongoDB connected");
	return db;
}

export function getDb(): Db {
	if (!db)
		throw new Error("Database not connected. Call connectDatabase() first.");
	return db;
}

export async function disconnectDatabase(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
		console.log("MongoDB disconnected");
	}
}

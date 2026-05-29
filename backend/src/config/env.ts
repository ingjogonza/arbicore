// ============================================
// ENVIRONMENT CONFIGURATION (ZOD VALIDATED)
// ============================================

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
	PORT: z.string().default("3000").transform(Number),
	ROBOT_PORT: z.string().default("3001").transform(Number),
	MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
	SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
	SUPABASE_SERVICE_ROLE_KEY: z
		.string()
		.min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
	MASTER_KEY: z.string().min(1, "MASTER_KEY is required"),
	CORS_ORIGIN: z.string().default("http://localhost:5173"),
	RATE_LIMIT_MAX: z.string().default("100").transform(Number),
	RATE_LIMIT_WINDOW_MINUTES: z.string().default("1").transform(Number),
	TLS_CA_CERT: z.string().optional(),
	TLS_SERVER_CERT: z.string().optional(),
	TLS_SERVER_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("❌ Invalid environment variables:");
	for (const issue of parsed.error.issues) {
		console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

export const env = parsed.data;

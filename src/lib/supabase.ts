// ============================================
// SUPABASE CLIENT SINGLETON
// ============================================

/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn(
		"[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. " +
			"Auth features will not work. Copy .env.example to .env and fill your Supabase credentials.",
	);
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

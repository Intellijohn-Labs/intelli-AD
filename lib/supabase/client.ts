import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False when the NEXT_PUBLIC_SUPABASE_* variables are missing, so callers can degrade instead of crashing. */
export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Browser Supabase client (anon key; Row Level Security decides what it may do). Null when not configured. */
export function createClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(url!, anonKey!);
  return client;
}

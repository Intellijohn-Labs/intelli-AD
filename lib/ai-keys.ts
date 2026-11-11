import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AiKeys { gemini: string | null; claude: string | null }
export interface AiKeySource { gemini: "db" | "env" | null; claude: "db" | "env" | null }

/** API keys: the app_secrets table first (service role only), falling back to the server environment. */
export async function resolveAiKeys(admin: SupabaseClient | null): Promise<{ keys: AiKeys; source: AiKeySource }> {
  let db: { gemini?: string; claude?: string } = {};
  if (admin) {
    const { data } = await admin.from("app_secrets").select("value").eq("key", "ai_keys").maybeSingle();
    if (data?.value && typeof data.value === "object") db = data.value as typeof db;
  }
  const pick = (d: string | undefined, e: string | undefined) => (d?.trim() ? { k: d.trim(), s: "db" as const } : e?.trim() ? { k: e.trim(), s: "env" as const } : { k: null, s: null });
  const g = pick(db.gemini, process.env.GEMINI_API_KEY);
  const c = pick(db.claude, process.env.ANTHROPIC_API_KEY);
  return { keys: { gemini: g.k, claude: c.k }, source: { gemini: g.s, claude: c.s } };
}

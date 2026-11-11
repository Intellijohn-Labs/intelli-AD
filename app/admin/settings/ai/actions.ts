"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_MODELS, DEFAULT_AI_CONFIG, normalizeAiConfig, type AiConfig } from "@/lib/ai-config";
import { resolveAiKeys } from "@/lib/ai-keys";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

export interface AiSettingsState { config: AiConfig; keys: { gemini: KeyInfo; claude: KeyInfo }; serviceRole: boolean }
export interface KeyInfo { configured: boolean; source: "db" | "env" | null; hint: string | null }
export type SaveResult = { ok: boolean; message: string };

const KEY = "ai_config";

/** Admin only. Key presence is reported as booleans; the key values themselves never leave the server. */
export async function getAiSettings(): Promise<AiSettingsState | null> {
  if (!isAdminUser(await getSessionUser())) return null;
  const admin = createAdminClient();
  let config = DEFAULT_AI_CONFIG;
  if (admin) {
    const { data } = await admin.from("app_settings").select("value").eq("key", KEY).maybeSingle();
    if (data?.value) config = normalizeAiConfig(data.value);
  }
  // Only a "configured / where from / last 4" hint is returned; the key values never reach the browser.
  const { keys, source } = await resolveAiKeys(admin);
  const info = (k: string | null, s: KeyInfo["source"]): KeyInfo => ({ configured: !!k, source: s, hint: k ? k.slice(-4) : null });
  return { config, keys: { gemini: info(keys.gemini, source.gemini), claude: info(keys.claude, source.claude) }, serviceRole: !!admin };
}

const schema = z.object({
  provider: z.enum(["gemini", "claude"]),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  // Blank = keep the stored key. A non-empty value replaces it.
  geminiKey: z.string().trim().max(300).optional(),
  claudeKey: z.string().trim().max(300).optional(),
  clearGemini: z.boolean().optional(),
  clearClaude: z.boolean().optional(),
}).refine((v) => AI_MODELS[v.provider].some((m) => m.id === v.model), "Model doesn't belong to the selected provider.");

export async function saveAiSettings(input: unknown): Promise<SaveResult> {
  if (!isAdminUser(await getSessionUser())) return { ok: false, message: "Not authorised." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server, so settings can't be saved." };
  const { provider, model, temperature, geminiKey, claudeKey, clearGemini, clearClaude } = parsed.data;
  const { error } = await admin.from("app_settings").upsert({ key: KEY, value: { provider, model, temperature } }, { onConflict: "key" });
  if (error) return { ok: false, message: error.message };

  if (geminiKey || claudeKey || clearGemini || clearClaude) {
    const { data } = await admin.from("app_secrets").select("value").eq("key", "ai_keys").maybeSingle();
    const cur = { ...((data?.value as Record<string, string> | null) ?? {}) };
    if (clearGemini) delete cur.gemini;
    if (clearClaude) delete cur.claude;
    if (geminiKey) cur.gemini = geminiKey;
    if (claudeKey) cur.claude = claudeKey;
    const { error: kerr } = await admin.from("app_secrets").upsert({ key: "ai_keys", value: cur, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (kerr) return { ok: false, message: `Settings saved, but the API keys could not be: ${kerr.message}. Run the app_secrets block from supabase/schema.sql.` };
  }
  revalidatePath("/admin/settings/ai");
  return { ok: true, message: "AI settings saved." };
}

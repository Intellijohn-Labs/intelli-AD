"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_MODELS, DEFAULT_AI_CONFIG, normalizeAiConfig, type AiConfig } from "@/lib/ai-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

export interface AiSettingsState { config: AiConfig; keys: { gemini: boolean; claude: boolean }; serviceRole: boolean }
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
  return { config, keys: { gemini: !!process.env.GEMINI_API_KEY, claude: !!process.env.ANTHROPIC_API_KEY }, serviceRole: !!admin };
}

const schema = z.object({
  provider: z.enum(["gemini", "claude"]),
  model: z.string(),
  temperature: z.number().min(0).max(1),
}).refine((v) => AI_MODELS[v.provider].some((m) => m.id === v.model), "Model doesn't belong to the selected provider.");

export async function saveAiSettings(input: unknown): Promise<SaveResult> {
  if (!isAdminUser(await getSessionUser())) return { ok: false, message: "Not authorised." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server, so settings can't be saved." };
  const { error } = await admin.from("app_settings").upsert({ key: KEY, value: parsed.data }, { onConflict: "key" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings/ai");
  return { ok: true, message: "AI settings saved." };
}

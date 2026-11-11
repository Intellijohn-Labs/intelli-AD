import { NextResponse } from "next/server";
import { DEFAULT_AI_CONFIG, normalizeAiConfig } from "@/lib/ai-config";
import { resolveAiKeys } from "@/lib/ai-keys";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public: is the active AI provider usable? Returns only a boolean, never a key or which provider is set. */
export async function GET() {
  const admin = createAdminClient();
  let provider = DEFAULT_AI_CONFIG.provider;
  if (admin) {
    const { data } = await admin.from("app_settings").select("value").eq("key", "ai_config").maybeSingle();
    if (data?.value) provider = normalizeAiConfig(data.value).provider;
  }
  const { keys } = await resolveAiKeys(admin);
  const isConfigured = !!(provider === "claude" ? keys.claude : keys.gemini);
  // posterReady: the obituary poster designer always uses Gemini (image model), whatever text provider is active.
  return NextResponse.json({ isConfigured, posterReady: !!keys.gemini }, { headers: { "Cache-Control": "no-store" } });
}

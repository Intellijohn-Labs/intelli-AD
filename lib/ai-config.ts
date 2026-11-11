/** Shared (client-safe) AI settings types. API keys are never part of this: they live in server env vars only. */
export type AiProvider = "gemini" | "claude";
export interface AiConfig { provider: AiProvider; model: string; temperature: number }

export const AI_MODELS: Record<AiProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "gemini-2.5-flash (recommended)" },
    { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
  ],
  claude: [
    { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet-20241022" },
    { id: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku-20241022" },
  ],
};
export const AI_PROVIDER_LABEL: Record<AiProvider, string> = { gemini: "Google Gemini (Paid)", claude: "Anthropic Claude (Paid)" };
export const DEFAULT_AI_CONFIG: AiConfig = { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.3 };

export function normalizeAiConfig(raw: unknown): AiConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<AiConfig>;
  const provider: AiProvider = r.provider === "claude" ? "claude" : "gemini";
  const model = AI_MODELS[provider].some((m) => m.id === r.model) ? (r.model as string) : AI_MODELS[provider][0].id;
  const t = typeof r.temperature === "number" && isFinite(r.temperature) ? Math.min(1, Math.max(0, r.temperature)) : DEFAULT_AI_CONFIG.temperature;
  return { provider, model, temperature: t };
}

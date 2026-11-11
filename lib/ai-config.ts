/** Shared (client-safe) AI settings types. API keys are never part of this: they live in server env vars only. */
export type AiProvider = "gemini" | "claude";
export interface AiConfig { provider: AiProvider; model: string; temperature: number; /** Gemini image model used by the obituary poster designer. */ imageModel: string }

export const AI_MODELS: Record<AiProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "gemini-2.5-flash (recommended)" },
    { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
  ],
  claude: [
    { id: "claude-sonnet-5-5", label: "claude-sonnet-5-5 (recommended)" },
    { id: "claude-haiku-5-5", label: "claude-haiku-5-5 (faster, cheaper)" },
    { id: "claude-opus-5-5", label: "claude-opus-5-5" },
  ],
};
/**
 * Gemini image models for the obituary poster designer. They must accept the uploaded portrait as input, so Imagen
 * (text-to-image only, no photo input) is not offered.
 */
export const AI_IMAGE_MODELS: { id: string; label: string }[] = [
  { id: "gemini-2.5-flash-image", label: "gemini-2.5-flash-image (recommended)" },
  { id: "gemini-3-pro-image-preview", label: "gemini-3-pro-image-preview (higher quality, preview)" },
];
export const AI_PROVIDER_LABEL: Record<AiProvider, string> = { gemini: "Google Gemini (Paid)", claude: "Anthropic Claude (Paid)" };
export const DEFAULT_AI_CONFIG: AiConfig = { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.3, imageModel: AI_IMAGE_MODELS[0].id };

export function normalizeAiConfig(raw: unknown): AiConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<AiConfig>;
  const provider: AiProvider = r.provider === "claude" ? "claude" : "gemini";
  const model = AI_MODELS[provider].some((m) => m.id === r.model) ? (r.model as string) : AI_MODELS[provider][0].id;
  const t = typeof r.temperature === "number" && isFinite(r.temperature) ? Math.min(1, Math.max(0, r.temperature)) : DEFAULT_AI_CONFIG.temperature;
  const imageModel = AI_IMAGE_MODELS.some((m) => m.id === r.imageModel) ? (r.imageModel as string) : AI_IMAGE_MODELS[0].id;
  return { provider, model, temperature: t, imageModel };
}

/** Obituary / remembrance / condolence / anniversary categories (by id or display name, English or Malayalam). */
export const isMemorialCategory = (c: string) => /obituar|remembrance|condolence|anniversar|memoriam|ചരമ|അനുസ്മരണ|നിര്യാത/i.test(c);

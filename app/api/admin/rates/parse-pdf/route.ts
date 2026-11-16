import { NextResponse } from "next/server";
import { DEFAULT_AI_CONFIG, normalizeAiConfig, type AiConfig } from "@/lib/ai-config";
import { resolveAiKeys } from "@/lib/ai-keys";
import { newspapers } from "@/data/newspapers";
import { parseJsonLoose } from "@/lib/json-repair";
import { buildExtractionPrompt, expandCompact } from "@/lib/rate-import";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

export const maxDuration = 60;

// Vercel rejects request bodies over ~4.5 MB, so larger cards must be compressed or split.
const MAX_BYTES = 4 * 1024 * 1024;
const PUBLICATION_ALIASES: Record<string, string> = { manorama: "malayala-manorama", mm: "malayala-manorama", hindu: "the-hindu", toi: "times-of-india", ht: "hindustan-times" };

/** Fast models for PDF extraction (a tariff read should take seconds, not a minute). */
const FAST_MODEL = { claude: "claude-haiku-4-5-20251001", gemini: "gemini-2.5-flash" } as const;

class ProviderError extends Error { constructor(m: string, public status: number) { super(m); } }

async function providerError(name: string, res: Response) {
  const raw = await res.text().catch(() => "");
  let detail = raw.slice(0, 300);
  try { const j = JSON.parse(raw); detail = j?.error?.message ?? j?.message ?? detail; } catch { /* non-JSON */ }
  console.error(`[admin/rates/parse-pdf] ${name} ${res.status}:`, raw.slice(0, 800));
  return new ProviderError(`${name} API error (${res.status}): ${detail}`, res.status);
}

type Reply = { text: string; truncated: boolean };

async function callGemini(cfg: AiConfig, key: string, pdfB64: string, text: string): Promise<Reply> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: "application/pdf", data: pdfB64 } }, { text }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } }, // JSON mode; no hidden "thinking" tokens eating the output budget
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw await providerError("Gemini", res);
  const j = await res.json();
  const cand = j?.candidates?.[0];
  return { text: (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join(""), truncated: cand?.finishReason === "MAX_TOKENS" };
}

async function callClaude(cfg: AiConfig, key: string, pdfB64: string, text: string): Promise<Reply> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 8192,
      messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfB64 } }, { type: "text", text }] }],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw await providerError("Claude", res);
  const j = await res.json();
  return { text: (j?.content ?? []).map((b: { text?: string }) => b.text ?? "").join(""), truncated: j?.stop_reason === "max_tokens" };
}

const hits = new Map<string, number[]>();
function throttled(id: string) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > 6;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    let ok = false;
    try { ok = new URL(origin).host === host; } catch { /* malformed */ }
    if (!ok) return NextResponse.json({ error: "Forbidden origin.", status: 403 }, { status: 403 });
  }
  const user = await getSessionUser();
  if (!isAdminUser(user)) return NextResponse.json({ error: "Not authorised.", status: 403 }, { status: 403 });
  if (throttled(user?.id ?? "admin")) return NextResponse.json({ error: "Too many imports. Please wait a few minutes.", status: 429 }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Upload the PDF as multipart form data.", status: 400 }, { status: 400 }); }
  const file = form.get("file");
  const pubRaw = String(form.get("publicationId") ?? "").trim().toLowerCase();
  const paper = newspapers.find((n) => n.id === (PUBLICATION_ALIASES[pubRaw] ?? pubRaw));
  if (!paper) return NextResponse.json({ error: "Choose a valid publication.", status: 400 }, { status: 400 });
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "Choose a PDF file to upload.", status: 400 }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `That PDF is ${(file.size / 1048576).toFixed(1)} MB. The limit is 4 MB; compress it or upload the rate pages only.`, status: 413 }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return NextResponse.json({ error: "That file isn't a PDF.", status: 400 }, { status: 400 });

  const admin = createAdminClient();
  const { keys } = await resolveAiKeys(admin);
  let cfg = DEFAULT_AI_CONFIG;
  if (admin) {
    const { data } = await admin.from("app_settings").select("value").eq("key", "ai_config").maybeSingle();
    if (data?.value) cfg = normalizeAiConfig(data.value);
  }
  // The admin may override the engine for this one extraction; otherwise the Active Provider from AI Settings is used.
  const askedRaw = String(form.get("provider") ?? "").trim().toLowerCase();
  if (askedRaw && !["anthropic", "claude", "gemini"].includes(askedRaw)) return NextResponse.json({ error: 'provider must be "anthropic" or "gemini".', status: 400 }, { status: 400 });
  const provider = askedRaw ? (askedRaw === "gemini" ? "gemini" : "claude") : cfg.provider;
  cfg = { ...cfg, provider, model: FAST_MODEL[provider] };
  const key = cfg.provider === "claude" ? keys.claude : keys.gemini;
  if (!key) return NextResponse.json({ error: `No ${cfg.provider === "claude" ? "Anthropic" : "Gemini"} API key is configured. Add one in Admin → AI Settings, or switch the AI engine.`, status: 503 }, { status: 503 });

  try {
    const text = buildExtractionPrompt(paper.name, paper.editions.map((e) => e.name));
    const b64 = bytes.toString("base64");
    const reply = cfg.provider === "claude" ? await callClaude(cfg, key, b64, text) : await callGemini(cfg, key, b64, text);
    let extraction;
    let repaired = false;
    try {
      const loose = parseJsonLoose(reply.text);
      repaired = loose.repaired;
      extraction = expandCompact(loose.value);
    } catch (e) {
      console.error("[admin/rates/parse-pdf] unusable reply:", reply.truncated ? "(truncated)" : "", e instanceof Error ? e.message : e, reply.text.slice(0, 400));
      return NextResponse.json({ error: reply.truncated ? "The AI ran out of room while reading this card, so nothing usable came back. Upload fewer pages (just the rate tables) and try again." : "The AI reply could not be read. Please try again, or switch the AI engine.", status: 502 }, { status: 502 });
    }
    const truncated = reply.truncated || repaired;
    if (truncated) extraction.notes.unshift("The AI's reply was cut off, so the last rows may be missing. Check the table against the PDF, or upload fewer pages and extract again.");
    return NextResponse.json({ extraction, truncated, publicationId: paper.id, provider: cfg.provider, model: cfg.model }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[admin/rates/parse-pdf] failed:", err.message);
    const status = err instanceof ProviderError ? (err.status >= 400 && err.status < 600 ? err.status : 502) : err.name === "TimeoutError" ? 504 : 500;
    return NextResponse.json({ error: err.name === "TimeoutError" ? "The AI took too long to read this PDF. Try a smaller file." : err.message, status }, { status });
  }
}

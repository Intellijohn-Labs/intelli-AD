import { NextResponse } from "next/server";
import { DEFAULT_AI_CONFIG, normalizeAiConfig, type AiConfig } from "@/lib/ai-config";
import { resolveAiKeys } from "@/lib/ai-keys";
import { newspapers } from "@/data/newspapers";
import { parseJsonLoose } from "@/lib/json-repair";
import { buildExtractionPrompt, EXTRACTION_SYSTEM, expandCompact, mergeExtractions, type ExtractionPass } from "@/lib/rate-import";
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

type Upload = { mime: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"; b64: string };

/** Identifies the upload from its first bytes (never trusts the client's file name or type). */
function sniff(b: Buffer): Upload["mime"] | null {
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

async function callGemini(cfg: AiConfig, key: string, up: Upload, text: string): Promise<Reply> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM }] },
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: up.mime, data: up.b64 } }, { text }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } }, // JSON mode; no hidden "thinking" tokens eating the output budget
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw await providerError("Gemini", res);
  const j = await res.json();
  const cand = j?.candidates?.[0];
  return { text: (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join(""), truncated: cand?.finishReason === "MAX_TOKENS" };
}

async function callClaude(cfg: AiConfig, key: string, up: Upload, text: string): Promise<Reply> {
  const send = (withTemperature: boolean) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 8192,
      ...(withTemperature ? { temperature: 0 } : {}), // deterministic transcription
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: [up.mime === "application/pdf" ? { type: "document", source: { type: "base64", media_type: up.mime, data: up.b64 } } : { type: "image", source: { type: "base64", media_type: up.mime, data: up.b64 } }, { type: "text", text }] }],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  let res = await send(true);
  if (res.status === 400) {
    // Some newer Claude models reject `temperature`; retry once without it.
    const body = await res.clone().text().catch(() => "");
    if (/temperature/i.test(body)) res = await send(false);
  }
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
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Upload the rate card as multipart form data.", status: 400 }, { status: 400 }); }
  const file = form.get("file");
  const pubRaw = String(form.get("publicationId") ?? "").trim().toLowerCase();
  const paper = newspapers.find((n) => n.id === (PUBLICATION_ALIASES[pubRaw] ?? pubRaw));
  if (!paper) return NextResponse.json({ error: "Choose a valid publication.", status: 400 }, { status: 400 });
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "Choose a PDF or image (JPG, PNG, WebP) to upload.", status: 400 }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 4 MB; compress it or upload the rate pages only.`, status: 413 }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return NextResponse.json({ error: "That file isn't a PDF, JPG, PNG or WebP.", status: 400 }, { status: 400 });

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
    const names = paper.editions.map((e) => e.name);
    const up: Upload = { mime, b64: bytes.toString("base64") };
    // Two PARALLEL passes over the whole PDF or image so no page or table is skipped:
    //   A = display / classified display / editions / page positions / combo packages
    //   B = classified text (per word and per line), multi-edition slabs and add-on rules
    const run = async (pass: ExtractionPass) => {
      const text = buildExtractionPrompt(paper.name, names, pass);
      const reply = cfg.provider === "claude" ? await callClaude(cfg, key, up, text) : await callGemini(cfg, key, up, text);
      try {
        const loose = parseJsonLoose(reply.text);
        return { extraction: expandCompact(loose.value), cut: reply.truncated || loose.repaired };
      } catch (e) {
        console.error(`[admin/rates/parse-pdf] pass ${pass} unusable reply:`, reply.truncated ? "(truncated)" : "", e instanceof Error ? e.message : e, reply.text.slice(0, 400));
        throw new Error(reply.truncated ? "ran out of room while reading this part of the card" : "returned a reply that could not be read");
      }
    };
    const [ra, rb] = await Promise.allSettled([run("A"), run("B")]);
    if (ra.status === "rejected" && rb.status === "rejected") throw ra.reason instanceof ProviderError ? ra.reason : rb.reason instanceof ProviderError ? rb.reason : new Error("The AI reply could not be read. Please try again, or switch the AI engine.");
    const empty = expandCompact({});
    const a = ra.status === "fulfilled" ? ra.value : null, b = rb.status === "fulfilled" ? rb.value : null;
    const extraction = mergeExtractions(a?.extraction ?? empty, b?.extraction ?? empty);
    const truncated = !!(a?.cut || b?.cut);
    if (!a) extraction.notes.unshift(`Pass A (display rates, page positions, combo packages) failed: the AI ${(ra as PromiseRejectedResult).reason?.message ?? "failed"}. Those rows are MISSING. Extract again before saving.`);
    if (!b) extraction.notes.unshift(`Pass B (classified text, slabs, add-ons) failed: the AI ${(rb as PromiseRejectedResult).reason?.message ?? "failed"}. Those rows are MISSING. Extract again before saving.`);
    if (truncated) extraction.notes.unshift("The AI's reply was cut off for part of the card, so the last rows of that part may be missing. Check the table against the PDF, or upload fewer pages and extract again.");
    return NextResponse.json({ extraction, truncated: truncated || !a || !b, publicationId: paper.id, provider: cfg.provider, model: cfg.model }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[admin/rates/parse-pdf] failed:", err.message);
    const status = err instanceof ProviderError ? (err.status >= 400 && err.status < 600 ? err.status : 502) : err.name === "TimeoutError" ? 504 : 500;
    return NextResponse.json({ error: err.name === "TimeoutError" ? "The AI took too long to read this file. Try a smaller file." : err.message, status }, { status });
  }
}

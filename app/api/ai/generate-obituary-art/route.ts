import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_AI_CONFIG, normalizeAiConfig } from "@/lib/ai-config";
import { resolveAiKeys } from "@/lib/ai-keys";
import { POSTER_STYLES, type PosterStyleId } from "@/lib/obituary-art";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;


const body = z.object({
  styleId: z.enum(["classic", "honored", "memoriam"]),
  /** The notice wording, exactly as it should be printed. */
  text: z.string().trim().min(5).max(1200),
  category: z.enum(["obituary", "remembrance"]).default("obituary"),
  language: z.enum(["ml", "en"]).default("ml"),
  aspect: z.string().regex(/^\d:\d$/).default("4:5"),
  widthCm: z.number().min(1).max(60).optional(),
  heightCm: z.number().min(1).max(60).optional(),
  /** Optional portrait (already downscaled by the browser). */
  photo: z.object({ mime: z.enum(["image/jpeg", "image/png"]), data: z.string().max(2_500_000) }).optional(),
});
type Input = z.infer<typeof body>;

const STYLE_BRIEF: Record<PosterStyleId, { brief: string; header: string | null }> = {
  classic: {
    brief: `STYLE 1 — Vintage Floral Wreath: classic newsprint tone (warm off-white paper, dark ink). An intricate, finely drawn floral wreath / garland of natural flowers and leaves frames the portrait, which sits in a round or oval opening at the top centre. A bold header sits above or beside it, with the name and the other details set cleanly below in a clear serif typeface.`,
    header: "ആദരാഞ്ജലികൾ",
  },
  honored: {
    brief: `STYLE 2 — Ornate Frame / Tribute: a Victorian / vintage engraved newspaper border (fine filigree, cartouche corners, engraved line-work). The portrait is cropped to an oval. The details are arranged in a structured, orderly layout beneath or beside the portrait.`,
    header: "വേദനയോടെ ഓർക്കുന്നു",
  },
  memoriam: {
    brief: `STYLE 3 — Minimalist Memoriam: a clean, elegant thin border with subtle remembrance elements, such as a single rose and/or a lit candle motif, in a restrained palette and with generous quiet space. The portrait sits in a soft oval or rounded frame. Present the funeral announcement lines clearly and prominently.`,
    header: null,
  },
};

function prompt(p: Input): string {
  const hasPhoto = !!p.photo;
  const size = p.widthCm && p.heightCm ? `${p.widthCm} × ${p.heightCm} cm` : "a standard newspaper display box";
  return `You are a senior newspaper-advertisement designer for Kerala dailies (Malayala Manorama, Mathrubhumi and similar). Create ONE print-ready ${p.category === "remembrance" ? "remembrance (death anniversary / In Memoriam)" : "obituary"} newspaper ad as a single image.

FORMAT: portrait ${p.aspect}, designed for a ${size} newspaper box. Clean off-white newsprint-style background, crisp high-contrast artwork that still reads well in black and white. Fill the whole frame; no mock-up, no paper curl, no device or desk scene.

${hasPhoto
    ? "PHOTO: the attached image is the portrait of the deceased. Use THIS person's face exactly as it is: do not re-draw, beautify, age, stylise or replace it; only crop it into the frame."
    : "PHOTO: none was supplied. Do NOT invent a face or a portrait; use ornament only and leave no empty portrait frame."}

${STYLE_BRIEF[p.styleId].brief}

${(() => { const h = STYLE_BRIEF[p.styleId].header; return h ? `HEADER (bold, prominent; typeset exactly): "${h}"\n\n` : ""; })()}TEXT TO TYPESET — use exactly this wording, nothing more and nothing less (apart from the header above):
"""
${p.text}
"""
Typography rules:
- The person's name is the largest, boldest line; the remaining details are smaller and gracefully aligned (centred).
- ${p.language === "ml" ? "The text is Malayalam: render it in true Malayalam Unicode script with correct conjuncts and vowel signs, in a clear serif newspaper typeface." : "The text is English: render it in a clear serif newspaper typeface."}
- Copy every character faithfully, including digits, dates and times. Never output garbled, look-alike, placeholder or lorem-ipsum characters. If you cannot render a word exactly, keep it simply and legibly rather than inventing glyphs.
- Do not add any other text beyond the header and the wording above: no watermark, caption, logo, phone number, website or signature.

Respectful, solemn and dignified in every detail.`;
}

class UpstreamError extends Error { constructor(m: string, public status: number) { super(m); } }

async function generate(key: string, model: string, p: Input): Promise<{ mime: string; data: string }> {
  const parts: unknown[] = [{ text: prompt(p) }];
  if (p.photo) parts.push({ inline_data: { mime_type: p.photo.mime, data: p.photo.data } });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: p.aspect } } }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let detail = raw.slice(0, 300);
    try { detail = JSON.parse(raw)?.error?.message ?? detail; } catch { /* non-JSON */ }
    console.error(`[ai/generate-obituary-art] Gemini ${res.status} (${model}):`, raw.slice(0, 800));
    throw new UpstreamError(`Gemini image API error (${res.status}): ${detail}`, res.status);
  }
  const j = await res.json();
  const cand = j?.candidates?.[0];
  const img = (cand?.content?.parts ?? []).map((x: { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }) => x.inlineData ?? x.inline_data).find((d: { data?: string } | undefined) => d?.data);
  if (!img?.data) {
    console.error("[ai/generate-obituary-art] no image in reply; finishReason:", cand?.finishReason, JSON.stringify(j?.promptFeedback ?? {}).slice(0, 300));
    throw new UpstreamError(`Gemini returned no image${cand?.finishReason ? ` (${cand.finishReason})` : ""}. Please try again.`, 502);
  }
  return { mime: (img.mimeType ?? img.mime_type ?? "image/png") as string, data: img.data as string };
}

// Image generation is costly: a full 3-style run is 3 calls, so allow ~3 runs per 10 minutes per address.
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 9;
}

export async function POST(req: Request) {
  // Same-site browser calls only (the site itself needs a signed-in session via the proxy).
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    let ok = false;
    try { ok = new URL(origin).host === host; } catch { /* malformed */ }
    if (!ok) { console.error(`[ai/generate-obituary-art] 403 origin mismatch: origin=${origin} host=${host}`); return NextResponse.json({ error: `Forbidden origin: ${origin} does not match ${host}.`, status: 403 }, { status: 403 }); }
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (throttled(ip)) return NextResponse.json({ error: "Too many poster requests. Please wait a few minutes.", status: 429 }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please provide the notice text (and a JPG/PNG photo under ~1.8 MB).", status: 400 }, { status: 400 });

  const admin = createAdminClient();
  const { keys } = await resolveAiKeys(admin);
  let imageModel = DEFAULT_AI_CONFIG.imageModel;
  if (admin) {
    const { data } = await admin.from("app_settings").select("value").eq("key", "ai_config").maybeSingle();
    if (data?.value) imageModel = normalizeAiConfig(data.value).imageModel;
  }
  if (!keys.gemini) return NextResponse.json({ error: "AI poster design isn't set up yet (no Gemini API key). Please ask the admin to add one in AI Settings.", status: 503 }, { status: 503 });

  try {
    const img = await generate(keys.gemini, imageModel, parsed.data);
    const style = POSTER_STYLES.find((s) => s.id === parsed.data.styleId)!;
    return NextResponse.json({ id: style.id, style_name: `${style.ml} (${style.en})`, mime: img.mime, data: img.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[ai/generate-obituary-art] failed:", err);
    const status = err instanceof UpstreamError ? (err.status >= 400 && err.status < 600 ? err.status : 502) : err.name === "TimeoutError" ? 504 : 500;
    return NextResponse.json({ error: err.name === "TimeoutError" ? "The AI took too long to design this poster. Please try again." : err.message, status }, { status });
  }
}

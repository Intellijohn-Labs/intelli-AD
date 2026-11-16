import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_AI_CONFIG, normalizeAiConfig } from "@/lib/ai-config";
import { resolveAiKeys } from "@/lib/ai-keys";
import { POSTER_STYLES, type PosterStyleId } from "@/lib/obituary-art";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;


const body = z.object({
  styleId: z.enum(["classic", "honored", "memoriam"]),
  /** Unused by the image model (artwork is text-free); kept so older clients still validate. */
  text: z.string().trim().max(1200).optional(),
  category: z.enum(["obituary", "remembrance"]).default("obituary"),
  language: z.enum(["ml", "en"]).default("ml"),
  colorMode: z.enum(["bw", "color"]).default("bw"),
  aspect: z.string().regex(/^\d:\d$/).default("4:5"),
  widthCm: z.number().min(1).max(60).optional(),
  heightCm: z.number().min(1).max(60).optional(),
  /** Optional portrait (already downscaled by the browser). */
  photo: z.object({ mime: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(2_500_000) }).optional(),
});
type Input = z.infer<typeof body>;

const STYLE_BRIEF: Record<PosterStyleId, string> = {
  classic: `STYLE 1 — Vintage Floral Wreath: classic newsprint tone (warm cream parchment, fine dark ink line-work). An intricate, finely drawn floral wreath / garland of natural flowers and leaves frames the portrait, which sits in a round or oval opening. The wreath must be fully contained within the 20%–55% band.`,
  honored: `STYLE 2 — Ornate Vintage Newspaper Border: a Victorian / vintage engraved newspaper border (fine filigree, cartouche corners, engraved line-work) around the whole sheet. The portrait is cropped to an oval within the 20%–55% band; keep the filigree and cartouche corners out of the header and text zones, with only a thin plain edge border allowed.`,
  memoriam: `STYLE 3 — Minimalist Rose & Candle: a clean, elegant thin border with a single rose and/or a lit candle motif, in a restrained palette with generous quiet space. The portrait sits in a soft oval or rounded frame within the 20%–55% band, with the rose and/or candle placed beside or around the frame inside that band only, never in the text zone.`,
};

function prompt(p: Input): string {
  const hasPhoto = !!p.photo;
  return `You are a senior newspaper-advertisement artist for Kerala dailies. Create ONE text-free decorative frame for a ${p.category === "remembrance" ? "remembrance (death anniversary)" : "obituary"} newspaper ad, as a single image.

ABSOLUTE RULE: generate ZERO text. No letters, words, numbers, digits, dates, symbols, captions, watermarks, logos or signatures anywhere in the image, in any script. Typography will be added later by software; any glyph you draw will ruin the ad.

FORMAT: portrait ${p.aspect}, filling the whole frame. ${p.colorMode === "color" ? "Warm cream / parchment background with rich, natural FULL-COLOUR artwork (natural flower and leaf colours, subtle gold or sepia accents)." : "Warm cream / parchment newsprint background, crisp high-contrast artwork that still reads in black and white."} No mock-up, no paper curl, no desk or device scene.

${STYLE_BRIEF[p.styleId]}

LAYOUT (strict; percentages are of the image height, measured from the top):
- TOP 18% (0%–18%): HEADER ZONE. Pure, solid, plain cream/parchment background only. Absolutely NO horizontal divider lines, rules, wreath or garland extensions, leaves, flowers, corner flourishes, or any ornament inside it.
- 20%–55%: the ONLY band where the portrait oval/frame and its wreath, flowers or ornament may sit, centred horizontally. The frame, including all its decoration, must stay entirely inside this band; do not let it touch or cross the 20% or 55% lines.
- BOTTOM 42% (58%–100%): TEXT ZONE. Pure, solid, plain cream/parchment background only. NO divider lines, floral extensions, candles, roses, corner flourishes or ornament of any kind inside it.
- The only thing allowed to run through the header and text zones is, at most, a very thin plain outer border line hugging the extreme edges of the image (2% margin), and only if the theme has one.

${hasPhoto
    ? `PHOTO: the attached image is the portrait of the deceased. Use THIS person's face exactly as it is: do not re-draw, beautify, age, stylise or replace it; only crop it into the frame. ${p.colorMode === "color" ? "Keep the photo's natural colours; do not convert it to black and white or sepia." : "Present the photo in clean black and white."}`
    : "PHOTO: none was supplied. Do NOT invent a face or a portrait; leave the central frame as ornament only (for example an empty ornamental cartouche or floral medallion)."}

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
  if (!parsed.success) return NextResponse.json({ error: "Invalid request (a JPG/PNG photo must be under ~1.8 MB).", status: 400 }, { status: 400 });

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

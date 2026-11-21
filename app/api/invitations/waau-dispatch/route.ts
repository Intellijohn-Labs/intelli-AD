import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clock, COOLDOWN_MAX } from "@/lib/invitation-cooldown";
import { cooldownFor, deliver } from "@/lib/invitation-delivery";
import { getSessionUser } from "@/lib/supabase/session";
import { normalizePhone, validPhone } from "@/lib/wedding";

export const maxDuration = 30;

// Cards are 1080 px JPEGs (about 0.3 - 0.9 MB). The ceiling is 8 MB; note that Vercel itself rejects request bodies over ~4.5 MB before this
// route runs, which is why the studio encodes JPEG and steps the quality down rather than sending a large PNG.
const MAX_CARD_BYTES = 8 * 1024 * 1024;
const BUCKET = "invitation-cards";
const MAX_VIDEO_BYTES = 16 * 1024 * 1024;
const DEMO_COOKIE = "intelliad_session";

const meta = z.object({
  invitationId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  place: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(32),
  message: z.string().trim().min(1).max(2000),
  inviteUrl: z.string().trim().max(600).default(""),
  /** The user confirmed this guest has replied on WhatsApp, so Meta's per-number marketing cap no longer applies to them. */
  guestReplied: z.boolean().default(false),
  /** Greeting video: the rendered MP4 the browser already uploaded (via /api/invitations/video-upload). The `card` part is then its JPEG poster frame. */
  videoPath: z.string().regex(/^dispatch\/video\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/).optional(),
  eventTitle: z.string().trim().max(160).default(""),
  senderName: z.string().trim().max(160).default(""),
});

const hits = new Map<string, number[]>();
// 1,000+ guests are sent one request each, so the ceiling is configurable (and higher by default when n8n takes the load).
const RATE_LIMIT = Number(process.env.INVITATION_DISPATCH_RATE_LIMIT) || (process.env.N8N_WAAU_WEBHOOK_URL ? 2500 : 250);
function throttled(id: string) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > RATE_LIMIT;
}

function kind(b: Buffer): { ext: "jpg" | "png" | "gif"; mime: "image/jpeg" | "image/png" | "image/gif" } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (b.subarray(0, 4).toString("latin1") === "GIF8") return { ext: "gif", mime: "image/gif" };
  return null;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    let ok = false;
    try { ok = new URL(origin).host === host; } catch { /* malformed */ }
    if (!ok) return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
  }
  // Dispatching spends the platform's WhatsApp credits, so a signed-in user is required (the development demo cookie counts only outside production).
  const user = await getSessionUser();
  const demo = process.env.NODE_ENV !== "production" && /(^|;\s*)intelliad_session=/.test(req.headers.get("cookie") ?? "");
  if (!user && !demo) return NextResponse.json({ error: "Sign in to send invitations via Waau Panel." }, { status: 401 });
  if (throttled(user?.id ?? req.headers.get("x-forwarded-for") ?? DEMO_COOKIE)) return NextResponse.json({ error: "Too many dispatches. Please wait a few minutes." }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Send the card as multipart form data." }, { status: 400 }); }
  let parsed: z.infer<typeof meta>;
  try { parsed = meta.parse(JSON.parse(String(form.get("meta") ?? "{}"))); } catch { return NextResponse.json({ error: "Missing or invalid guest details." }, { status: 400 }); }
  if (!validPhone(parsed.phone)) return NextResponse.json({ error: "That WhatsApp number isn't valid." }, { status: 400 });
  const card = form.get("card");
  if (!(card instanceof Blob) || card.size === 0) return NextResponse.json({ error: "The personalised card is missing." }, { status: 400 });
  if (card.size > MAX_CARD_BYTES) return NextResponse.json({ error: "The card image is too large." }, { status: 413 });
  const bytes = Buffer.from(await card.arrayBuffer());
  const type = kind(bytes);
  if (!type) return NextResponse.json({ error: "The card must be a JPEG, PNG or GIF image." }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server storage isn't configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });

  const phone = normalizePhone(parsed.phone);
  // Same 2-per-24-hours guard as the studio, enforced here so direct API calls and retries can't skip it.
  const until = parsed.guestReplied ? null : await cooldownFor(admin, phone);
  if (until) {
    const wait = until - Date.now();
    return NextResponse.json({ code: "cooldown", cooldownUntil: until, retryAfterSec: Math.ceil(wait / 1000), error: `This number already received ${COOLDOWN_MAX} invitations in the last 24 hours. You can send again in ${clock(wait)}, or confirm the guest replied.` }, { status: 429, headers: { "Retry-After": String(Math.ceil(wait / 1000)), "Cache-Control": "no-store" } });
  }
  const path = `dispatch/${parsed.invitationId ?? "adhoc"}/${crypto.randomUUID()}.${type.ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });
  if (up.error) {
    console.error("[invitations/waau-dispatch] upload failed:", up.error.message);
    return NextResponse.json({ error: "Couldn't store the card. Run the invitation_dispatches SQL (it creates the invitation-cards bucket)." }, { status: 502 });
  }
  const assetUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; // the card image (or, for a video greeting, its poster frame)

  // Video greeting: confirm the browser's direct upload really landed, is an MP4 and is within WhatsApp's 16 MB limit.
  let videoUrl: string | null = null;
  if (parsed.videoPath) {
    const slash = parsed.videoPath.lastIndexOf("/"), dir = parsed.videoPath.slice(0, slash), file = parsed.videoPath.slice(slash + 1);
    const { data: found } = await admin.storage.from(BUCKET).list(dir, { search: file, limit: 5 });
    const obj = found?.find((f) => f.name === file);
    const size = Number((obj?.metadata as { size?: number } | undefined)?.size ?? 0);
    if (!obj || size <= 0) return NextResponse.json({ error: "The rendered video didn't finish uploading. Please try again." }, { status: 400 });
    if (size > MAX_VIDEO_BYTES) { await admin.storage.from(BUCKET).remove([parsed.videoPath]); return NextResponse.json({ error: "The rendered video is over WhatsApp's 16 MB limit." }, { status: 413 }); }
    videoUrl = admin.storage.from(BUCKET).getPublicUrl(parsed.videoPath).data.publicUrl;
  }

  const row = {
    invitation_id: parsed.invitationId ?? null, created_by: user?.id ?? null, guest_name: parsed.name, guest_place: parsed.place, phone,
    message: parsed.message, invite_url: parsed.inviteUrl, asset_url: videoUrl ?? assetUrl, asset_type: videoUrl ? "mp4" : type.ext, status: "queued",
  };
  let ins = await admin.from("invitation_dispatches").insert((videoUrl ? { ...row, poster_url: assetUrl } : row) as Record<string, unknown>).select("id").single();
  // poster_url is a newer column: if the SQL hasn't been re-run yet, queue the video without it (a retry then falls back to the video alone).
  if (ins.error && videoUrl && /poster_url/.test(ins.error.message)) ins = await admin.from("invitation_dispatches").insert(row).select("id").single();
  if (ins.error || !ins.data) {
    console.error("[invitations/waau-dispatch] queue insert failed:", ins.error?.message);
    return NextResponse.json({ error: "Couldn't queue the invitation. Run the invitation_dispatches SQL from supabase/schema.sql." }, { status: 502 });
  }
  const id = ins.data.id as string;

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "")).replace(/\/$/, "");
  const r = await deliver(admin, { id, phone, name: parsed.name, place: parsed.place, message: parsed.message, inviteUrl: parsed.inviteUrl, assetUrl: videoUrl ?? assetUrl, assetType: videoUrl ? "mp4" : type.ext, posterUrl: videoUrl ? assetUrl : null, eventTitle: parsed.eventTitle, senderName: parsed.senderName, base });
  return NextResponse.json({ id, status: r.status, configured: r.configured, ...(r.via ? { via: r.via } : {}), assetUrl, ...(r.error ? { error: r.error } : {}) }, { status: r.status === "failed" ? 502 : 200, headers: { "Cache-Control": "no-store" } });
}

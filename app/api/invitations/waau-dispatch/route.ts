import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/session";
import { normalizePhone, validPhone } from "@/lib/wedding";

export const maxDuration = 30;

// Cards are 1080 px JPEGs (about 0.3 - 0.9 MB). The ceiling is 8 MB; note that Vercel itself rejects request bodies over ~4.5 MB before this
// route runs, which is why the studio encodes JPEG and steps the quality down rather than sending a large PNG.
const MAX_CARD_BYTES = 8 * 1024 * 1024;
const BUCKET = "invitation-cards";
const DEMO_COOKIE = "intelliad_session";

const meta = z.object({
  invitationId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  place: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(32),
  message: z.string().trim().min(1).max(2000),
  inviteUrl: z.string().trim().max(600).default(""),
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

/**
 * Hands one personalised invitation to the Waau Panel WhatsApp provider.
 * Configure WAAU_API_URL (the provider's send-message endpoint) and WAAU_API_KEY. The request is a JSON POST with
 * `Authorization: Bearer <key>`: { to, message, media: { url, type, filename }, reference }.
 * If your Waau Panel plan expects different field names, only this function needs to change.
 */
async function sendViaWaau(p: { to: string; message: string; mediaUrl: string; mediaType: "image" | "gif"; filename: string; reference: string }): Promise<{ ok: true; ref: string | null } | { ok: false; error: string }> {
  const url = process.env.WAAU_API_URL, key = process.env.WAAU_API_KEY;
  if (!url || !key) return { ok: false, error: "not-configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ to: p.to, message: p.message, media: { url: p.mediaUrl, type: p.mediaType, filename: p.filename }, reference: p.reference }),
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `Waau Panel ${res.status}: ${raw.slice(0, 200)}` };
    let ref: string | null = null;
    try { const j = JSON.parse(raw); ref = String(j?.id ?? j?.message_id ?? j?.messageId ?? j?.data?.id ?? "") || null; } catch { /* non-JSON success */ }
    return { ok: true, ref };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Waau Panel request failed" };
  }
}

type N8nItem = { id: string; guestName: string; guestPlace: string; guestPhone: string; message: string; cardUrl: string; inviteUrl: string };

/**
 * Hands the dispatch to the n8n workflow behind N8N_WAAU_WEBHOOK_URL: { eventTitle, senderName, supabaseCallbackUrl, items }.
 * `x-webhook-secret` carries N8N_WEBHOOK_SECRET when set. n8n normally answers 2xx immediately and reports each message later
 * through POST /api/invitations/waau-status; if it answers synchronously with a delivery confirmation the row is marked sent.
 */
async function sendViaN8n(payload: { eventTitle: string; senderName: string; supabaseCallbackUrl: string; items: N8nItem[] }): Promise<{ ok: true; delivered: boolean; response: unknown } | { ok: false; error: string }> {
  const url = process.env.N8N_WAAU_WEBHOOK_URL, secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url) return { ok: false, error: "not-configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { "x-webhook-secret": secret } : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `n8n ${res.status}: ${raw.slice(0, 200)}` };
    let response: unknown = raw ? { raw: raw.slice(0, 1000) } : null;
    let delivered = false;
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      response = j;
      const st = String(j?.status ?? "").toLowerCase();
      delivered = st === "sent" || st === "delivered" || j?.delivered === true || j?.sent === true;
    } catch { /* plain-text acknowledgement */ }
    return { ok: true, delivered, response };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `n8n: ${e.message}` : "n8n request failed" };
  }
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
  const path = `dispatch/${parsed.invitationId ?? "adhoc"}/${crypto.randomUUID()}.${type.ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });
  if (up.error) {
    console.error("[invitations/waau-dispatch] upload failed:", up.error.message);
    return NextResponse.json({ error: "Couldn't store the card. Run the invitation_dispatches SQL (it creates the invitation-cards bucket)." }, { status: 502 });
  }
  const assetUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const ins = await admin.from("invitation_dispatches").insert({
    invitation_id: parsed.invitationId ?? null, created_by: user?.id ?? null, guest_name: parsed.name, guest_place: parsed.place, phone,
    message: parsed.message, invite_url: parsed.inviteUrl, asset_url: assetUrl, asset_type: type.ext, status: "queued",
  }).select("id").single();
  if (ins.error || !ins.data) {
    console.error("[invitations/waau-dispatch] queue insert failed:", ins.error?.message);
    return NextResponse.json({ error: "Couldn't queue the invitation. Run the invitation_dispatches SQL from supabase/schema.sql." }, { status: 502 });
  }
  const id = ins.data.id as string;

  const now = () => new Date().toISOString();
  const waauConfigured = !!(process.env.WAAU_API_URL && process.env.WAAU_API_KEY);
  if (!process.env.N8N_WAAU_WEBHOOK_URL && !waauConfigured) return NextResponse.json({ id, status: "queued", configured: false, assetUrl }, { headers: { "Cache-Control": "no-store" } });

  // 1) n8n orchestration (preferred when configured).
  let n8nError = "";
  if (process.env.N8N_WAAU_WEBHOOK_URL) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const base = (process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "")).replace(/\/$/, "");
    const r = await sendViaN8n({
      eventTitle: parsed.eventTitle, senderName: parsed.senderName, supabaseCallbackUrl: `${base}/api/invitations/waau-status`,
      items: [{ id, guestName: parsed.name, guestPlace: parsed.place, guestPhone: phone, message: parsed.message, cardUrl: assetUrl, inviteUrl: parsed.inviteUrl }],
    });
    if (r.ok) {
      const patch = r.delivered ? { status: "sent", sent_at: now(), provider_response: r.response, updated_at: now() } : { status: "queued", provider_response: r.response, updated_at: now() };
      await admin.from("invitation_dispatches").update(patch).eq("id", id);
      return NextResponse.json({ id, status: r.delivered ? "sent" : "queued", configured: true, via: "n8n", assetUrl }, { headers: { "Cache-Control": "no-store" } });
    }
    n8nError = r.error;
    if (!waauConfigured) {
      await admin.from("invitation_dispatches").update({ status: "failed", error: n8nError.slice(0, 500), error_message: n8nError.slice(0, 500), updated_at: now() }).eq("id", id);
      return NextResponse.json({ id, status: "failed", configured: true, via: "n8n", assetUrl, error: n8nError }, { status: 502 });
    }
    console.error("[invitations/waau-dispatch] n8n failed, falling back to the direct Waau Panel API:", n8nError);
  }

  // 2) Direct Waau Panel API (the only route when n8n isn't configured, the fallback when it is and failed).
  const sent = await sendViaWaau({ to: phone, message: parsed.message, mediaUrl: assetUrl, mediaType: type.ext === "gif" ? "gif" : "image", filename: `${parsed.name.replace(/\W+/g, "-")}-Invitation.${type.ext}`, reference: id });
  if (sent.ok) {
    await admin.from("invitation_dispatches").update({ status: "sent", provider_ref: sent.ref, sent_at: now(), updated_at: now() }).eq("id", id);
    return NextResponse.json({ id, status: "sent", configured: true, via: "waau", assetUrl }, { headers: { "Cache-Control": "no-store" } });
  }
  const why = (n8nError ? `${n8nError} | ` : "") + sent.error;
  await admin.from("invitation_dispatches").update({ status: "failed", error: why.slice(0, 500), error_message: why.slice(0, 500), updated_at: now() }).eq("id", id);
  return NextResponse.json({ id, status: "failed", configured: true, via: "waau", assetUrl, error: sent.error }, { status: 502 });
}

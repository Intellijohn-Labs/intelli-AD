import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/session";
import { normalizePhone, validPhone } from "@/lib/wedding";

export const maxDuration = 30;

// Vercel rejects request bodies over ~4.5 MB; a personalised card PNG / GIF is well under this.
const MAX_CARD_BYTES = 3.5 * 1024 * 1024;
const BUCKET = "invitation-cards";
const DEMO_COOKIE = "intelliad_session";

const meta = z.object({
  invitationId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  place: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(32),
  message: z.string().trim().min(1).max(2000),
  inviteUrl: z.string().trim().max(600).default(""),
});

const hits = new Map<string, number[]>();
function throttled(id: string) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > 250; // one request per guest: a few hundred guests per 10 minutes
}

function kind(b: Buffer): { ext: "png" | "gif"; mime: "image/png" | "image/gif" } | null {
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
  if (!type) return NextResponse.json({ error: "The card must be a PNG or GIF image." }, { status: 400 });

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

  const configured = !!(process.env.WAAU_API_URL && process.env.WAAU_API_KEY);
  if (!configured) return NextResponse.json({ id, status: "queued", configured: false, assetUrl }, { headers: { "Cache-Control": "no-store" } });

  const sent = await sendViaWaau({ to: phone, message: parsed.message, mediaUrl: assetUrl, mediaType: type.ext === "gif" ? "gif" : "image", filename: `${parsed.name.replace(/\W+/g, "-")}-Invitation.${type.ext}`, reference: id });
  if (sent.ok) {
    await admin.from("invitation_dispatches").update({ status: "sent", provider_ref: sent.ref, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ id, status: "sent", configured: true, assetUrl }, { headers: { "Cache-Control": "no-store" } });
  }
  await admin.from("invitation_dispatches").update({ status: "failed", error: sent.error.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ id, status: "failed", configured: true, assetUrl, error: sent.error }, { status: 502 });
}

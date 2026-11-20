import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

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


export interface DeliveryInput {
  /** The invitation_dispatches row id (echoed back by n8n in its status callback). */
  id: string; phone: string; name: string; place: string; message: string; inviteUrl: string;
  assetUrl: string; assetType: "jpg" | "png" | "gif"; eventTitle: string; senderName: string;
  /** Public origin of this site, used to build the status callback URL given to n8n. */
  base: string;
}
export interface DeliveryResult { status: "sent" | "queued" | "failed"; configured: boolean; via?: "n8n" | "waau"; error?: string }

/**
 * Hands one stored dispatch to the delivery provider and records the outcome on its invitation_dispatches row:
 * n8n first when N8N_WAAU_WEBHOOK_URL is set, then the direct Waau Panel API (the only route when n8n isn't configured, the fallback when it fails).
 * With neither configured the row simply stays queued. Used by the studio's send route and by "Retry" in the dispatch log.
 */
export async function deliver(admin: SupabaseClient, i: DeliveryInput): Promise<DeliveryResult> {
  const now = () => new Date().toISOString();
  const waauConfigured = !!(process.env.WAAU_API_URL && process.env.WAAU_API_KEY);
  if (!process.env.N8N_WAAU_WEBHOOK_URL && !waauConfigured) return { status: "queued", configured: false };

  let n8nError = "";
  if (process.env.N8N_WAAU_WEBHOOK_URL) {
    const r = await sendViaN8n({
      eventTitle: i.eventTitle, senderName: i.senderName, supabaseCallbackUrl: `${i.base}/api/invitations/waau-status`,
      items: [{ id: i.id, guestName: i.name, guestPlace: i.place, guestPhone: i.phone, message: i.message, cardUrl: i.assetUrl, inviteUrl: i.inviteUrl }],
    });
    if (r.ok) {
      const patch = r.delivered ? { status: "sent", sent_at: now(), provider_response: r.response, error: null, error_message: null, updated_at: now() } : { status: "queued", provider_response: r.response, error: null, error_message: null, updated_at: now() };
      await admin.from("invitation_dispatches").update(patch).eq("id", i.id);
      return { status: r.delivered ? "sent" : "queued", configured: true, via: "n8n" };
    }
    n8nError = r.error;
    if (!waauConfigured) {
      await admin.from("invitation_dispatches").update({ status: "failed", error: n8nError.slice(0, 500), error_message: n8nError.slice(0, 500), updated_at: now() }).eq("id", i.id);
      return { status: "failed", configured: true, via: "n8n", error: n8nError };
    }
    console.error("[invitations] n8n failed, falling back to the direct Waau Panel API:", n8nError);
  }

  const sent = await sendViaWaau({ to: i.phone, message: i.message, mediaUrl: i.assetUrl, mediaType: i.assetType === "gif" ? "gif" : "image", filename: `${i.name.replace(/\W+/g, "-")}-Invitation.${i.assetType}`, reference: i.id });
  if (sent.ok) {
    await admin.from("invitation_dispatches").update({ status: "sent", provider_ref: sent.ref, sent_at: now(), error: null, error_message: null, updated_at: now() }).eq("id", i.id);
    return { status: "sent", configured: true, via: "waau" };
  }
  const why = (n8nError ? `${n8nError} | ` : "") + sent.error;
  await admin.from("invitation_dispatches").update({ status: "failed", error: why.slice(0, 500), error_message: why.slice(0, 500), updated_at: now() }).eq("id", i.id);
  return { status: "failed", configured: true, via: "waau", error: sent.error };
}

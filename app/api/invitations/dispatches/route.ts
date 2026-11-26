import { NextResponse } from "next/server";
import { z } from "zod";
import { clock } from "@/lib/invitation-cooldown";
import { cooldownFor, deliver } from "@/lib/invitation-delivery";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/session";
import { eventConfig, EVENT_TITLE, type EventType } from "@/lib/wedding";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUSES = ["sent", "queued", "failed"] as const;
const NO_STORE = { "Cache-Control": "no-store" };
const SETUP = "Run the invitation_dispatches SQL from supabase/schema.sql.";

/** The provider's own words for a failure when no error text was stored (provider_response is whatever n8n / Waau returned). */
function reasonFrom(r: unknown): string {
  if (!r) return "";
  if (typeof r === "string") return r.slice(0, 200);
  if (typeof r === "object") {
    const o = r as Record<string, unknown>;
    for (const k of ["error", "message", "detail", "reason", "raw"]) { const v = o[k]; if (typeof v === "string" && v) return v.slice(0, 200); if (v && typeof v === "object") { const m = (v as Record<string, unknown>).message; if (typeof m === "string" && m) return m.slice(0, 200); } }
    return JSON.stringify(r).slice(0, 200);
  }
  return String(r);
}

async function context() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in to see your dispatch history." }, { status: 401, headers: NO_STORE }) } as const;
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." }, { status: 503, headers: NO_STORE }) } as const;
  return { user, admin } as const;
}

/** The signed-in user's dispatches, newest first, with Total / Sent / Queued / Failed counts. ?status=sent|queued|failed filters the rows (never the counts). */
export async function GET(req: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const { user, admin } = ctx;
  const status = new URL(req.url).searchParams.get("status");

  // Cleared / deleted entries are only hidden (hidden_at), because the 24-hour per-number cooldown is computed from these rows. Before the hidden_at column exists, nothing is hidden.
  const run = (withHidden: boolean) => {
    let q = admin.from("invitation_dispatches")
      .select("id, guest_name, phone, status, error, error_message, provider_response, created_at, sent_at, invitation_id, asset_type, asset_url, wedding_invitations(template_id)")
      .eq("created_by", user.id).order("created_at", { ascending: false }).limit(300);
    if (withHidden) q = q.is("hidden_at", null);
    if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
    const count = (s?: string) => { let c = admin.from("invitation_dispatches").select("id", { count: "exact", head: true }).eq("created_by", user.id); if (withHidden) c = c.is("hidden_at", null); if (s) c = c.eq("status", s); return c; };
    return Promise.all([q, count(), count("sent"), count("queued"), count("failed")]);
  };
  let [rows, total, sent, queued, failed] = await run(true);
  if (rows.error && /hidden_at/.test(rows.error.message)) [rows, total, sent, queued, failed] = await run(false);
  if (rows.error) {
    console.error("[invitations/dispatches] list failed:", rows.error.message);
    return NextResponse.json({ error: `Couldn't read the dispatch log. ${SETUP}` }, { status: 503, headers: NO_STORE });
  }
  type Row = { asset_type: string | null; asset_url: string | null; id: string; guest_name: string; phone: string; status: string; error: string | null; error_message: string | null; provider_response: unknown; created_at: string; sent_at: string | null; invitation_id: string | null; wedding_invitations: { template_id: string } | { template_id: string }[] | null };
  const items = (rows.data as unknown as Row[]).map((r) => {
    const inv = Array.isArray(r.wedding_invitations) ? r.wedding_invitations[0] : r.wedding_invitations;
    return {
      id: r.id, guestName: r.guest_name, phone: r.phone, kind: r.asset_type === "mp4" ? "video" as const : "image" as const, videoUrl: r.asset_type === "mp4" ? r.asset_url : null, status: r.status as (typeof STATUSES)[number], templateId: inv?.template_id ?? null,
      createdAt: r.created_at, sentAt: r.sent_at, reason: r.status === "failed" ? r.error_message || r.error || reasonFrom(r.provider_response) || "The provider didn't say why." : "",
    };
  });
  return NextResponse.json({ rows: items, counts: { total: total.count ?? 0, sent: sent.count ?? 0, queued: queued.count ?? 0, failed: failed.count ?? 0 } }, { headers: NO_STORE });
}

const retryBody = z.object({ ids: z.array(z.string().uuid()).min(1).max(10), /** Ids whose guest the user confirmed has replied on WhatsApp: the cooldown doesn't apply to them. */ repliedIds: z.array(z.string().uuid()).max(10).default([]) });

/** Retries failed dispatches of the signed-in user with the card that was already stored (no re-render needed, so it works after the guest list is cleared). */
export async function POST(req: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const { user, admin } = ctx;
  const parsed = retryBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send 1 to 10 dispatch ids." }, { status: 400, headers: NO_STORE });

  const { data, error } = await admin.from("invitation_dispatches")
    .select("*, wedding_invitations(data)")
    .in("id", parsed.data.ids).eq("created_by", user.id).eq("status", "failed");
  if (error) return NextResponse.json({ error: `Couldn't read the dispatch log. ${SETUP}` }, { status: 503, headers: NO_STORE });

  const proto = req.headers.get("x-forwarded-proto") ?? "https", host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "")).replace(/\/$/, "");
  const results: { id: string; status: string; error?: string }[] = [];
  for (const r of data as unknown as { poster_url?: string | null; id: string; guest_name: string; guest_place: string; phone: string; message: string; invite_url: string; asset_url: string | null; asset_type: string | null; wedding_invitations: { data?: { details?: { eventType?: EventType; groom?: string; bride?: string } } } | { data?: { details?: { eventType?: EventType; groom?: string; bride?: string } } }[] | null }[]) {
    if (!r.asset_url) { results.push({ id: r.id, status: "failed", error: "The stored card is missing, so this can't be retried." }); continue; }
    const until = parsed.data.repliedIds.includes(r.id) ? null : await cooldownFor(admin, r.phone);
    if (until) { results.push({ id: r.id, status: "cooldown", error: `In cooldown (2 per 24 hours): try again in ${clock(until - Date.now())}, or confirm the guest replied.` }); continue; }
    const inv = Array.isArray(r.wedding_invitations) ? r.wedding_invitations[0] : r.wedding_invitations;
    const det = inv?.data?.details;
    const cfg = det?.eventType ? eventConfig(det.eventType) : null;
    const out = await deliver(admin, {
      id: r.id, phone: r.phone, name: r.guest_name, place: r.guest_place, message: r.message, inviteUrl: r.invite_url, assetUrl: r.asset_url,
      assetType: r.asset_type === "png" || r.asset_type === "gif" || r.asset_type === "mp4" ? r.asset_type : "jpg", posterUrl: r.poster_url ?? null,
      eventTitle: det?.eventType ? EVENT_TITLE[det.eventType].en : "", senderName: cfg ? (cfg.couple ? [det?.groom, det?.bride] : [det?.groom]).filter(Boolean).join(" & ") : "", base,
    });
    results.push({ id: r.id, status: out.status, ...(out.error ? { error: out.error } : {}) });
  }
  return NextResponse.json({ results }, { headers: NO_STORE });
}

const BUCKET = "invitation-cards";
const objectPath = (url: string | null) => { const m = url ? /\/object\/public\/invitation-cards\/(.+?)(?:\?|$)/.exec(url) : null; return m ? decodeURIComponent(m[1]) : null; };

/**
 * Removes entries from the signed-in user's dispatch log: ?id=<uuid> for one, ?status=sent|queued|failed for a status, ?all=true (or status=all) for everything.
 * Rows are only HIDDEN (hidden_at), never deleted, so the 2-per-24-hours cooldown per WhatsApp number can't be reset by clearing the log. The rendered card / video
 * files of entries that are no longer in flight (not "queued") are removed from Storage, best effort.
 */
export async function DELETE(req: Request) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const { user, admin } = ctx;
  const sp = new URL(req.url).searchParams, id = sp.get("id"), status = sp.get("status"), all = sp.get("all") === "true" || status === "all";
  const idOk = id && z.string().uuid().safeParse(id).success;
  if (!idOk && !all && !(status && (STATUSES as readonly string[]).includes(status))) return NextResponse.json({ error: "Say what to delete: ?id=<id>, ?status=sent|queued|failed or ?all=true." }, { status: 400, headers: NO_STORE });

  const pick = () => {
    let q = admin.from("invitation_dispatches").select("id, status, asset_url, poster_url").eq("created_by", user.id).is("hidden_at", null);
    if (idOk) q = q.eq("id", id!); else if (!all) q = q.eq("status", status!);
    return q.limit(2000);
  };
  const { data, error } = await pick();
  if (error) {
    const missing = /hidden_at|poster_url/.test(error.message);
    console.error("[invitations/dispatches] delete lookup failed:", error.message);
    return NextResponse.json({ error: missing ? "Run the hidden_at column SQL from supabase/schema.sql (Dispatch Log cleanup), then try again." : `Couldn't read the dispatch log. ${SETUP}` }, { status: 503, headers: NO_STORE });
  }
  const rows = (data ?? []) as { id: string; status: string; asset_url: string | null; poster_url: string | null }[];
  if (rows.length === 0) return NextResponse.json({ deleted: 0 }, { headers: NO_STORE });

  const now = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 200) {
    const ids = rows.slice(i, i + 200).map((r) => r.id);
    const { error: ue } = await admin.from("invitation_dispatches").update({ hidden_at: now }).in("id", ids).eq("created_by", user.id);
    if (ue) { console.error("[invitations/dispatches] hide failed:", ue.message); return NextResponse.json({ error: "Couldn't delete those entries." }, { status: 500, headers: NO_STORE }); }
  }
  // Best-effort storage cleanup (a queued entry may still be fetched by the provider, so its files stay).
  const paths = [...new Set(rows.filter((r) => r.status !== "queued").flatMap((r) => [objectPath(r.asset_url), objectPath(r.poster_url)]).filter((x): x is string => !!x))];
  for (let i = 0; i < paths.length; i += 100) {
    const rm = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (rm.error) console.error("[invitations/dispatches] storage cleanup:", rm.error.message);
  }
  return NextResponse.json({ deleted: rows.length }, { headers: NO_STORE });
}

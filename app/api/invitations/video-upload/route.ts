import { NextResponse } from "next/server";
import { z } from "zod";
import { clock, COOLDOWN_MAX } from "@/lib/invitation-cooldown";
import { cooldownFor } from "@/lib/invitation-delivery";
import { normalizePhone, validPhone } from "@/lib/wedding";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
const BUCKET = "invitation-cards";
const NO_STORE = { "Cache-Control": "no-store" };

const body = z.object({ phone: z.string().trim().max(32), guestReplied: z.boolean().default(false) });

const hits = new Map<string, number[]>();
function throttled(id: string) {
  const now = Date.now(), recent = (hits.get(id) ?? []).filter((t) => now - t < 600_000);
  recent.push(now); hits.set(id, recent);
  return recent.length > 400; // one upload per guest video
}

/**
 * Greeting videos are up to 16 MB, far over the ~4.5 MB request body the host allows, so the browser uploads each rendered MP4 straight to
 * Storage. This is also the pre-flight for each guest's video: it runs the 24-hour per-number cooldown check BEFORE the (minute-long) render starts,
 * then hands the browser a one-time signed upload URL for a fresh path; /api/invitations/waau-dispatch later verifies that file exists and
 * is the right size before anything is sent.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) { let ok = false; try { ok = new URL(origin).host === host; } catch { /* malformed */ } if (!ok) return NextResponse.json({ error: "Forbidden origin." }, { status: 403, headers: NO_STORE }); }
  const user = await getSessionUser();
  const demo = process.env.NODE_ENV !== "production" && /(^|;\s*)intelliad_session=/.test(req.headers.get("cookie") ?? "");
  if (!user && !demo) return NextResponse.json({ error: "Sign in to send video greetings." }, { status: 401, headers: NO_STORE });
  if (throttled(user?.id ?? req.headers.get("x-forwarded-for") ?? "demo")) return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429, headers: NO_STORE });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server storage isn't configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503, headers: NO_STORE });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validPhone(parsed.data.phone)) return NextResponse.json({ error: "That WhatsApp number isn't valid." }, { status: 400, headers: NO_STORE });
  const until = parsed.data.guestReplied ? null : await cooldownFor(admin, normalizePhone(parsed.data.phone));
  if (until) {
    const wait = until - Date.now();
    return NextResponse.json({ code: "cooldown", cooldownUntil: until, retryAfterSec: Math.ceil(wait / 1000), error: `This number already received ${COOLDOWN_MAX} invitations in the last 24 hours. You can send again in ${clock(wait)}, or confirm the guest replied.` }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(Math.ceil(wait / 1000)) } });
  }

  const path = `dispatch/video/${crypto.randomUUID()}/${crypto.randomUUID()}.mp4`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[invitations/video-upload]", error?.message);
    return NextResponse.json({ error: "Couldn't prepare the upload. Run the invitation-cards bucket SQL from supabase/schema.sql." }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({ path, token: data.token }, { headers: NO_STORE });
}

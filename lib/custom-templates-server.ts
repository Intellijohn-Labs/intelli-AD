import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

export const NO_STORE = { "Cache-Control": "no-store" };
export const SETUP_HINT = "Run supabase/custom_templates.sql in the Supabase SQL editor.";

/** Validates the admin session (cookie → verified Supabase user with the admin role) and returns the service-role client, or the error response to send. */
export async function adminGate(req: Request) {
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) { let ok = false; try { ok = new URL(origin).host === host; } catch { /* malformed */ } if (!ok) return { error: NextResponse.json({ error: "Forbidden origin." }, { status: 403, headers: NO_STORE }) }; }
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in as an admin." }, { status: 401, headers: NO_STORE }) };
  if (!isAdminUser(user)) return { error: NextResponse.json({ error: "Not authorised." }, { status: 403, headers: NO_STORE }) };
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." }, { status: 503, headers: NO_STORE }) };
  return { admin };
}

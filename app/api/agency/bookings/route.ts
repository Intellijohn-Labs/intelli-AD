import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Keep in sync with SESSION_COOKIE in lib/auth.tsx.
const SESSION_COOKIE = "intelliad_session";

/**
 * A partner's bookings, read with the server-only service-role key (the browser key cannot read the table).
 * NOTE: the partner code comes from the session cookie, which is set by the browser and can be forged until real
 * authentication (e.g. Supabase Auth) replaces it. Do not treat this as access control for real customer data.
 */
export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server sync not configured" }, { status: 501 });

  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  let code: string | undefined;
  try {
    const u = raw ? JSON.parse(decodeURIComponent(raw)) : null;
    if (u?.is_agency === true && typeof u.akshaya_code === "string") code = u.akshaya_code;
  } catch { /* malformed cookie */ }
  if (!code) return NextResponse.json({ error: "Partner session required" }, { status: 401 });

  const { data, error } = await admin
    .from("bookings")
    .select("*")
    .eq("customer_details->agency->>code", code)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * A partner's bookings, read with the server-only service-role key (the browser key cannot read the table).
 * Access is limited to approved partners and to their own centre code, taken from the verified session.
 */
export async function GET() {
  const admin = createAdminClient();
  // No service-role key: not an error, the dashboard simply runs on this device's own bookings.
  if (!admin) return NextResponse.json({ bookings: [], localMode: true });

  // The partner is identified by the verified Supabase session, and must be an approved partner (app_metadata.role).
  const supabase = await createClient();
  const { data: auth } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const u = auth.user;
  const role = (u?.app_metadata as { role?: string } | undefined)?.role;
  const code = (u?.user_metadata as { center_code?: string } | undefined)?.center_code;
  if (!u || (role !== "agency" && role !== "akshaya") || !code) return NextResponse.json({ error: "Approved partner session required" }, { status: 401 });

  const { data, error } = await admin
    .from("bookings")
    .select("*")
    .eq("customer_details->agency->>code", code)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

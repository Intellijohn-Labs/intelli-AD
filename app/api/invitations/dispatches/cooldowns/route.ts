import { NextResponse } from "next/server";
import { z } from "zod";
import { recentSendTimes } from "@/lib/invitation-delivery";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/session";
import { normalizePhone, validPhone } from "@/lib/wedding";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const body = z.object({ phones: z.array(z.string().max(32)).max(3000) });

/** Recent send times (ms) for the numbers in the guest list, so the browser can run the same 2-per-15-minutes countdown the server enforces. */
export async function POST(req: Request) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers: NO_STORE });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a list of phone numbers." }, { status: 400, headers: NO_STORE });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." }, { status: 503, headers: NO_STORE });
  const phones = [...new Set(parsed.data.phones.filter(validPhone).map(normalizePhone))];
  const times = await recentSendTimes(admin, phones);
  if (!times) return NextResponse.json({ error: "Couldn't read the dispatch history." }, { status: 503, headers: NO_STORE });
  return NextResponse.json({ times }, { headers: NO_STORE });
}

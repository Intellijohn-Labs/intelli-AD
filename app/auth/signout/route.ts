import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Server-side sign-out: revokes this session at Supabase and expires every auth cookie (sb-*, demo session). */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    /* even if Supabase is unreachable, still wipe the cookies below */
  }
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-") || name === "intelliad_session") res.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
  }
  return res;
}

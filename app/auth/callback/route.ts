import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Only same-site paths: "/x" is fine, "//evil.com", "/\evil.com" or "https://…" would make this an open redirect. */
const safeNext = (next: string | null) => (next && /^\/(?![/\\])/.test(next) ? next : null);

/** Exchanges the email-confirmation (or OAuth) code for a session, then sends the user on. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && url && key) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there.
          }
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) return NextResponse.redirect(`${origin}${next}`);
      // No explicit destination: approved partners go to their dashboard, everyone else to Home.
      const { data } = await supabase.auth.getUser();
      const role = (data.user?.app_metadata as { role?: string } | undefined)?.role;
      return NextResponse.redirect(`${origin}${role === "admin" ? "/admin/rates" : role === "agency" || role === "akshaya" ? "/agency/dashboard" : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

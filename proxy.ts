import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Legacy demo cookie (development only). Keep the name in sync with SESSION_COOKIE in lib/auth.tsx.
const SESSION_COOKIE = "intelliad_session";
const DEV = process.env.NODE_ENV !== "production";

interface Session {
  /** Approved partner (app_metadata.role set by an admin). */
  agency: boolean;
  /** Registered as a partner and waiting for approval: may see the "pending" page, nothing more. */
  pendingPartner: boolean;
}

const isPartnerRole = (r: unknown) => r === "agency" || r === "akshaya";

function sessionOf(u: User): Session {
  return {
    agency: isPartnerRole((u.app_metadata as { role?: string } | undefined)?.role),
    pendingPartner: isPartnerRole((u.user_metadata as { role?: string } | undefined)?.role),
  };
}

function demoSession(request: NextRequest): Session | null {
  if (!DEV) return null; // never honoured in production
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const u = JSON.parse(decodeURIComponent(raw));
    return typeof u?.name === "string" ? { agency: u.is_agency === true, pendingPartner: false } : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  let response = NextResponse.next({ request });
  let session: Session | null = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          // Refreshed tokens must reach both this request and the browser.
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // getUser() validates the token with Supabase (getSession() would trust the cookie).
    const { data } = await supabase.auth.getUser();
    if (data.user) session = sessionOf(data.user);
  }
  session ??= demoSession(request);

  const go = (to: string | URL) => {
    const res = NextResponse.redirect(typeof to === "string" ? new URL(to, request.url) : to);
    response.cookies.getAll().forEach((c) => res.cookies.set(c)); // keep any refreshed session cookies
    return res;
  };

  const onLogin = pathname === "/login" || pathname.startsWith("/login/");
  const inAgency = pathname === "/agency" || pathname.startsWith("/agency/");
  if (pathname.startsWith("/auth/")) return response; // email-confirmation callback

  // Partners go straight to their workspace; customers land on Home, unless they opened the partner tab to switch accounts.
  if (session && onLogin) {
    if (session.agency) return go("/agency/dashboard");
    if (searchParams.get("tab") !== "agency" || session.pendingPartner) return go("/");
  }
  if (onLogin) return response;

  // The partner area: approved partners, plus pending partners (who only see the "awaiting approval" page).
  if (inAgency && !(session && (session.agency || session.pendingPartner))) {
    const to = new URL("/login", request.url);
    to.searchParams.set("tab", "agency");
    if (!session) to.searchParams.set("auth", "required");
    return go(to);
  }
  if (session) return response;

  // Guests: everything else requires a session.
  const to = new URL("/login", request.url);
  to.searchParams.set("auth", "required");
  return go(to);
}

export const config = {
  // Everything except Next internals and public static assets (images, fonts, favicon/icon, any file with an extension).
  matcher: ["/((?!_next/|images/|fonts/|favicon\\.ico|icon\\.png|.*\\..*).*)"],
};

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Legacy demo cookie (development only). Keep the name in sync with SESSION_COOKIE in lib/auth.tsx.
const SESSION_COOKIE = "intelliad_session";
const DEV = process.env.NODE_ENV !== "production";

interface Session {
  /** Admin (app_metadata.role = "admin", set only by you in Supabase). */
  admin?: boolean;
  /** Approved partner (app_metadata.role set by an admin). */
  agency: boolean;
  /** Registered as a partner and waiting for approval: may see the "pending" page, nothing more. */
  pendingPartner: boolean;
}

const isPartnerRole = (r: unknown) => r === "agency" || r === "akshaya";

function sessionOf(u: User): Session {
  const appRole = (u.app_metadata as { role?: string } | undefined)?.role;
  const agency = isPartnerRole(appRole);
  return {
    admin: appRole === "admin",
    agency,
    // Explicit "pending_approval", or a partner type requested at sign-up and not yet approved.
    pendingPartner: !agency && (appRole === "pending_approval" || isPartnerRole((u.user_metadata as { role?: string } | undefined)?.role)),
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
    // Bounced here from /admin: show the "not authorised" notice instead of redirecting again.
    if (searchParams.get("notice") === "unauthorized") return response;
    // Only the dedicated Admin tab leads to the admin portal; admins using any other tab are treated like customers.
    if (searchParams.get("tab") === "admin") return session.admin ? go("/admin") : response; // non-admins may stay to switch accounts
    if (session.agency) return go("/agency/dashboard");
    // Pending partners stay on the login page when sent here with the notice; otherwise they are treated as customers.
    if (session.pendingPartner && searchParams.get("notice") === "pending_approval") return response;
    if (searchParams.get("tab") !== "agency" || session.pendingPartner) return go("/");
  }
  if (onLogin) return response;

  // The partner area is for approved partners only. Pending ones are sent to the notice; the rest to partner sign-in.
  if (inAgency && !session?.agency) {
    const to = new URL("/login", request.url);
    to.searchParams.set("tab", "agency");
    if (session?.pendingPartner) to.searchParams.set("notice", "pending_approval");
    else if (!session) to.searchParams.set("auth", "required");
    return go(to);
  }
  // The admin area is for admins only; everyone else is sent to sign-in with a notice.
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !session?.admin) {
    const to = new URL("/login", request.url);
    to.searchParams.set("notice", "unauthorized");
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

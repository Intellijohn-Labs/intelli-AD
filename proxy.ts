import { NextResponse, type NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/auth.tsx (proxy must not import client modules).
const SESSION_COOKIE = "intelliad_session";

/** Reads the (client-set, not tamper-proof) session cookie: null when absent or malformed. */
function readSession(request: NextRequest): { is_agency: boolean } | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const u = JSON.parse(decodeURIComponent(raw));
    return typeof u?.name === "string" ? { is_agency: u.is_agency === true } : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const session = readSession(request);
  const onLogin = pathname === "/login" || pathname.startsWith("/login/");
  const inAgency = pathname === "/agency" || pathname.startsWith("/agency/");

  // Partners go straight to their workspace; customers land on Home, unless they opened the partner tab to switch accounts.
  if (session && onLogin) {
    if (session.is_agency) return NextResponse.redirect(new URL("/agency/dashboard", request.url));
    if (searchParams.get("tab") !== "agency") return NextResponse.redirect(new URL("/", request.url));
  }
  if (onLogin) return NextResponse.next();

  // The partner area is for agency sessions only; /agency/login forwards to the unified login's partner tab.
  if (inAgency && !session?.is_agency) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("tab", "agency");
    if (!session) url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }
  if (session) return NextResponse.next();

  // Guests: everything else requires a session. Login always lands on Home afterwards, so no return path is kept.
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("auth", "required");
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and public static assets (images, fonts, favicon/icon, any file with an extension).
  matcher: ["/((?!_next/|images/|fonts/|favicon\\.ico|icon\\.png|.*\\..*).*)"],
};

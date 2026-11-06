import { NextResponse, type NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/auth.tsx (proxy must not import client modules).
const SESSION_COOKIE = "intelliad_session";

function hasSession(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  try {
    const u = JSON.parse(decodeURIComponent(raw));
    return typeof u?.name === "string";
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = hasSession(request);
  const onLogin = pathname === "/login" || pathname.startsWith("/login/");

  // Already signed in: the login screen is pointless, so go straight to Home.
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/", request.url));
  if (onLogin || signedIn) return NextResponse.next();

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

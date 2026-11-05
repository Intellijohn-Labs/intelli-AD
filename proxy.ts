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
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/login/")) return NextResponse.next();
  if (hasSession(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and public static assets (images, fonts, favicon/icon, any file with an extension).
  matcher: ["/((?!_next/|images/|fonts/|favicon\\.ico|icon\\.png|.*\\..*).*)"],
};

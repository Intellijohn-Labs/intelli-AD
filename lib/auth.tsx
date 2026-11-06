"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { MalayalamRainLoader } from "@/components/ui/malayalam-rain-loader";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthUser {
  name: string;
  /** Phone (+91…) or email shown under the name. */
  identifier: string;
  method: "phone" | "email" | "google";
}

/** Cookie read by proxy.ts to gate routes. Keep the name in sync with it. */
export const SESSION_COOKIE = "intelliad_session";
const REMEMBER_DAYS = 30;

export const isPublicPath = (p: string) => p === "/login" || p.startsWith("/login/");

function readSession(): AuthUser | null {
  try {
    const m = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    if (!m) return null;
    const u = JSON.parse(decodeURIComponent(m.slice(SESSION_COOKIE.length + 1)));
    return u && typeof u.name === "string" ? u : null;
  } catch {
    return null;
  }
}
function writeSession(u: AuthUser, remember: boolean) {
  const age = remember ? `; Max-Age=${REMEMBER_DAYS * 86400}` : ""; // otherwise a browser-session cookie
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(u))}; Path=/; SameSite=Lax${age}`;
}
function clearSession() {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface Ctx {
  user: AuthUser | null;
  /** False until the saved session has been read. */
  ready: boolean;
  signIn: (user: AuthUser, remember: boolean) => void;
  signOut: () => void;
}

const AuthContext = createContext<Ctx | null>(null);

/**
 * Front-end-only session kept in a cookie so proxy.ts can gate routes server-side.
 * There is no backend yet, so every sign-in method is simulated and the cookie is NOT
 * tamper-proof: swap it for a signed, httpOnly session set by a real auth API.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readSession());
    setReady(true);
  }, []);

  // Client-side guard (backs up proxy.ts, e.g. when the cookie expires mid-visit).
  useEffect(() => {
    if (ready && !user && !isPublicPath(pathname)) {
      router.replace("/login?auth=required");
    }
  }, [ready, user, pathname, router]);

  const signIn = useCallback((u: AuthUser, remember: boolean) => {
    writeSession(u, remember);
    setUser(u);
    setCelebrating(true); // Malayalam letter-rain celebration, shown only on a fresh sign-in
  }, []);
  const signOut = useCallback(() => {
    clearSession();
    try { sessionStorage.removeItem("intelliad.booking.v1"); } catch { /* ignore */ } // drop the in-progress draft
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  const blocked = ready && !user && !isPublicPath(pathname);
  return (
    <AuthContext.Provider value={value}>
      {blocked ? null : children}
      <AnimatePresence>{celebrating && <MalayalamRainLoader key="celebrate" onComplete={() => setCelebrating(false)} />}</AnimatePresence>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

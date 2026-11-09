"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { MalayalamRainLoader } from "@/components/ui/malayalam-rain-loader";
import { createClient } from "@/lib/supabase/client";
import { signOutSupabase, userFromSupabase } from "@/lib/supabase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthUser {
  name: string;
  /** Phone (+91…) or email shown under the name. */
  identifier: string;
  method: "phone" | "email" | "google";
  /** Agency / Akshaya partner profile. Absent or false for regular customers. */
  is_agency?: boolean;
  /** Admin (app_metadata.role = "admin"). */
  is_admin?: boolean;
  agency_name?: string;
  akshaya_code?: string;
  /** Opening wallet balance in INR. The live balance is kept in the agency ledger (lib/agency.ts). */
  wallet_balance?: number;
  /** Partner commission as a percentage of the pre-GST booking value. */
  commission_rate?: number;
  partner_type?: "akshaya" | "csc" | "agency";
  /** "approved" once an admin has set app_metadata.role; "pending" right after a partner registers. */
  partner_status?: "approved" | "pending";
  contact_name?: string;
  phone?: string;
}

/** Where a signed-in user lands: partners go to their workspace, customers to Home. */
export const homeFor = (u: Pick<AuthUser, "is_agency" | "is_admin"> | null | undefined) => (u?.is_admin ? "/admin/rates" : u?.is_agency ? "/agency/dashboard" : "/");

/** Cookie read by proxy.ts to gate routes. Keep the name in sync with it. */
export const SESSION_COOKIE = "intelliad_session";
const REMEMBER_DAYS = 30;

export const isPublicPath = (p: string) => p === "/login" || p.startsWith("/login/") || p.startsWith("/auth/");

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

const DEV = process.env.NODE_ENV !== "production";

interface Ctx {
  user: AuthUser | null;
  /** False until the saved session has been read. */
  ready: boolean;
  /** Development-only quick sign-in helper (a local cookie, not a real account). Does nothing in production. */
  signIn: (user: AuthUser, remember: boolean) => void;
  /** Plays the welcome animation after a real sign-in. */
  celebrate: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Ctx | null>(null);

/**
 * Session state from Supabase Auth (cookie session, refreshed by proxy.ts), kept in sync through
 * onAuthStateChange. In development only, a local "demo" cookie can stand in for a signed-in user.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    const fallback = () => (DEV ? readSession() : null); // demo cookie, development only
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(fallback());
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? userFromSupabase(data.session.user) : fallback());
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? userFromSupabase(session.user) : fallback());
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Client-side guard (backs up proxy.ts, e.g. when the session expires mid-visit).
  useEffect(() => {
    if (ready && !user && !isPublicPath(pathname)) {
      router.replace(pathname.startsWith("/agency") ? "/login?tab=agency&auth=required" : "/login?auth=required");
    }
  }, [ready, user, pathname, router]);

  const signIn = useCallback((u: AuthUser, remember: boolean) => {
    if (!DEV) return;
    writeSession(u, remember);
    setUser(u);
    setCelebrating(true);
  }, []);
  const celebrate = useCallback(() => setCelebrating(true), []);
  const signOut = useCallback(async () => {
    const wasAdmin = !!user?.is_admin;
    const wasPartner = !!user && (!!user.is_agency || !!user.partner_status);
    clearSession();
    try { sessionStorage.removeItem("intelliad.booking.v1"); } catch { /* ignore */ } // drop the in-progress draft
    await signOutSupabase();
    setUser(null);
    router.replace(wasAdmin ? "/login?tab=admin" : wasPartner ? "/login?tab=agency" : "/login?tab=user");
  }, [router, user]);

  const value = useMemo(() => ({ user, ready, signIn, celebrate, signOut }), [user, ready, signIn, celebrate, signOut]);
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

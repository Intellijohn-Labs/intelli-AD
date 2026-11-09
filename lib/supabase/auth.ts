import type { Session, User } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/auth";
import { createClient } from "./client";

export type Role = "individual" | "akshaya" | "agency";
export const isPartnerRole = (r: unknown): r is "akshaya" | "agency" => r === "akshaya" || r === "agency";

/** Default commission by partner type. */
const COMMISSION: Record<"akshaya" | "agency", number> = { akshaya: 15, agency: 10 };

/** Registered as a partner but not yet approved. */
export const isPendingApproval = (u: User) => !isPartnerRole((u.app_metadata as { role?: string } | undefined)?.role) && (isPartnerRole((u.user_metadata as { role?: string } | undefined)?.role) || (u.app_metadata as { role?: string } | undefined)?.role === "pending_approval");

/**
 * Supabase user -> app user.
 * Trust model: `user_metadata` is written by the user at sign-up (anyone can claim role=agency), so it only records
 * what they REQUESTED. Partner access follows `app_metadata.role`, which only the service role / dashboard can set,
 * i.e. an admin approval. Until then `partner_status` is "pending".
 */
export function userFromSupabase(u: User): AuthUser {
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const appRole = (u.app_metadata as { role?: string } | undefined)?.role;
  const approved = isPartnerRole(appRole) ? appRole : null;
  // "pending_approval" (set explicitly by an admin) or a partner type the user asked for at sign-up: both wait for approval.
  const requested = isPartnerRole(meta.role) ? meta.role : appRole === "pending_approval" ? "agency" : null;
  const type = approved ?? requested;
  const name = meta.agency_name || meta.full_name || u.email?.split("@")[0] || u.phone || "Account";
  return {
    name,
    identifier: u.email ?? u.phone ?? "",
    method: u.email ? "email" : "phone",
    is_agency: !!approved,
    is_admin: appRole === "admin",
    partner_status: approved ? "approved" : requested ? "pending" : undefined,
    contact_name: meta.full_name,
    agency_name: type ? meta.agency_name : undefined,
    akshaya_code: type ? meta.center_code : undefined,
    phone: meta.phone ?? u.phone ?? undefined,
    commission_rate: type ? COMMISSION[type] : undefined,
    partner_type: type ?? undefined,
  };
}

export interface RegisterInput {
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  agencyName?: string;
  centerCode?: string;
}

const unavailable = { error: "Sign-in isn't available right now (the service isn't configured)." };

const friendly = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first: open the link we sent you, then sign in.";
  if (/already registered|already been registered/i.test(msg)) return "An account with this email already exists. Sign in instead.";
  if (/unsupported phone provider|phone.*(disabled|not enabled)/i.test(msg)) return "Phone sign-in isn't enabled yet. Please use your email and password.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a little and try again.";
  if (/password/i.test(msg) && /(least|short|weak)/i.test(msg)) return "Choose a stronger password (at least 8 characters).";
  return msg;
};

/** Create an account. `needsConfirm` is true when email confirmation is on and no session was issued yet. */
export async function register(input: RegisterInput): Promise<{ error?: string; needsConfirm?: boolean; user?: User }> {
  const supabase = createClient();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        full_name: input.fullName,
        phone: input.phone,
        role: input.role, // what the user asked for; partner access still needs approval (see userFromSupabase)
        center_code: input.centerCode,
        agency_name: input.agencyName,
      },
    },
  });
  if (error) return { error: friendly(error.message) };
  // With "confirm email" on, an already-registered address returns a user with no identities and no error.
  if (data.user && data.user.identities?.length === 0) return { error: friendly("already registered") };
  return { needsConfirm: !data.session, user: data.user ?? undefined };
}

export async function signInWithPassword(email: string, password: string): Promise<{ error?: string; user?: User }> {
  const supabase = createClient();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: friendly(error.message) } : { user: data.user };
}

/** Phone + OTP. Needs an SMS provider (Twilio etc.) enabled in the Supabase project. */
export async function sendPhoneOtp(phone: string, meta?: Record<string, string>): Promise<{ error?: string }> {
  const supabase = createClient();
  if (!supabase) return unavailable;
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { data: meta } });
  return error ? { error: friendly(error.message) } : {};
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<{ error?: string; user?: User }> {
  const supabase = createClient();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  return error ? { error: friendly(error.message) } : { user: data.user ?? undefined };
}

export async function signOutSupabase(): Promise<void> {
  await createClient()?.auth.signOut();
}

export const sessionUser = (s: Session | null) => (s ? userFromSupabase(s.user) : null);

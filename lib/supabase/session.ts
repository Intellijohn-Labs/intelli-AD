import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * The verified Supabase user for this request (one network round-trip to Supabase Auth, shared by the admin layout,
 * pages and actions rendered in the same request via React's per-request cache).
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export const isAdminUser = (u: User | null) => (u?.app_metadata as { role?: string } | undefined)?.role === "admin";

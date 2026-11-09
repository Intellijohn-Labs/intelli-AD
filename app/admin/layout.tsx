import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | IntelliAd Admin" }, robots: { index: false } };

/**
 * Second line of defence behind proxy.ts: verifies the session with Supabase on the server and requires the
 * admin-only `app_metadata.role === "admin"`. (Users can't edit app_metadata; user_metadata would be forgeable.)
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const role = (data.user?.app_metadata as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/login?notice=unauthorized");
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>;
}

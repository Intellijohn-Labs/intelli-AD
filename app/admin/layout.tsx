import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | IntelliAd Admin" }, robots: { index: false } };

/**
 * Second line of defence behind proxy.ts: verifies the session with Supabase on the server and requires the
 * admin-only `app_metadata.role === "admin"`. (Users can't edit app_metadata; user_metadata would be forgeable.)
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser(); // cached for this request: pages and actions reuse the same lookup
  if (!isAdminUser(user)) redirect("/login?notice=unauthorized");
  // Isolated shell: own header, no customer header/footer/stepper/booking actions (the root layout hides them under /admin).
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader email={user?.email ?? ""} />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}

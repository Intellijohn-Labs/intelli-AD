"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

/** Account details from the signed-in Supabase user. */
export function ProfileView() {
  const { user, ready, signOut } = useAuth();
  if (!ready || !user) return null;
  const rows: [string, string | undefined][] = [
    ["Name", user.contact_name ?? user.name],
    ["Email / phone", user.identifier],
    ["Mobile", user.phone],
    ["Account type", user.partner_type ? `Partner · ${user.partner_type === "akshaya" ? "Akshaya Centre" : "Ad Agency"}` : "Individual"],
    ["Centre / agency", user.agency_name],
    ["Centre code", user.akshaya_code],
    ["Partner status", user.partner_status === "approved" ? "Approved" : user.partner_status === "pending" ? "Awaiting approval" : undefined],
  ];
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Your profile</h1>
      <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-[#132247]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={user.is_agency ? "/agency/dashboard" : "/account/bookings"} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">{user.is_agency ? "Partner dashboard" : "My bookings"}</Link>
        <button type="button" onClick={() => void signOut()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/10">Sign out</button>
      </div>
    </div>
  );
}

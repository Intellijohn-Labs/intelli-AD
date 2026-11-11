"use client";

import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/rates", label: "Newspapers & Rates" },
  { href: "/admin/admins", label: "Admin Users" },
  { href: "/admin/bookings", label: "Bookings Monitor" },
  { href: "/admin/banners", label: "Ad Banners (പ്രമോഷൻ പോസ്റ്ററുകൾ)" },
  { href: "/admin/settings/ai", label: "AI Settings" },
];

/** The admin portal's own header: admin badge, section links, signed-in email and Sign Out. No customer booking actions. */
export function AdminHeader({ email }: { email: string }) {
  const path = usePathname();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-serif text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Intelli<span className="text-emerald-700 dark:text-emerald-400">Ad</span>
        </Link>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase dark:bg-slate-100 dark:text-slate-900"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Admin Mode</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-[16rem] truncate text-xs text-slate-600 sm:block dark:text-slate-300" title={email}>{email}</span>
          <button type="button" disabled={busy} onClick={() => { setBusy(true); void signOut(); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LogOut className="h-3.5 w-3.5" aria-hidden="true" />}Sign Out
          </button>
        </div>
        <nav aria-label="Admin sections" className="-mb-2 flex w-full gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const on = l.exact ? path === l.href : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} prefetch aria-current={on ? "page" : undefined}
                className={cn("shrink-0 border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap", on ? "border-blue-600 text-blue-700 dark:text-sky-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

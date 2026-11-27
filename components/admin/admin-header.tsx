"use client";

import { ArrowLeft, Loader2, LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";


/** The admin portal's own header: logo, admin badge, a back-to-modules button inside any section, signed-in email and Sign Out. The modules themselves are cards on /admin. */
export function AdminHeader({ email }: { email: string }) {
  const path = usePathname();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <header className="sticky top-0 z-40 dark border-b border-white/10 bg-[#0A0B0D]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/admin" aria-label="AI admanager admin home" className="flex items-center"><Image src="/logo.png" alt="AI admanager" width={40} height={40} className="h-10 w-10 rounded-lg ring-1 ring-white/15" /></Link>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase dark:bg-slate-100 dark:text-slate-900"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Admin Mode</span>
        {path !== "/admin" && (
          <Link href="/admin" data-admin-back className="touch-comfort inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-bold text-slate-100 transition-colors hover:bg-white/10"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All Modules</Link>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-[16rem] truncate text-xs text-slate-600 sm:block dark:text-slate-300" title={email}>{email}</span>
          <button type="button" disabled={busy} onClick={() => { setBusy(true); void signOut(); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LogOut className="h-3.5 w-3.5" aria-hidden="true" />}Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

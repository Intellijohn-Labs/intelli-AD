"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/rates", label: "Newspapers & Rates" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/bookings", label: "Bookings" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
      {TABS.map((t) => {
        const on = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
            className={cn("-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap", on ? "border-blue-600 text-blue-700 dark:text-sky-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [{ href: "/admin/rates", label: "Rate cards" }, { href: "/admin/admins", label: "Admin users" }];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections" className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path.startsWith(t.href) ? "page" : undefined}
          className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-semibold", path.startsWith(t.href) ? "border-blue-600 text-blue-700 dark:text-sky-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

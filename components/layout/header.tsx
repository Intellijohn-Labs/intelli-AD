"use client";

import { Building2, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthControl } from "@/components/auth/user-menu";
import { useI18n } from "@/context/language-context";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/newspaper", label: "Newspaper" },
  { href: "/categories", label: "Categories & Templates" },
];

const CTA = "inline-flex items-center justify-center rounded-lg bg-[#E11D48] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#BE123C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] active:scale-[0.98]";

const AGENCY_BADGE = "flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/60";

/** Clean white header: logo, quiet nav with a soft active pill, segmented language control, one red CTA. */
export function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  // Partners (or anyone already inside the partner area) never see a link to the page they are on.
  const inPartnerArea = !!user?.is_agency || pathname.startsWith("/agency") || pathname.startsWith("/partner");
  const logout = (
    <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-black dark:border-[#2B3D6B] dark:text-white dark:hover:border-white">
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign Out
    </button>
  );
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const linkCls = (href: string) =>
    cn(
      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
      isActive(href) ? "bg-slate-100 text-black dark:bg-white/10 dark:text-white" : "text-slate-700 hover:text-black dark:text-[#FAFAFA] dark:hover:text-white",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-[#1F2F57] dark:bg-[#0B132B]/95">
      <div className="mx-auto flex min-h-10 max-w-[1500px] items-center justify-between gap-4 px-6 py-3.5 md:px-12">
        <div className="flex shrink-0 items-center"><BrandLogo /></div>

        <nav aria-label="Main" className="ml-8 hidden min-w-0 flex-1 items-center gap-2 min-[1120px]:flex min-[1120px]:ml-12 min-[1120px]:gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={linkCls(l.href)}>
              {t(l.label)}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 min-[1120px]:flex lg:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {!inPartnerArea && <Link href="/login?tab=agency" className={AGENCY_BADGE}><Building2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("Akshaya / Agency Login")}</Link>}
          <AuthControl />
          {user?.is_agency && logout}
          <Link href="/book" className={CTA}>{t("Book an ad")}</Link>
        </div>

        <div className="flex items-center gap-2 min-[1120px]:hidden">
          <AuthControl />
          <ThemeToggle />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-[#FFFFFF] dark:hover:bg-white/10"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("Close menu") : t("Open menu")}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="flex flex-col gap-1 border-t border-slate-200 px-6 py-4 min-[1120px]:hidden dark:border-[#1F2F57]">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={isActive(l.href) ? "page" : undefined} className={cn(linkCls(l.href), "py-2.5")}>
              {t(l.label)}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-2.5 dark:bg-[#17284F]">
            <span className="text-xs font-semibold text-slate-500">{t("Language")}</span>
            <LanguageSwitcher />
          </div>
          {!inPartnerArea && <Link href="/login?tab=agency" onClick={() => setOpen(false)} className={cn(AGENCY_BADGE, "mt-2 justify-center py-2.5")}><Building2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("Akshaya / Agency Login")}</Link>}
          {user?.is_agency && <div className="mt-2 [&>button]:w-full [&>button]:justify-center [&>button]:py-2.5">{logout}</div>}
          <Link href="/book" onClick={() => setOpen(false)} className={cn(CTA, "mt-3")}>
            {t("Book an ad")}
          </Link>
        </nav>
      )}
    </header>
  );
}

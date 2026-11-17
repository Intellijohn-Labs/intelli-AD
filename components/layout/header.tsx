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
  { href: "/book", label: "Book Ad" },
  { href: "/newspaper", label: "Rate Cards" },
  { href: "/account/bookings", label: "Track Booking" },
];

const CTA = "inline-flex items-center justify-center rounded-lg border border-[#18181B] bg-[#18181B] px-4 py-2 text-sm font-bold text-white shadow-[0_2px_0_#000] transition-colors hover:bg-[#27272A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] active:translate-y-px active:shadow-none";

const AGENCY_BADGE = "flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-bold text-[#9A3412] transition-colors hover:border-[#C2410C] dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/60";

/** Masthead-style header: wordmark, quiet nav with a terracotta rule under the active page, language switch, one ink CTA. */
export function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const navLinks = user?.is_admin ? [...links, { href: "/admin", label: "Admin" }] : links;
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
      "border-b-2 px-1 py-1.5 text-sm font-semibold transition-colors",
      isActive(href) ? "border-[#C2410C] text-[#18181B] dark:text-white" : "border-transparent text-stone-600 hover:text-[#18181B] dark:text-[#FAFAFA] dark:hover:text-white",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E5E4] bg-[#FAF8F5]/95 backdrop-blur-sm dark:border-[#1F2F57] dark:bg-[#0B132B]/95">
      <div className="mx-auto flex min-h-10 max-w-[1500px] items-center justify-between gap-4 px-6 py-3.5 md:px-12">
        <div className="flex shrink-0 items-center"><BrandLogo /></div>

        <nav aria-label="Main" className="ml-8 hidden min-w-0 flex-1 items-center gap-2 min-[1120px]:flex min-[1120px]:ml-12 min-[1120px]:gap-6">
          {navLinks.map((l) => (
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
          {navLinks.map((l) => (
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

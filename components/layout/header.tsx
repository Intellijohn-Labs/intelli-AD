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

const CTA = "inline-flex h-9 items-center justify-center rounded-xl bg-[#0F172A] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-px hover:bg-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]";

const AGENCY_BADGE = "flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-[#1F2F57] dark:bg-[#132247] dark:text-slate-200";

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
      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
      isActive(href) ? "bg-slate-100 text-[#0F172A] dark:bg-white/10 dark:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-[#0F172A] dark:text-[#FAFAFA] dark:hover:text-white",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-[#1F2F57] dark:bg-[#0B132B]/95">
      <div className="mx-auto grid h-16 max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex shrink-0 items-center"><BrandLogo /></div>

        <nav aria-label="Main" className="hidden min-w-0 items-center justify-center gap-1 min-[1120px]:flex">
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
          {pathname !== "/book" && <Link href="/book" className={CTA}>{t("Book an ad")}</Link>}
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

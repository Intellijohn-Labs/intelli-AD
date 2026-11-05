"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ButtonLink, buttonStyles } from "@/components/ui/button";
import { useI18n } from "@/context/language-context";
import { AuthControl } from "@/components/auth/user-menu";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/#publications", label: "Publications" },
  { href: "/categories", label: "Categories & templates" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLogo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-navy-50 hover:text-navy-800">
              {t(l.label)}
            </Link>
          ))}
          <LanguageSwitcher className="mx-2" />
          <ThemeToggle className="mr-2" />
          <AuthControl className="mr-2" />
          <ButtonLink href="/book" size="sm">{t("Book an ad")}</ButtonLink>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <AuthControl />
          <ThemeToggle />
          <button type="button" className="rounded-md p-2" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t("Close menu") : t("Open menu")} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="flex flex-col gap-1 border-t border-zinc-200 px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-navy-50">
              {t(l.label)}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
            <span className="text-xs font-bold tracking-wide text-zinc-600 uppercase">{t("Language")}</span>
            <LanguageSwitcher />
          </div>
          <Link href="/book" onClick={() => setOpen(false)} className={buttonStyles({ className: "mt-2" })}>
            {t("Book an ad")}
          </Link>
        </nav>
      )}
    </header>
  );
}

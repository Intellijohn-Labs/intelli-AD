"use client";

import { Info, Mail, Phone, ScrollText, ShieldCheck, Stamp, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/context/language-context";
import { bookHref } from "@/lib/booking-params";
import { usePublication } from "@/lib/publication";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";

const linkCls = "text-sm text-slate-400 transition-colors hover:text-white";
const headCls = "mb-4 text-sm font-semibold tracking-wider uppercase text-slate-200";

/** Clean, solid-slate footer: sharp top border, four-column grid, quiet bottom bar. */
export function Footer() {
  const { t } = useI18n();
  const { setActive } = usePublication();
  const year = new Date().getFullYear();

  const formats = [
    { label: "Classifieds", href: bookHref({ type: "classified-text" }) },
    { label: "Display", href: bookHref({ type: "classified-display" }) },
    { label: "Tenders", href: bookHref({ type: "classified-display", category: "tender" }) },
    { label: "Obituaries", href: bookHref({ type: "classified-display", category: "obituary" }) },
  ];
  const papers = [
    { id: "malayala-manorama", label: "Malayala Manorama" },
    { id: "mathrubhumi", label: "Mathrubhumi" },
    { id: "deshabhimani", label: "Deshabhimani" },
    { id: "madhyamam", label: "Madhyamam" },
  ];

  return (
    <footer className="mt-20 w-full border-t border-slate-800 bg-slate-950 pt-16 pb-12 text-slate-400">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
        {/* Brand */}
        <div>
          <BrandLogo onDark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-300">{t("Kerala's Premier Multi-Media Booking Network")}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Trust badges">
            {[{ icon: Stamp, label: "Verified RO" }, { icon: ShieldCheck, label: "Authorized Partner" }].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200">
                <Icon className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" /> {t(label)}
              </li>
            ))}
          </ul>
        </div>

        {/* Media formats */}
        <nav aria-label="Media formats">
          <p className={headCls}>{t("Media Formats")}</p>
          <ul className="space-y-2.5">
            {formats.map((f) => (
              <li key={f.label}><Link href={f.href} className={linkCls}>{t(f.label)}</Link></li>
            ))}
          </ul>
        </nav>

        {/* Publications */}
        <nav aria-label="Publications">
          <p className={headCls}>{t("Publications")}</p>
          <ul className="space-y-2.5">
            {papers.map((p) => (
              <li key={p.id}><Link href="/newspaper#rates" onClick={() => setActive(p.id)} className={linkCls}>{p.label}</Link></li>
            ))}
          </ul>
        </nav>

        {/* Company & support */}
        <div>
          <p className={headCls}>{t("Company & Support")}</p>
          <ul className="space-y-2.5">
            <li><a href="mailto:help@intelliad.example" className={cn(linkCls, "inline-flex items-center gap-2")}><Mail className="h-4 w-4 text-slate-500" aria-hidden="true" /> {t("Contact")}</a></li>
            {([["About", Info], ["Terms", ScrollText], ["Privacy", UserRoundCheck]] as const).map(([l, Icon]) => (
              <li key={l} title={t("Coming soon")} className="flex cursor-default items-center gap-2 text-sm text-slate-500"><Icon className="h-4 w-4" aria-hidden="true" /> {t(l)}</li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 text-sm text-slate-300">
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" aria-hidden="true" /> 1800-000-0000 (demo)</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" aria-hidden="true" /> <a href="mailto:help@intelliad.example" className="transition-colors hover:text-white">help@intelliad.example</a></p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-800 pt-6 text-center text-xs text-slate-500 md:flex-row md:text-left">
          <p>© {year} IntelliAd. {t("All rights reserved.")}</p>
          <p className="max-w-xl md:text-right">{t("Demo application. Rates are illustrative and payments are simulated. Publication names belong to their respective owners.")}</p>
        </div>
      </div>
    </footer>
  );
}

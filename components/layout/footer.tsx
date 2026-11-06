"use client";

import { Droplets, Mail, Phone, ShieldCheck, Stamp } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/context/language-context";
import { bookHref } from "@/lib/booking-params";
import { usePublication } from "@/lib/publication";
import { BrandLogo } from "./brand-logo";

/**
 * One drifting wave layer, pinned to the top of the footer. Each path fills the area ABOVE its curve,
 * so the page colour flows down into the ocean. The svg is wider than the viewport so the drift never
 * reveals an edge.
 */
function Wave({ className, d, style }: { className: string; d: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" className="wave-layer absolute top-0 left-0 block h-full w-[112%] max-w-none" style={style}>
      <path className={className} d={d} />
    </svg>
  );
}

const linkCls = "text-slate-300 transition-colors hover:text-cyan-300";
const headCls = "mb-3 text-sm font-bold tracking-tight text-white";

/** Ocean-tide footer: layered waves rising from the page, then a deep-water panel. */
export function Footer() {
  const { t } = useI18n();
  const { setActive } = usePublication();
  const year = new Date().getFullYear();

  const formats = [
    { label: "Classifieds", href: bookHref({ type: "classified-text" }) },
    { label: "Display", href: bookHref({ type: "classified-display" }) },
    { label: "Tenders", href: bookHref({ type: "classified-text", category: "tender" }) },
    { label: "Obituaries", href: bookHref({ type: "classified-text", category: "obituary" }) },
  ];
  const papers = [
    { id: "malayala-manorama", label: "Malayala Manorama" },
    { id: "mathrubhumi", label: "Mathrubhumi" },
    { id: "deshabhimani", label: "Deshabhimani" },
    { id: "madhyamam", label: "Madhyamam" },
  ];

  return (
    <footer className="relative mt-20 w-full overflow-hidden bg-[#081325] text-slate-300">
      {/* Depth: the water darkens towards the bottom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#040b17]" />
      {/* Caustic light, as if refracted through the surface */}
      <div aria-hidden="true" className="pointer-events-none absolute top-20 left-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 bottom-10 h-64 w-64 rounded-full bg-sky-500/10 blur-[100px]" />

      {/* Liquid crest: translucent water layers, then the page colour flowing down from above */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-16 w-full overflow-hidden leading-none sm:h-24 lg:h-28">
        <Wave className="fill-sky-400/20" style={{ animationDuration: "15s" }} d="M0,0 L1440,0 L1440,96 C1300,76 1160,72 1000,92 C840,112 700,116 540,94 C380,72 220,76 0,98 Z" />
        <Wave className="fill-blue-500/30" style={{ animationDuration: "11s", animationDirection: "alternate-reverse" }} d="M0,0 L1440,0 L1440,76 C1320,58 1180,56 1020,74 C860,92 700,96 540,76 C380,56 200,58 0,78 Z" />
        <Wave className="fill-[#F8FAFC] dark:fill-[#121316]" style={{ animationDuration: "8s" }} d="M0,0 L1440,0 L1440,54 C1320,40 1180,38 1020,52 C860,66 700,68 540,52 C380,36 200,40 0,56 Z" />
      </div>

      <div className="relative">
        <div className="relative mx-auto grid max-w-[1280px] gap-10 px-6 pt-10 pb-12 sm:grid-cols-2 md:px-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="inline-block drop-shadow-[0_0_16px_rgba(34,211,238,0.35)]">
              <BrandLogo onDark />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-300">{t("Kerala's Premier Multi-Media Booking Network")}</p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Trust badges">
              {[{ icon: Stamp, label: "Verified RO" }, { icon: ShieldCheck, label: "Authorized Partner" }].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {t(label)}
                </li>
              ))}
            </ul>
          </div>

          {/* Media formats */}
          <nav aria-label="Media formats" className="text-sm">
            <p className={headCls}>{t("Media Formats")}</p>
            <ul className="space-y-2">
              {formats.map((f) => (
                <li key={f.label}><Link href={f.href} className={linkCls}>{t(f.label)}</Link></li>
              ))}
            </ul>
          </nav>

          {/* Publications */}
          <nav aria-label="Publications" className="text-sm">
            <p className={headCls}>{t("Publications")}</p>
            <ul className="space-y-2">
              {papers.map((p) => (
                <li key={p.id}><Link href="/newspaper#rates" onClick={() => setActive(p.id)} className={linkCls}>{p.label}</Link></li>
              ))}
            </ul>
          </nav>

          {/* Company & support */}
          <div className="text-sm">
            <p className={headCls}>{t("Company & Support")}</p>
            <ul className="space-y-2">
              <li><a href="mailto:help@intelliad.example" className={linkCls}>{t("Contact")}</a></li>
              {["About", "Terms", "Privacy"].map((l) => (
                <li key={l} title={t("Coming soon")} className="cursor-default text-slate-500">{t(l)}</li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 text-slate-300">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-cyan-400" aria-hidden="true" /> 1800-000-0000 (demo)</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-400" aria-hidden="true" /> <a href="mailto:help@intelliad.example" className="text-cyan-400 hover:text-cyan-300">help@intelliad.example</a></p>
            </div>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="relative border-t border-cyan-900/30">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-6 py-5 text-xs text-slate-400 md:flex-row md:items-center md:justify-between md:px-12">
            <p className="flex items-center gap-2 font-semibold text-slate-300">
              <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden="true">
                <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/40 [animation-duration:3s]" />
                <Droplets className="relative h-3.5 w-3.5 text-cyan-400" />
              </span>
              © {year} IntelliAd. {t("All rights reserved.")}
            </p>
            <p className="max-w-xl md:text-right">{t("Demo application. Rates are illustrative and payments are simulated. Publication names belong to their respective owners.")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { ArrowRight, Calculator, ChevronDown, Clock, MapPin, Newspaper } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/context/language-context";
import { flagshipEdition } from "@/lib/pricing";
import { usePublication } from "@/lib/publication";
import { bookHref } from "@/lib/booking-params";
import { cn } from "@/lib/utils";
import type { AdType, CategoryId } from "@/lib/types";
import { ClassifiedDisplayArt, ClassifiedTextArt, CommercialArt, PremiumArt, RemembranceArt, TenderArt } from "./service-art";

interface Service {
  id: string;
  art: ReactNode;
  artBg: string;
  tag: string;
  tagTone: string;
  kicker: string;
  title: string;
  description: string;
  cta: string;
  type: AdType;
  category?: CategoryId;
}

const SERVICES: Service[] = [
  { id: "classified-text", art: <ClassifiedTextArt />, artBg: "bg-amber-50/70 border-amber-100/80 dark:bg-amber-950/20 dark:border-amber-900/30", tag: "Cost-Effective", tagTone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200", kicker: "അക്ഷര പരസ്യങ്ങൾ", title: "Classified Text Ads", description: "Matrimonial, Property, Job alerts, Rental notices billed per line.", cta: "Book Now", type: "classified-text" },
  { id: "classified-display", art: <ClassifiedDisplayArt />, artBg: "bg-blue-50/70 border-blue-100/80 dark:bg-blue-950/20 dark:border-blue-900/30", tag: "High Visibility", tagTone: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200", kicker: "ബോക്സ് പരസ്യങ്ങൾ", title: "Classified Display", description: "Boxed obituary, recruitment notices, and business cards billed per sq.cm.", cta: "Book Now", type: "classified-display" },
  { id: "tender", art: <TenderArt />, artBg: "bg-slate-100/80 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/50", tag: "Official & Legal", tagTone: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200", kicker: "ദർഘാസ് & പൊതു അറിയിപ്പുകൾ", title: "Tender / Public Notices", description: "PWD, Panchayat, Bank, Court notices, and Gazette format ads.", cta: "Book Now", type: "classified-text", category: "tender" },
  { id: "remembrance", art: <RemembranceArt />, artBg: "bg-stone-100/80 border-stone-200 dark:bg-stone-800/30 dark:border-stone-700/50", tag: "Tribute", tagTone: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-200", kicker: "ചരമവാർഷികം & സ്മരണാഞ്ജലി", title: "Obituary & Remembrance", description: "Demise announcements and annual memorial tributes with photo frames.", cta: "Book Now", type: "classified-text", category: "obituary" },
  { id: "premium", art: <PremiumArt />, artBg: "bg-rose-50/70 border-rose-100/80 dark:bg-rose-950/20 dark:border-rose-900/30", tag: "Maximum Reach", tagTone: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200", kicker: "മുൻപേജ് പരസ്യങ്ങൾ", title: "Premium Display & Jackets", description: "Front page solus, ear panels, half page, and full broadsheet jackets.", cta: "Enquire / Book", type: "commercial-display" },
  { id: "commercial", art: <CommercialArt />, artBg: "bg-rose-50/70 border-rose-100/80 dark:bg-rose-950/20 dark:border-rose-900/30", tag: "Brand Building", tagTone: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200", kicker: "വാണിജ്യ പരസ്യങ്ങൾ", title: "Commercial Display", description: "Showroom launches, retail discounts, and festival offers across regional editions.", cta: "Book Now", type: "commercial-display", category: "business" },
];

const STATS = [
  { icon: Newspaper, value: "10+", label: "Leading Dailies", note: "Manorama, Mathrubhumi, Deshabhimani, Madhyamam…" },
  { icon: MapPin, value: "14", label: "District Editions", note: "All Kerala regional pulls" },
  { icon: Calculator, value: "Instant", label: "Rate Engine", note: "Transparent official tariff calculations" },
  { icon: Clock, value: "Same-Day", label: "Cutoff Support", note: "Guaranteed next-morning publishing" },
];

/** Flash the publication bar and focus the chosen paper, so "Booking in: …" doubles as a shortcut to the switcher. */
function showPublicationBar() {
  const bar = document.getElementById("publication-bar");
  if (!bar) return;
  bar.scrollIntoView({ block: "nearest" });
  bar.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bar.animate(
      [{ boxShadow: "0 0 0 0 rgba(225,29,72,0)" }, { boxShadow: "0 0 0 4px rgba(225,29,72,0.45)" }, { boxShadow: "0 0 0 0 rgba(225,29,72,0)" }],
      { duration: 1000, easing: "ease-out" },
    );
  }
}

export function ServicesHub() {
  const { t, tl, pn } = useI18n();
  const { paper } = usePublication(); // chosen in the publication chips above
  const eds = [flagshipEdition(paper).id];
  return (
    <section aria-labelledby="services-h" className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="mb-4 inline-block rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] tracking-widest text-slate-700 uppercase dark:bg-[#202125] dark:text-[#d6d7db]">{t("Newspaper advertising services")}</p>
        <h2 id="services-h" className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight text-slate-900 md:text-5xl dark:text-white">{t("Newspaper Advertising Hub")}</h2>
        <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-[#e6e6e9]">{tl("Choose Your Newspaper Advertising Format", "ഏത് തരം പത്രപരസ്യമാണ് നൽകേണ്ടത്?")}</p>
        <p className="mt-2 text-sm text-slate-600 md:text-base dark:text-[#bdbec4]">{t("Book classifieds, display notices, tenders, and remembrances directly across Kerala's leading dailies.")}</p>
        <button
          type="button"
          onClick={showPublicationBar}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 shadow-2xs transition-colors hover:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-[#2a2b30] dark:bg-[#1a1b1f] dark:text-[#e6e6e9] dark:hover:border-[#eaeaea]"
        >
          <Newspaper className="h-4 w-4 text-[#E11D48]" aria-hidden="true" />
          <span>{t("Booking in")}: <strong className="font-bold">{pn(paper)}</strong></span>
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, i) => {
          const primary = i === 0; // Classified Text is the most popular format
          return (
            <li
              key={s.id}
              className="group flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.08)] dark:border-[#2a2b30]"
            >
              <div>
                <span className={cn("inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-widest uppercase", s.tagTone)}>{t(s.tag)}</span>

                <div aria-hidden="true" className={cn("relative mt-3 flex h-44 items-center justify-center overflow-hidden rounded-2xl border p-4", s.artBg)}>
                  <div className="relative flex h-full w-full items-center justify-center transition-transform duration-200 group-hover:scale-105">{s.art}</div>
                </div>

                <p className="mt-4 text-sm leading-relaxed font-medium text-slate-500 dark:text-[#9a9ba2]" style={{ fontFamily: '"Noto Sans Malayalam", Manjari, sans-serif' }}>{s.kicker}</p>
                <h3 className="font-[family-name:var(--font-jakarta)] text-xl leading-snug font-extrabold text-slate-900 dark:text-[#f1f1f3]">{t(s.title)}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-[#9a9ba2]">{t(s.description)}</p>
              </div>

              <Link
                href={bookHref({ type: s.type, category: s.category, paper: paper.id, eds })}
                className={cn(
                  "mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 active:scale-[0.98]",
                  primary
                    ? "bg-slate-900 text-white hover:bg-black dark:bg-[#eaeaea] dark:text-slate-900 dark:hover:bg-white"
                    : "border border-slate-200 text-slate-800 hover:border-slate-900 dark:border-[#3a3b41] dark:text-[#e6e6e9] dark:hover:border-[#eaeaea]",
                )}
              >
                {primary ? t("Select Format") : t(s.cta)}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Platform highlights">
        {STATS.map(({ icon: Icon, value, label, note }) => (
          <li key={label} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:border-[#2a2b30]">
            <Icon className="mt-1 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-mono text-xl leading-tight font-bold tracking-tight text-slate-900 dark:text-[#f1f1f3]">{value}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-[#e6e6e9]">{t(label)}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9a9ba2]">{t(note)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

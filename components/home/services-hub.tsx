"use client";

import { ArrowRight, Calculator, ChevronDown, Clock, MapPin, Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/context/language-context";
import { flagshipEdition } from "@/lib/pricing";
import { usePublication } from "@/lib/publication";
import { bookHref } from "@/lib/booking-params";
import { cn } from "@/lib/utils";
import type { AdType, CategoryId } from "@/lib/types";

interface Service {
  id: string;
  /** 3D card artwork in public/images/cards. */
  image: { src: string; alt: string };
  /** Physical hover motion for the artwork (literal classes so Tailwind can see them). */
  motion: string;
  /** Focal point of the close-up crop. */
  focus: string;
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
  { id: "classified-text", image: { src: "/images/cards/classified-text.png", alt: "Classified Text Ads" }, motion: "motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-1 motion-safe:group-hover:-translate-y-1 transition-transform duration-500", focus: "50% 45%", artBg: "from-yellow-100 via-amber-50 to-white dark:from-yellow-500/20 dark:via-amber-500/10 dark:to-transparent", tag: "Cost-Effective", tagTone: "bg-amber-500 text-white", kicker: "അക്ഷര പരസ്യങ്ങൾ", title: "Classified Text Ads", description: "Matrimonial, Property, Job alerts, Rental notices billed per line.", cta: "Book Now", type: "classified-text" },
  { id: "classified-display", image: { src: "/images/cards/classified-display.png", alt: "Classified Display" }, motion: "motion-safe:group-hover:scale-108 motion-safe:group-hover:-translate-y-1.5 transition-transform duration-500", focus: "50% 50%", artBg: "from-sky-100 via-blue-50 to-white dark:from-sky-500/20 dark:via-blue-500/10 dark:to-transparent", tag: "High Visibility", tagTone: "bg-blue-600 text-white", kicker: "ബോക്സ് പരസ്യങ്ങൾ", title: "Classified Display", description: "Boxed obituary, recruitment notices, and business cards billed per sq.cm.", cta: "Book Now", type: "classified-display" },
  { id: "tender", image: { src: "/images/cards/tender-notice.png", alt: "Tender Notices" }, motion: "motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-[1deg] motion-safe:group-hover:-translate-y-1 transition-transform duration-500", focus: "50% 45%", artBg: "from-slate-200 via-slate-100 to-white dark:from-slate-400/20 dark:via-slate-400/10 dark:to-transparent", tag: "Official & Legal", tagTone: "bg-slate-700 text-white", kicker: "ദർഘാസ് & പൊതു അറിയിപ്പുകൾ", title: "Tender / Public Notices", description: "PWD, Panchayat, Bank, Court notices as simple line ads or boxed display ads.", cta: "Book Now", type: "classified-display", category: "tender" },
  { id: "remembrance", image: { src: "/images/cards/obituary.png", alt: "Obituary & Remembrance" }, motion: "motion-safe:group-hover:scale-108 motion-safe:group-hover:-translate-y-1 transition-all duration-700", focus: "50% 40%", artBg: "from-indigo-200 via-violet-100 to-indigo-50 dark:from-indigo-500/30 dark:via-violet-500/15 dark:to-transparent", tag: "Tribute", tagTone: "bg-stone-600 text-white", kicker: "ചരമവാർഷികം & സ്മരണാഞ്ജലി", title: "Obituary & Remembrance", description: "Demise notices and memorials as simple line ads or photo-frame display ads.", cta: "Book Now", type: "classified-display", category: "obituary" },
  { id: "premium", image: { src: "/images/cards/jackets.png", alt: "Premium Display & Jackets" }, motion: "motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-1 transition-transform duration-500", focus: "45% 50%", artBg: "from-orange-100 via-amber-50 to-white dark:from-orange-500/20 dark:via-rose-500/10 dark:to-transparent", tag: "Maximum Reach", tagTone: "bg-rose-600 text-white", kicker: "മുൻപേജ് പരസ്യങ്ങൾ", title: "Premium Display & Jackets", description: "Front page solus, ear panels, half page, and full broadsheet jackets.", cta: "Enquire / Book", type: "commercial-display" },
  { id: "commercial", image: { src: "/images/cards/commercial-display.png", alt: "Commercial Display" }, motion: "motion-safe:group-hover:scale-112 motion-safe:group-hover:-rotate-2 motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:animate-[card-wiggle_0.7s_ease-in-out_1] transition-transform duration-300 ease-out", focus: "50% 50%", artBg: "from-fuchsia-100 via-pink-50 to-white dark:from-fuchsia-500/20 dark:via-pink-500/10 dark:to-transparent", tag: "Brand Building", tagTone: "bg-fuchsia-600 text-white", kicker: "വാണിജ്യ പരസ്യങ്ങൾ", title: "Commercial Display", description: "Showroom launches, retail discounts, and festival offers across regional editions.", cta: "Book Now", type: "commercial-display", category: "business" },
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
        <p className="mb-4 inline-block rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] tracking-widest text-slate-700 uppercase dark:bg-[#17284F] dark:text-[#FFFFFF]">{t("Newspaper advertising services")}</p>
        <h2 id="services-h" className="font-[family-name:var(--font-syne)] text-3xl font-black tracking-tight text-slate-900 md:text-5xl dark:text-white">{t("Newspaper Advertising Hub")}</h2>
        <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-[#FFFFFF]">{tl("Choose Your Newspaper Advertising Format", "ഏത് തരം പത്രപരസ്യമാണ് നൽകേണ്ടത്?")}</p>
        <p className="mt-2 text-sm text-slate-600 md:text-base dark:text-[#FAFAFA]">{t("Book classifieds, display notices, tenders, and remembrances directly across Kerala's leading dailies.")}</p>
        <button
          type="button"
          onClick={showPublicationBar}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 shadow-2xs transition-colors hover:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-[#1F2F57] dark:bg-[#132247] dark:text-[#FFFFFF] dark:hover:border-[#FFFFFF]"
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
              className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]"
            >
              <div>
                <span className={cn("inline-block rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase", s.tagTone)}>{t(s.tag)}</span>

                {/* Soft-gradient paper canvas with an inner hairline */}
                {/* Tinted canvas: close-up 3D artwork that fades into a soft shadow at the edges */}
                <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all duration-500 ease-out group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900/40 dark:group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)]">
                  <div aria-hidden="true" className={cn("absolute inset-0 bg-gradient-to-br", s.artBg)} />
                  <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl">
                    <div aria-hidden="true" className="absolute inset-x-10 bottom-1 h-5 rounded-full bg-black/15 blur-xl dark:bg-black/40" />
                    <div className={cn("relative h-full w-full will-change-transform", s.motion)}>
                      <Image
                        src={s.image.src}
                        alt={s.image.alt}
                        fill
                        priority={i < 3}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectPosition: s.focus }}
                        className="scale-[1.12] -translate-y-1 object-cover saturate-110 contrast-105 transition-transform duration-500 ease-out [mask-image:radial-gradient(ellipse_at_center,#000_62%,transparent_100%)] dark:brightness-110 group-hover:scale-[1.2]"
                      />
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed font-medium text-slate-900 dark:text-white" style={{ fontFamily: '"Noto Sans Malayalam", Manjari, sans-serif' }}>{s.kicker}</p>
                <h3 className="font-[family-name:var(--font-syne)] text-xl leading-snug font-black tracking-tight text-slate-900 dark:text-white">{t(s.title)}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-white/90">{t(s.description)}</p>
              </div>

              <Link
                href={bookHref({ type: s.type, category: s.category, paper: paper.id, eds })}
                className={cn(
                  "mt-5 flex items-center justify-between rounded-xl px-5 py-3 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 active:scale-[0.98]",
                  primary
                    ? "bg-slate-950 text-white shadow-sm hover:bg-black dark:bg-white dark:text-slate-950"
                    : "border border-slate-300 text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-700 dark:text-slate-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900",
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
          <li key={label} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:border-[#1F2F57]">
            <Icon className="mt-1 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-mono text-xl leading-tight font-bold tracking-tight text-slate-900 dark:text-[#FFFFFF]">{value}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-[#FFFFFF]">{t(label)}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#E2E8F0]">{t(note)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

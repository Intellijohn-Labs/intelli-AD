"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bus, Clapperboard, Mail, Megaphone, Newspaper, Radio, Tv, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { CinemaArt, DigitalArt, NewspaperArt, OutdoorArt, RadioArt, TvArt } from "./media-art";

/*
 * Home screen, BookMyAd-style: bright slate canvas, solid white cards, deep black headlines and
 * actions, with red (#E11D48) reserved for the live badge.
 */
type MediaId = "newspaper" | "digital" | "radio" | "cinema" | "tv" | "outdoor";

interface Media {
  id: MediaId;
  icon: LucideIcon;
  art: ReactNode;
  title: string;
  ml: string;
  description: string;
  /** Pastel tint behind the illustration. */
  frame: string;
}

const MEDIA: Media[] = [
  { id: "newspaper", icon: Newspaper, art: <NewspaperArt />, title: "Newspaper Advertising", ml: "പത്രപ്പരസ്യങ്ങൾ", description: "Classifieds, display, tender, obituary and jacket ads in Kerala's leading dailies.", frame: "bg-emerald-50 dark:bg-white/5" },
  { id: "digital", icon: Megaphone, art: <DigitalArt />, title: "Digital Marketing", ml: "ഡിജിറ്റൽ പരസ്യങ്ങൾ", description: "Search, social and display campaigns that reach customers online.", frame: "bg-sky-50 dark:bg-white/5" },
  { id: "radio", icon: Radio, art: <RadioArt />, title: "Radio Advertising", ml: "റേഡിയോ പരസ്യങ്ങൾ", description: "FM spots and sponsorships across Kerala's popular stations.", frame: "bg-amber-50 dark:bg-white/5" },
  { id: "cinema", icon: Clapperboard, art: <CinemaArt />, title: "Cinema Advertising", ml: "തിയേറ്റർ പരസ്യങ്ങൾ", description: "On-screen slides and trailers before the film starts.", frame: "bg-rose-50 dark:bg-white/5" },
  { id: "tv", icon: Tv, art: <TvArt />, title: "Television / Cable Ads", ml: "ടെലിവിഷൻ പരസ്യങ്ങൾ", description: "Channel spots and local cable network promotions.", frame: "bg-violet-50 dark:bg-white/5" },
  { id: "outdoor", icon: Bus, art: <OutdoorArt />, title: "Outdoor & Transit Media", ml: "ഹോർഡിംഗ് & ബസ് പരസ്യങ്ങൾ", description: "Hoardings, bus panels and street-level branding.", frame: "bg-lime-50 dark:bg-white/5" },
];

const SANS = "font-[family-name:var(--font-jakarta)]";
const ML_SANS = { fontFamily: '"Noto Sans Malayalam", Manjari, sans-serif' };

/** Polite "not available yet" dialog for the media we don't sell online. */
function ComingSoon({ media, onClose }: { media: Media; onClose: () => void }) {
  const { t, tl } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const Icon = media.icon;
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby="soon-title"
        className="relative w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-xl dark:border-[#2a2b30]"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <button type="button" onClick={onClose} aria-label={t("Close")} className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white"><Icon className="h-6 w-6" aria-hidden="true" /></span>
        <h3 id="soon-title" className={cn(SANS, "mt-3 text-xl font-bold text-slate-900 dark:text-[#f1f1f3]")}>{tl(media.title, media.ml)}</h3>
        <p className="mx-auto mt-2 w-fit rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-500 dark:bg-[#202125]">{t("Coming soon")}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-[#bdbec4]">{t("We're building online booking for this media. Meanwhile our team can plan and book it for you.")}</p>
        <a href={`mailto:help@intelliad.example?subject=${encodeURIComponent(`${media.title} enquiry`)}`} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black">
          <Mail className="h-4 w-4" aria-hidden="true" /> {t("Contact Support")}
        </a>
      </motion.div>
    </motion.div>
  );
}

/**
 * Home-page media picker: "What media are you looking for?". Newspaper Advertising opens its own
 * portal at /newspaper; the other media show a Coming Soon dialog.
 */
export function MediaHub() {
  const { t, tl } = useI18n();
  const [soon, setSoon] = useState<Media | null>(null);

  return (
    <section aria-labelledby="media-h" className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2 id="media-h" className={cn(SANS, "text-3xl font-bold tracking-tight text-slate-900 md:text-5xl dark:text-[#f1f1f3]")}>
          {tl("What media are you looking for?", "ഏത് മാധ്യമത്തിലാണ് പരസ്യം നൽകേണ്ടത്?")}
        </h2>
        <p className="mt-4 text-sm text-slate-600 md:text-base dark:text-[#bdbec4]">{t("The right place for your business: Book online across leading advertising options.")}</p>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MEDIA.map((m, i) => {
          const live = m.id === "newspaper";
          return (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
              className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg dark:border-[#2a2b30]"
            >
              {/* Pastel frame hosting the illustration */}
              <div aria-hidden="true" className={cn("relative flex h-44 items-center justify-center rounded-xl p-5", m.frame)}>
                <div className="h-full w-full transition-transform duration-200 ease-out group-hover:scale-105">{m.art}</div>
                {live ? (
                  <span className="absolute top-3 left-3 rounded-full bg-[#E11D48] px-2.5 py-0.5 text-xs font-semibold text-white">{t("Book online")}</span>
                ) : (
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-[#1a1b1f]/90">{t("Coming soon")}</span>
                )}
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <h3 className={cn(SANS, "text-xl leading-snug font-bold text-slate-900 dark:text-[#f1f1f3]")}>{t(m.title)}</h3>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-[#9a9ba2]" style={ML_SANS}>{m.ml}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-[#bdbec4]">{t(m.description)}</p>

                {live ? (
                  <Link
                    href="/newspaper"
                    className="mt-5 flex items-center justify-between rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {t("Explore")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSoon(m)}
                    className="mt-5 flex items-center justify-between rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 active:scale-[0.98] dark:border-[#3a3b41] dark:text-[#d6d7db] dark:hover:border-[#eaeaea] dark:hover:text-white"
                  >
                    {t("Contact Support")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>{soon && <ComingSoon key={soon.id} media={soon} onClose={() => setSoon(null)} />}</AnimatePresence>
    </section>
  );
}

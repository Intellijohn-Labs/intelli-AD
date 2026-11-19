"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bus, Clapperboard, Heart, Mail, Megaphone, Newspaper, Radio, Tv, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { CinemaArt, DigitalArt, NewspaperArt, OutdoorArt, RadioArt, TvArt, WeddingArt } from "./media-art";

/*
 * Home screen, BookMyAd-style: bright slate canvas, solid white cards, deep black headlines and
 * actions, with red (#E11D48) reserved for the live badge.
 */
type MediaId = "newspaper" | "wedding" | "digital" | "radio" | "cinema" | "tv" | "outdoor";

interface Media {
  id: MediaId;
  icon: LucideIcon;
  art: ReactNode;
  title: string;
  ml: string;
  description: string;
  /** Saturated gradient canvas behind the illustration. */
  frame: string;
  /** This card's brand glow, used by the hover shadow. */
  glow: string;
}

const MEDIA: Media[] = [
  { id: "newspaper", icon: Newspaper, art: <NewspaperArt />, title: "Newspaper Advertising", ml: "പത്രപ്പരസ്യങ്ങൾ", description: "Classifieds, display, tender, obituary and jacket ads in Kerala's leading dailies.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(24,24,27,0.18)" },
  { id: "wedding", icon: Heart, art: <WeddingArt />, title: "Invitation Cards", ml: "ക്ഷണക്കത്തുകൾ", description: "Wedding, birthday, housewarming & baby-ceremony cards with 30+ luxury templates, animated GIFs & personalised WhatsApp sharing.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(209,32,20,0.22)" },
  { id: "digital", icon: Megaphone, art: <DigitalArt />, title: "Digital Marketing", ml: "ഡിജിറ്റൽ പരസ്യങ്ങൾ", description: "Search, social and display campaigns that reach customers online.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(24,24,27,0.18)" },
  { id: "radio", icon: Radio, art: <RadioArt />, title: "Radio Advertising", ml: "റേഡിയോ പരസ്യങ്ങൾ", description: "FM spots and sponsorships across Kerala's popular stations.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(24,24,27,0.18)" },
  { id: "cinema", icon: Clapperboard, art: <CinemaArt />, title: "Cinema Advertising", ml: "തിയേറ്റർ പരസ്യങ്ങൾ", description: "On-screen slides and trailers before the film starts.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(24,24,27,0.18)" },
  { id: "tv", icon: Tv, art: <TvArt />, title: "Television / Cable Ads", ml: "ടെലിവിഷൻ പരസ്യങ്ങൾ", description: "Channel spots and local cable network promotions.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(24,24,27,0.18)" },
  { id: "outdoor", icon: Bus, art: <OutdoorArt />, title: "Outdoor & Transit Media", ml: "ഹോർഡിംഗ് & ബസ് പരസ്യങ്ങൾ", description: "Hoardings, bus panels and street-level branding.", frame: "bg-[#F1F5F9] border border-[#E2E8F0]", glow: "rgba(24,24,27,0.18)" },
];

const SANS = "font-[family-name:var(--font-jakarta)]";
const DISPLAY = "font-[family-name:var(--font-jakarta)]";
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
        className="relative w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-xl dark:border-[#26272B]"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <button type="button" onClick={onClose} aria-label={t("Close")} className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white"><Icon className="h-6 w-6" aria-hidden="true" /></span>
        <h3 id="soon-title" className={cn(SANS, "mt-3 text-xl font-bold text-slate-900 dark:text-[#FFFFFF]")}>{tl(media.title, media.ml)}</h3>
        <p className="mx-auto mt-2 w-fit rounded-full border border-transparent bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-500 dark:border-white/40 dark:bg-transparent dark:text-white">{t("Coming soon")}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-[#FAFAFA]">{t("We're building online booking for this media. Meanwhile our team can plan and book it for you.")}</p>
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
  const { t, tl, lang } = useI18n();
  const [soon, setSoon] = useState<Media | null>(null);

  return (
    <section aria-labelledby="media-h" className="mx-auto max-w-[1500px] px-4 pt-10 pb-6 sm:px-6 sm:pt-14 sm:pb-8 lg:px-8">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <p className="kicker mb-3">{t("Beyond the printed page")}</p>
        <h2 id="media-h" className={cn(DISPLAY, "text-3xl leading-[1.05] font-black tracking-tight text-slate-900 md:text-5xl dark:text-white")}>
          {lang === "en" ? (
            <>
              What <span className="text-[#D12014]">media</span> are you looking for?
            </>
          ) : (
            tl("What media are you looking for?", "ഏത് മാധ്യമത്തിലാണ് പരസ്യം നൽകേണ്ടത്?")
          )}
        </h2>
        <p className="mt-4 text-sm text-slate-600 md:text-base dark:text-[#FAFAFA]">{t("The right place for your business: Book online across leading advertising options.")}</p>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MEDIA.map((m, i) => {
          const live = m.id === "newspaper" || m.id === "wedding";
          const href = m.id === "wedding" ? "/invitation-cards" : "/newspaper";
          return (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
              style={{ "--glow": m.glow } as CSSProperties}
              className="group flex h-full flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_0_rgba(24,24,27,.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_35px_-10px_var(--glow)] dark:border-[#26272B]"
            >
              <div>
                {/* Saturated gradient canvas hosting the illustration */}
                <div aria-hidden="true" className={cn("relative flex h-40 items-center justify-center rounded-2xl p-5", m.frame)}>
                  <div className="h-full w-full transition-transform duration-200 ease-out group-hover:scale-105">{m.art}</div>
                  {live ? (
                    <span className="absolute top-3 left-3 rounded-full bg-[#059669] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">{m.id === "wedding" ? t("Create Online") : t("Book online")}</span>
                  ) : (
                    <span className="absolute top-3 left-3 rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-slate-600 backdrop-blur-md dark:border-white/40 dark:bg-[#131416]/90 dark:text-white">{t("Coming soon")}</span>
                  )}
                </div>

                <h3 className={cn(SANS, "mt-4 text-xl leading-snug font-extrabold text-slate-900 dark:text-[#FFFFFF]")}>{t(m.title)}</h3>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-[#E2E8F0]" style={ML_SANS}>{m.ml}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-[#FAFAFA]">{t(m.description)}</p>
              </div>

              {live ? (
                <Link
                  href={href}
                  className="mt-5 flex items-center justify-between rounded-lg bg-[#0A0B0D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#17181C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D12014] active:scale-[0.98] dark:bg-[#FFFFFF] dark:text-slate-950 dark:hover:bg-[#D12014] dark:hover:text-white"
                >
                  {t("Explore")}
                  <ArrowRight className="h-4 w-4 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E83E32] dark:group-hover:text-white" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setSoon(m)}
                  className="mt-5 flex items-center justify-between rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-900 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 active:scale-[0.98] dark:border-[#35363B] dark:text-[#FFFFFF] dark:hover:border-[#FFFFFF] dark:hover:text-white"
                >
                  {t("Contact Support")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </button>
              )}
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>{soon && <ComingSoon key={soon.id} media={soon} onClose={() => setSoon(null)} />}</AnimatePresence>
    </section>
  );
}

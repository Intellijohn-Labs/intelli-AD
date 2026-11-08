"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgePercent, Calculator, Clock, ShieldCheck, Sparkles, Stamp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AD_TYPES } from "@/data/categories";
import { useI18n } from "@/context/language-context";
import type { AdType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdTicker } from "./ad-ticker";
import { QuickBookingWidget } from "./quick-booking-widget";

const badges = [
  { icon: ShieldCheck, label: "Authorized Partner", tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200" },
  { icon: Clock, label: "Next-Day Print Cut-off", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200" },
  { icon: BadgePercent, label: "Save up to 20% on Multi-Edition", tone: "border-emerald-200 bg-emerald-50 font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200" },
  { icon: Stamp, label: "Verified RO", tone: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-500/15 dark:text-purple-200" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } } };

/** Newspaper portal hero: editorial pitch on the left, the quick booking calculator on the right. */
export function Hero() {
  const { t } = useI18n();
  // The format tabs live in the pitch column but drive the calculator beside it.
  const [adType, setAdType] = useState<AdType>("classified-text");

  // "Kerala" gets the brand gradient; other languages fall back to a plain headline.
  const headline = t("Book Newspaper Ads Across Kerala in 4 Simple Steps");
  const [before, after] = headline.split("Kerala");

  return (
    <div className="relative isolate overflow-hidden bg-[#F9FBFE] dark:bg-transparent">
      {/* ambient mesh glow: blue top-left, rose behind the calculator */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 dark:opacity-60" style={{ backgroundImage: "radial-gradient(ellipse 600px 400px at 15% 15%, rgba(37, 99, 235, 0.08), transparent 70%), radial-gradient(ellipse 500px 450px at 85% 20%, rgba(244, 63, 94, 0.07), transparent 70%)" }} />
    <motion.section variants={container} initial="hidden" animate="show" className="mx-auto grid max-w-[1280px] items-start gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-8">
      <div className="min-w-0">
        <motion.p variants={item} className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wider text-blue-700 uppercase shadow-sm shadow-blue-500/10 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" aria-hidden="true" /> {t("Advertising made simple")}
        </motion.p>
        <motion.h1 variants={item} className="mt-5 font-[family-name:var(--font-syne)] text-4xl leading-[1.04] font-black tracking-tight text-slate-900 md:text-5xl dark:text-[#FFFFFF]">
          {after === undefined ? headline : <>{before}<span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 bg-clip-text text-transparent dark:from-sky-300 dark:via-indigo-300 dark:to-rose-300">Kerala</span>{after}</>}
        </motion.h1>
        <motion.p variants={item} className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg dark:text-[#FAFAFA]">
          {t("Book Classified & Display ads in leading newspapers including Malayala Manorama and Mathrubhumi at the lowest rates.")}
        </motion.p>

        {/* Format tabs: one segmented control */}
        <motion.div variants={item} role="radiogroup" aria-label="Ad format" className="mt-6 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-slate-200/60 bg-slate-100/80 p-1 dark:border-[#1F2F57] dark:bg-[#132247]">
          {AD_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={adType === a.id}
              onClick={() => setAdType(a.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-500",
                adType === a.id ? "bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-md shadow-blue-500/25" : "text-slate-700 hover:bg-slate-200/70 dark:text-[#FAFAFA] dark:hover:bg-white/10",
              )}
            >
              {t(a.short)}
            </button>
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-6 flex flex-wrap gap-3">
          <Link href="/newspaper#rates" className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            <Calculator className="h-4 w-4" aria-hidden="true" /> {t("Check Live Rates")}
          </Link>
          <Link href="/book" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3.5 font-semibold text-white shadow-md shadow-rose-500/25 transition-colors hover:from-rose-500 hover:to-pink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500">
            {t("Book Advertisement")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Trust badges">
          {badges.map(({ icon: Icon, label, tone }) => (
            <motion.li key={label} variants={item} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold", tone)}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {t(label)}
            </motion.li>
          ))}
        </ul>

        <motion.div variants={item} className="mt-8 block w-full max-w-full">
          <AdTicker />
        </motion.div>
      </div>

      <motion.div variants={item}>
        <QuickBookingWidget adType={adType} />
      </motion.div>
    </motion.section>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { BadgePercent, Clock, ShieldCheck, Stamp } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { AD_TYPES } from "@/data/categories";
import { useI18n } from "@/context/language-context";
import type { AdType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdTicker } from "./ad-ticker";
import { QuickBookingWidget } from "./quick-booking-widget";

const badges = [
  { icon: ShieldCheck, label: "Authorized Partner" },
  { icon: Clock, label: "Next-Day Print Cut-off" },
  { icon: BadgePercent, label: "Save up to 20% on Multi-Edition" },
  { icon: Stamp, label: "Verified RO" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } } };

/** Newspaper portal hero: editorial pitch on the left, the quick booking calculator on the right. */
export function Hero() {
  const { t } = useI18n();
  // The format tabs live in the pitch column but drive the calculator beside it.
  const [adType, setAdType] = useState<AdType>("classified-text");

  return (
    <motion.section variants={container} initial="hidden" animate="show" className="mx-auto grid max-w-[1280px] items-start gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-8">
      <div className="min-w-0">
        <motion.p variants={item} className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-1 font-mono text-xs font-bold tracking-[0.2em] text-slate-700 uppercase shadow-2xs dark:border-[#2a2b30] dark:bg-[#1a1b1f] dark:text-[#d6d7db]">
          {t("Advertising made simple")}
        </motion.p>
        <motion.h1 variants={item} className="mt-5 font-[family-name:var(--font-syne)] text-4xl leading-[1.04] font-black tracking-tight text-slate-900 md:text-5xl dark:text-[#f1f1f3]">
          {t("Book Newspaper Ads Across Kerala in 4 Simple Steps")}
        </motion.h1>
        <motion.p variants={item} className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg dark:text-[#bdbec4]">
          {t("Book Classified & Display ads in leading newspapers including Malayala Manorama and Mathrubhumi at the lowest rates.")}
        </motion.p>

        {/* Format tabs: one segmented control */}
        <motion.div variants={item} role="radiogroup" aria-label="Ad format" className="mt-6 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-2xs dark:border-[#2a2b30] dark:bg-[#1a1b1f]">
          {AD_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={adType === a.id}
              onClick={() => setAdType(a.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-500",
                adType === a.id ? "bg-slate-900 text-white shadow-sm dark:bg-[#eaeaea] dark:text-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-[#bdbec4] dark:hover:text-white",
              )}
            >
              {t(a.short)}
            </button>
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/newspaper#rates" size="lg" className="rounded-xl">{t("Check Live Rates")}</ButtonLink>
          <ButtonLink href="/book" size="lg" variant="secondary" className="rounded-xl">{t("Book Advertisement")}</ButtonLink>
        </motion.div>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Trust badges">
          {badges.map(({ icon: Icon, label }) => (
            <motion.li key={label} variants={item} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs dark:border-[#2a2b30] dark:bg-[#1a1b1f] dark:text-[#d6d7db]">
              <Icon className="h-3.5 w-3.5 text-[#E11D48]" aria-hidden="true" /> {t(label)}
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
  );
}

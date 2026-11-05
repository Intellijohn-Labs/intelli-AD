"use client";

import { motion } from "framer-motion";
import { BadgePercent, Clock, ShieldCheck, Stamp } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/context/language-context";
import { AdTicker } from "./ad-ticker";
import { QuickBookingWidget } from "./quick-booking-widget";

const badges = [
  { icon: ShieldCheck, label: "Authorized Partner", tone: "bg-navy-50 text-navy-800 border-navy-200 shadow-[0_0_18px_color-mix(in_srgb,var(--brand)_28%,transparent)]" },
  { icon: Clock, label: "Next-Day Print Cut-off", tone: "bg-amber-50 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40 shadow-[0_0_18px_rgba(217,119,6,0.28)]" },
  { icon: BadgePercent, label: "Save up to 20% on Multi-Edition", tone: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40 shadow-[0_0_18px_rgba(5,150,105,0.28)]" },
  { icon: Stamp, label: "Verified RO", tone: "bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-500/40 shadow-[0_0_18px_rgba(190,18,60,0.22)]" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } } };

export function Hero() {
  const { t } = useI18n();
  return (
    <motion.section variants={container} initial="hidden" animate="show" className="mx-auto grid max-w-[1500px] items-start gap-8 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8">
      <Card className="min-w-0 p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col">
        <motion.p variants={item} className="order-1 mb-3 text-xs font-bold uppercase tracking-[0.2em] text-navy-600">{t("Newspaper advertising, simplified")}</motion.p>
        <motion.h1 variants={item} className="order-2 text-4xl leading-[1.08] font-black text-zinc-950 sm:text-5xl lg:text-6xl">{t("Book Newspaper Ads Across Kerala in 4 Simple Steps")}</motion.h1>
        <motion.p variants={item} className="order-3 mt-4 max-w-xl text-lg text-zinc-600">{t("Book Classified & Display ads in leading newspapers including Malayala Manorama and Mathrubhumi at the lowest rates.")}</motion.p>
        <motion.div variants={item} className="order-4 mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/#rates" size="lg" shimmer>{t("Check Live Rates")}</ButtonLink>
          <ButtonLink href="/book" size="lg" variant="secondary">{t("Book Advertisement")}</ButtonLink>
        </motion.div>
        <ul className="order-6 mt-6 flex flex-wrap gap-2" aria-label="Trust badges">
          {badges.map(({ icon: Icon, label, tone }) => (
            <motion.li key={label} variants={item} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${tone}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {t(label)}
            </motion.li>
          ))}
        </ul>
        {/* Right below the CTA buttons on mobile; below the trust badges from sm up. */}
        <motion.div variants={item} className="order-5 mt-6 block w-full max-w-full sm:order-7 sm:mt-8">
          <AdTicker />
        </motion.div>
        </div>
      </Card>
      <motion.div variants={item}>
        <QuickBookingWidget />
      </motion.div>
    </motion.section>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { useI18n } from "@/context/language-context";
import { useEffect, useState } from "react";
import { AD_TYPES } from "@/data/categories";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brandFor } from "@/data/brand-colors";
import { bookHref } from "@/lib/booking-params";
import { cutoffFor, earliestRelease, formatClock } from "@/lib/cutoff";
import { flagshipRate, flagshipEdition } from "@/lib/pricing";
import { useRateAvailability } from "@/lib/use-rates";
import { usePublication } from "@/lib/publication";
import { formatDateTime, formatINR } from "@/lib/utils";

/** Rate card + cut-off deadlines for whichever publication is active in the masthead bar. */
export function ActiveRateCard() {
  const { paper } = usePublication();
  const { t, tl, pn, place } = useI18n();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const flagship = flagshipEdition(paper);
  const { loaded, hasRates } = useRateAvailability();
  const available = hasRates(paper.name);

  return (
    <section id="rates" className="mx-auto max-w-[1500px] scroll-mt-32 px-4 sm:px-6 lg:px-8">
      <Card accent={brandFor(paper.id).primary} className="overflow-hidden p-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={paper.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="grid gap-0 md:grid-cols-[260px_1fr]">
            <div className="border-b border-zinc-200 bg-zinc-50/80 p-6 md:border-r md:border-b-0">
              <p className="text-xs font-bold tracking-[0.18em] text-zinc-500 uppercase">{t("Rate card")}</p>
              <h2 className="mt-2 text-3xl leading-tight font-black text-zinc-950">{pn(paper)}</h2>
              <p className="font-clipping mt-1 text-lg text-zinc-700">{paper.nameMl}</p>
              <p className="mt-2 text-sm text-zinc-600">
                {t("{lang} · {n} editions · Rates for {ed}", { lang: t(paper.language), n: paper.editions.length, ed: place(flagship.name) })}
              </p>
              {available ? (
                <ButtonLink href={bookHref({ paper: paper.id, eds: [flagship.id] })} className="mt-5" shimmer>
                  {t("Book in {name}", { name: pn(paper) })} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              ) : (
                <>
                  <button type="button" disabled className="mt-5 inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-zinc-200 px-5 text-sm font-semibold text-zinc-500">{t("Book in {name}", { name: pn(paper) })}</button>
                  <p className="mt-2 text-xs font-semibold text-amber-800">{t(loaded ? "Rates not yet published by admin" : "Checking rates…")}</p>
                </>
              )}
            </div>
            <div className="grid gap-px bg-zinc-200 sm:grid-cols-3">
              {AD_TYPES.map((a) => {
                const rate = flagshipRate(paper, a.id);
                const rule = paper.cutoffs[a.id];
                const earliest = now ? earliestRelease([paper.id], a.id, now) : null;
                return (
                  <div key={a.id} className="bg-white p-5">
                    <p className="text-sm font-bold text-zinc-950">{t(a.short)}</p>
                    {rate ? (
                      <p className="mt-3 text-3xl font-bold tabular-nums text-zinc-950">
                        <AnimatedNumber value={rate.amount} format={(n) => formatINR(n)} />
                        <span className="text-sm font-normal text-zinc-500"> / {t(rate.unit)}</span>
                      </p>
                    ) : (
                      <p className="mt-3 text-base font-semibold text-amber-800">{t(loaded ? "Rates Updating / Unavailable" : "Checking rates…")}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      {a.id === "classified-text" ? t("Minimum {n} lines · excl. GST", { n: paper.rates.textMinLines }) : t("Minimum {n} cm² · excl. GST", { n: paper.rates.minDisplayCm2 })}
                    </p>
                    <div className="mt-4 flex items-start gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-700">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <p>
                        {t("Cut-off: {n} day(s) before, {time}", { n: rule.daysBefore, time: formatClock(rule.time) })}
                        {earliest && <span className="mt-0.5 block font-semibold text-zinc-950">{t("Next print: book by {time}", { time: formatDateTime(cutoffFor(earliest, rule)) })}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </Card>
    </section>
  );
}

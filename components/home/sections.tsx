"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, CreditCard, FileText, Newspaper as NewspaperIcon } from "lucide-react";
import Link from "next/link";
import { brandFor } from "@/data/brand-colors";
import { templates } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import { buttonStyles } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { useI18n } from "@/context/language-context";
import { bookHref } from "@/lib/booking-params";
import { flagshipEdition, startingRate } from "@/lib/pricing";
import { usePublication } from "@/lib/publication";
import { cn, formatINR } from "@/lib/utils";
import { TemplateCard } from "./template-card";

const SECTION = "mx-auto max-w-[1500px] px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8";

/** 3. Publications showcase: uniform tiles, equal heights. */
export function Publications() {
  const { t, pn } = useI18n();
  const { activeId, setActive } = usePublication();
  return (
    <section id="publications" className={cn(SECTION, "scroll-mt-32")}>
      <SectionHeading eyebrow={t("Publications")} title={t("India's leading dailies, one booking desk")}>
        {t("National and regional titles with indicative rate cards. Combine editions for bundle discounts.")}
      </SectionHeading>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {newspapers.map((n) => {
          const r = startingRate(n, "classified-text");
          const brand = brandFor(n.id);
          const isMl = n.language === "Malayalam";
          const active = n.id === activeId;
          return (
            <motion.div key={n.id} whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full">
              <Card accent={brand.primary} className={cn("flex h-full flex-col justify-between p-4 hover:ring-2 hover:ring-[var(--c)]", active && "ring-2 ring-[var(--c)]")} style={{ backgroundColor: `color-mix(in srgb, ${brand.primary} 7%, var(--surface))`, borderLeftColor: `color-mix(in srgb, ${brand.primary} 25%, var(--surface))`, borderRightColor: `color-mix(in srgb, ${brand.primary} 25%, var(--surface))`, borderBottomColor: `color-mix(in srgb, ${brand.primary} 25%, var(--surface))`, boxShadow: active ? `0 0 22px color-mix(in srgb, ${brand.primary} 25%, transparent)` : undefined }}>
                <button type="button" onClick={() => setActive(n.id)} aria-pressed={active} className="text-left">
                  <span className={cn("flex h-11 items-center leading-tight font-bold", isMl ? "font-clipping text-xl" : "text-lg")} style={{ color: brand.primary }}>
                    {isMl ? n.nameMl : n.name}
                  </span>
                  {(!isMl || pn(n) !== n.nameMl) && isMl && <span className="mt-0.5 block text-xs text-zinc-500">{n.name}</span>}
                  <span className="mt-2 block text-xs text-zinc-500">
                    {t(n.language)} · {n.editions.length} {t("Editions")}
                  </span>
                </button>
                <div className="mt-4 border-t border-zinc-200 pt-3">
                  <p className="text-[11px] text-zinc-500">{t("Text from")}</p>
                  <p className="text-sm font-bold tabular-nums text-zinc-950">
                    {formatINR(r.amount)}/{t(r.unit)}
                  </p>
                  <Link href={bookHref({ paper: n.id, eds: [flagshipEdition(n).id] })} onClick={() => setActive(n.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline">
                    {t("Book in {name}", { name: pn(n) })} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

const FEATURED = ["matrimonial-bride", "name-change-adult", "lost-certificate"];

/** 4. Popular Malayalam clipping templates. */
export function PopularTemplates() {
  const { t } = useI18n();
  const picks = FEATURED.map((id) => templates.find((x) => x.id === id)!).filter(Boolean);
  return (
    <section className={cn(SECTION)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow={t("Category hubs")} title={t("Ready-made formats for standard ads")} />
        <Link href="/categories" className={buttonStyles({ variant: "secondary" })}>
          {t("Browse templates")}
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {picks.map((tp, i) => (
          <TemplateCard key={tp.id} tpl={tp} index={i} />
        ))}
      </div>
    </section>
  );
}

const steps = [
  { icon: NewspaperIcon, title: "Pick papers & category", text: "Choose editions and see combo discounts instantly." },
  { icon: FileText, title: "Compose & preview", text: "Type or upload, and watch the print column update live." },
  { icon: CalendarClock, title: "Schedule", text: "Select a date with clear publication cut-off times." },
  { icon: CreditCard, title: "Pay & get your RO", text: "Itemised GST pricing and an instant Release Order." },
];

/** 5. How it works. */
export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section className={SECTION}>
      <SectionHeading eyebrow={t("How it works")} title={t("From draft to print in four steps")} />
      <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className="h-full p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-navy-600 to-navy-500 text-lg font-bold text-white">{i + 1}</span>
                <s.icon className="h-5 w-5 text-navy-500" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-navy-900">{t(s.title)}</h3>
              <p className="mt-1 text-sm text-zinc-600">{t(s.text)}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

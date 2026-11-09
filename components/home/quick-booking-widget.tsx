"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { getAdType } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import Link from "next/link";
import { Field, Select } from "@/components/ui/field";
import { MultiSelect } from "@/components/ui/multi-select";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { bookHref } from "@/lib/booking-params";
import { useI18n } from "@/context/language-context";
import { usePublication } from "@/lib/publication";
import { comboSuggestions, estimateQuote, flagshipEdition } from "@/lib/pricing";
import { useRateAvailability, useRatesVersion } from "@/lib/use-rates";
import { paperConfig, visibleEditions } from "@/lib/rates";
import type { AdType } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

/** Quick booking calculator. The ad format is chosen in the hero's tab control and passed in. */
export function QuickBookingWidget({ adType }: { adType: AdType }) {
  const { t, place, pn } = useI18n();
  const { activeId: paperId, setActive: setPaperId } = usePublication();
  const firstEd = (id: string) => [flagshipEdition(newspapers.find((n) => n.id === id)!).id];
  const [eds, setEds] = useState<string[]>(() => firstEd(paperId));
  const [edsFor, setEdsFor] = useState(paperId);
  if (edsFor !== paperId) {
    // Active publication changed (masthead bar or dropdown): reset edition choice.
    setEdsFor(paperId);
    setEds(firstEd(paperId));
  }
  const paper = newspapers.find((n) => n.id === paperId)!;

  const [lines, setLines] = useState(5);
  const [height, setHeight] = useState(10);
  const isText = adType === "classified-text";
  const ratesVersion = useRatesVersion();
  const { loaded, hasRates } = useRateAvailability();
  const available = hasRates(paper.name, adType);
  const quote = useMemo(
    () => estimateQuote(adType, eds.length ? { [paperId]: eds } : {}, isText ? { lines } : { heightCm: height }),
    [adType, paperId, eds, lines, height, isText, ratesVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const hint = comboSuggestions(paperId, eds)[0];
  const cfg = paperConfig(paper, adType);
  const minLabel = adType === "classified-text" ? `${cfg.minLines} ${t("lines")}` : `${cfg.minSqCm} cm²`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-[#1F2F57] dark:bg-[#132247]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-rose-500" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold tracking-tight text-slate-900 dark:text-[#FFFFFF]">{t("Quick booking")}</h2>
          <p className="text-sm text-slate-600 dark:text-[#FAFAFA]">{t("Get a starting rate in seconds.")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E11D48]/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-[#E11D48] uppercase">{t(getAdType(adType).short)}</span>
      </div>

      <div className="mt-4 space-y-4">
        <Field id="qb-paper" label={t("Publication")}>
          <Select id="qb-paper" value={paperId} onChange={(e) => setPaperId(e.target.value)}>
            <optgroup label={t("National dailies")}>
              {newspapers.filter((n) => n.scope === "national").map((n) => <option key={n.id} value={n.id} disabled={!hasRates(n.name)}>{pn(n)}{!hasRates(n.name) ? ` · ${t("Rates updating")}` : ""}</option>)}
            </optgroup>
            <optgroup label={t("Regional dailies")}>
              {newspapers.filter((n) => n.scope === "regional").map((n) => <option key={n.id} value={n.id} disabled={!hasRates(n.name)}>{pn(n)}{!hasRates(n.name) ? ` · ${t("Rates updating")}` : ""}</option>)}
            </optgroup>
          </Select>
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-[#FFFFFF]">{t("Edition / city")}</span>
          <MultiSelect
            label={t("Editions")}
            placeholder={t("Choose editions")}
            value={eds}
            onChange={setEds}
            options={visibleEditions(paper).map((e) => ({ value: e.id, label: place(e.name), group: place(paper.groups.find((g) => g.id === e.groupId)?.name ?? "") }))}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="qb-size" className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-[#FFFFFF]">
          <span>{isText ? t("Ad length") : t("Ad height")}</span>
          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-bold text-white tabular-nums dark:bg-[#FFFFFF] dark:text-slate-900">{isText ? t("{n} lines", { n: lines }) : t("{n} cm", { n: height })}</span>
        </label>
        <input
          id="qb-size"
          type="range"
          min={3}
          max={isText ? 20 : 30}
          step={1}
          value={isText ? lines : height}
          onChange={(e) => (isText ? setLines(+e.target.value) : setHeight(+e.target.value))}
          className="range-ink w-full"
          style={{ ["--fill" as string]: `${(((isText ? lines : height) - 3) / ((isText ? 20 : 30) - 3)) * 100}%` }}
        />
        <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-500" aria-hidden="true">
          {(isText ? [3, 5, 10, 15, 20] : [3, 10, 15, 20, 30]).map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#1F2F57] dark:bg-[#17284F]" aria-live="polite">
        {!available ? (
          <p className="text-sm font-semibold text-amber-800">{t(loaded ? "Rates not yet published by admin" : "Checking rates…")}</p>
        ) : eds.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("Select at least one edition to see an estimate.")}</p>
        ) : (
          <>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">{t("Estimated total")}</p>
            <p className="font-[family-name:var(--font-jakarta)] text-3xl font-black tracking-tight text-emerald-600 tabular-nums md:text-4xl dark:text-emerald-400">
              <AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /> <span className="font-mono text-xs font-semibold text-slate-500">{t("incl. 18% GST")}</span>
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {t("Minimum {min} · {n} edition(s)", { min: minLabel, n: eds.length })}
              {quote.totals.discount > 0 && <span className="font-semibold text-emerald-700 dark:text-emerald-200"> · {t("saving {amount}", { amount: formatINR(quote.totals.discount) })}</span>}
            </p>
          </>
        )}
        {available && hint && eds.length > 0 && (
          <button type="button" onClick={() => setEds([...new Set([...eds, ...hint.missingEditionIds])])} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-left text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t("Add all {group} editions for {pct}% off", { group: place(hint.groupName), pct: hint.discountPct })}
          </button>
        )}
      </div>

      {!available ? (
        <button type="button" disabled className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-200 py-4 font-bold text-slate-500">{t("Proceed to Booking")}</button>
      ) : (
      <Link href={bookHref({ type: adType, paper: paperId, eds })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 py-4 font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.01] hover:from-rose-500 hover:to-red-500 hover:shadow-rose-600/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:scale-[0.99]">
        {t("Proceed to Booking")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      )}
    </div>
  );
}

"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { getAdType } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { MultiSelect } from "@/components/ui/multi-select";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { bookHref } from "@/lib/booking-params";
import { useI18n } from "@/context/language-context";
import { usePublication } from "@/lib/publication";
import { comboSuggestions, estimateQuote, flagshipEdition } from "@/lib/pricing";
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
  const quote = useMemo(
    () => estimateQuote(adType, eds.length ? { [paperId]: eds } : {}, isText ? { lines } : { heightCm: height }),
    [adType, paperId, eds, lines, height, isText],
  );
  const hint = comboSuggestions(paperId, eds)[0];
  const minLabel = adType === "classified-text" ? `${paper.rates.textMinLines} ${t("lines")}` : `${paper.rates.minDisplayCm2} cm²`;

  return (
    <Card className="p-5 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold tracking-tight text-slate-900 dark:text-[#f1f1f3]">{t("Quick booking")}</h2>
          <p className="text-sm text-slate-600 dark:text-[#bdbec4]">{t("Get a starting rate in seconds.")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E11D48]/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-[#E11D48] uppercase">{t(getAdType(adType).short)}</span>
      </div>

      <div className="mt-4 space-y-4">
        <Field id="qb-paper" label={t("Publication")}>
          <Select id="qb-paper" value={paperId} onChange={(e) => setPaperId(e.target.value)}>
            <optgroup label={t("National dailies")}>
              {newspapers.filter((n) => n.scope === "national").map((n) => <option key={n.id} value={n.id}>{pn(n)}</option>)}
            </optgroup>
            <optgroup label={t("Regional dailies")}>
              {newspapers.filter((n) => n.scope === "regional").map((n) => <option key={n.id} value={n.id}>{pn(n)}</option>)}
            </optgroup>
          </Select>
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-[#e6e6e9]">{t("Edition / city")}</span>
          <MultiSelect
            label={t("Editions")}
            placeholder={t("Choose editions")}
            value={eds}
            onChange={setEds}
            options={paper.editions.map((e) => ({ value: e.id, label: place(e.name), group: place(paper.groups.find((g) => g.id === e.groupId)?.name ?? "") }))}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="qb-size" className="mb-1 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-[#e6e6e9]">
          <span>{isText ? t("Ad length") : t("Ad height")}</span>
          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-bold text-white tabular-nums dark:bg-[#eaeaea] dark:text-slate-900">{isText ? t("{n} lines", { n: lines }) : t("{n} cm", { n: height })}</span>
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

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#2a2b30] dark:bg-[#202125]" aria-live="polite">
        {eds.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("Select at least one edition to see an estimate.")}</p>
        ) : (
          <>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">{t("Estimated total")}</p>
            <p className="font-[family-name:var(--font-jakarta)] text-4xl font-black tracking-tight tabular-nums text-slate-900 dark:text-[#f1f1f3]">
              <AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /> <span className="font-mono text-xs font-semibold text-slate-500">{t("incl. 18% GST")}</span>
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {t("Minimum {min} · {n} edition(s)", { min: minLabel, n: eds.length })}
              {quote.totals.discount > 0 && <span className="font-semibold text-emerald-700 dark:text-emerald-200"> · {t("saving {amount}", { amount: formatINR(quote.totals.discount) })}</span>}
            </p>
          </>
        )}
        {hint && eds.length > 0 && (
          <button type="button" onClick={() => setEds([...new Set([...eds, ...hint.missingEditionIds])])} className="mt-2 inline-flex items-center gap-1.5 text-left text-xs font-semibold text-amber-800 dark:text-amber-200 hover:underline">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t("Add all {group} editions for {pct}% off", { group: place(hint.groupName), pct: hint.discountPct })}
          </button>
        )}
      </div>

      <ButtonLink href={bookHref({ type: adType, paper: paperId, eds })} size="lg" className="mt-4 w-full rounded-xl bg-[#E11D48] text-white hover:bg-[#BE123C] active:scale-[0.98] dark:bg-[#E11D48] dark:text-white dark:hover:bg-[#BE123C]">
        {t("Proceed to Booking")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </Card>
  );
}

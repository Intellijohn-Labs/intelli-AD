"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AD_TYPES } from "@/data/categories";
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

export function QuickBookingWidget() {
  const { t, place, pn } = useI18n();
  const [adType, setAdType] = useState<AdType>("classified-text");
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
      <h2 className="text-xl font-bold text-navy-900">{t("Quick booking")}</h2>
      <p className="text-sm text-zinc-600">{t("Get a starting rate in seconds.")}</p>

      <div role="radiogroup" aria-label="Ad type" className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 text-center text-xs font-semibold">
        {AD_TYPES.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={adType === a.id} onClick={() => setAdType(a.id)} className={cn("rounded-md px-1.5 py-2 transition-colors", adType === a.id ? "bg-navy-800 text-white shadow" : "text-zinc-600 hover:bg-white")}>
            {t(a.short)}
          </button>
        ))}
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
          <span className="mb-1.5 block text-sm font-semibold text-zinc-800">{t("Edition / city")}</span>
          <MultiSelect
            label={t("Editions")}
            placeholder={t("Choose editions")}
            value={eds}
            onChange={setEds}
            options={paper.editions.map((e) => ({ value: e.id, label: place(e.name), group: place(paper.groups.find((g) => g.id === e.groupId)?.name ?? "") }))}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="qb-size" className="mb-1 flex items-center justify-between text-sm font-semibold text-zinc-800">
          <span>{isText ? t("Ad length") : t("Ad height")}</span>
          <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-700 tabular-nums">{isText ? t("{n} lines", { n: lines }) : t("{n} cm", { n: height })}</span>
        </label>
        <input
          id="qb-size"
          type="range"
          min={isText ? 3 : 3}
          max={isText ? 20 : 30}
          value={isText ? lines : height}
          onChange={(e) => (isText ? setLines(+e.target.value) : setHeight(+e.target.value))}
          className="h-2 w-full cursor-pointer accent-[var(--brand)]"
        />
      </div>

      <div className="mt-5 rounded-xl border border-navy-200 bg-gradient-to-br from-navy-50 to-white p-4" aria-live="polite">
        {eds.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("Select at least one edition to see an estimate.")}</p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("Estimated total")}</p>
            <p className="text-3xl font-bold tabular-nums text-navy-700">
              <AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /> <span className="text-sm font-normal text-zinc-500">{t("incl. GST")}</span>
            </p>
            <p className="text-xs text-zinc-500">
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

      <ButtonLink href={bookHref({ type: adType, paper: paperId, eds })} size="lg" shimmer className="mt-4 w-full">
        {t("Proceed to Booking")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </Card>
  );
}

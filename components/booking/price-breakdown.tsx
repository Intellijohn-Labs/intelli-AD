"use client";

import { GST_RATE, type Quote } from "@/lib/pricing";
import { useI18n } from "@/context/language-context";
import { cn, formatINR } from "@/lib/utils";
import type { AdType } from "@/lib/types";

function Row({ label, sub, value, negative, strong, muted }: { label: string; sub?: string; value: number; negative?: boolean; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5 text-sm", strong && "border-t-2 border-navy-800 pt-3 text-base font-bold", muted && "text-zinc-500")}>
      <div>
        <p>{label}</p>
        {sub && <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{sub}</p>}
      </div>
      <p className={cn("tabular-nums", negative && "font-semibold text-emerald-700 dark:text-emerald-200")}>
        {negative && value > 0 ? "−" : ""}
        {formatINR(value, { decimals: true })}
      </p>
    </div>
  );
}

export function PriceBreakdown({ quote, adType, showEditions }: { quote: Quote; adType: AdType; showEditions?: boolean }) {
  const { t: tr } = useI18n();
  const { totals: t, metrics: m, editionCount } = quote;
  const isText = adType === "classified-text";
  const baseSub = isText ? tr("Minimum {n} lines × {e} edition(s)", { n: m.minLines, e: editionCount }) : tr("Minimum {n} cm² × {e} edition(s)", { n: m.minAreaCm2, e: editionCount });
  const extraUnits = quote.lines[0]?.extraUnits ?? 0;
  const extraSub = tr("{n} extra {unit} beyond minimum", {
    n: isText ? extraUnits : extraUnits.toFixed(1),
    unit: tr(isText ? (quote.lines[0]?.extraUnitLabel ?? "lines") : "cm²"),
  });
  return (
    <div>
      <Row label={tr("Base rate")} sub={baseSub} value={t.base} />
      <Row label={isText ? tr("Extra lines / words") : tr("Extra area")} sub={extraSub} value={t.extra} />
      <Row
        label={tr("Visual enhancements")}
        sub={quote.enhancementItems.length ? quote.enhancementItems.map((i) => `${tr(i.label)} ${formatINR(i.amount)}`).join(" · ") : isText ? tr("None") : tr("Black & white")}
        value={t.enhancements}
      />
      {t.discount > 0 && <Row label={tr("Combo / bulk discount")} sub={tr("Multi-edition savings")} value={t.discount} negative />}
      <Row label={tr("Taxable amount")} value={t.taxable} muted />
      <Row label={tr("GST ({pct}%)", { pct: GST_RATE * 100 })} value={t.gst} />
      <Row label={tr("Total payable")} value={t.total} strong />
      {showEditions && quote.lines.length > 0 && (
        <details className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          <summary className="cursor-pointer font-semibold text-navy-800 dark:text-zinc-100">{tr("Per-edition breakdown")}</summary>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
            {quote.lines.map((l) => (
              <li key={l.editionId} className="flex justify-between gap-3 py-1.5">
                <span>
                  {l.newspaperName} – {l.editionName}
                  {l.discountPct > 0 && <span className="block text-xs text-zinc-900">{tr("{pct}% combo discount", { pct: l.discountPct })}</span>}
                </span>
                <span className="tabular-nums">{formatINR(l.net, { decimals: true })}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

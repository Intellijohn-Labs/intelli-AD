"use client";

import { GST_RATE, type Quote } from "@/lib/pricing";
import { useI18n } from "@/context/language-context";
import { cn, formatINR } from "@/lib/utils";
import type { AdType } from "@/lib/types";

function Row({ label, sub, value, negative, strong, muted }: { label: string; sub?: string; value: number; negative?: boolean; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-dashed border-zinc-300 py-1.5 text-sm last:border-b-0", strong && "border-t-2 border-b-0 border-solid border-[#0F172A] pt-3 text-base font-bold dark:border-[#FFFFFF]", muted && "text-zinc-500")}>
      <div>
        <p>{label}</p>
        {sub && <p className="text-xs font-normal text-zinc-500 dark:text-slate-200">{sub}</p>}
      </div>
      <p className={cn("font-mono tracking-tight tabular-nums", negative && "font-semibold text-emerald-700 dark:text-emerald-200")}>
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
      {t.insertions > 1 && (
        <p className="mb-1 rounded bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold dark:bg-white/10">
          {formatINR(t.perInsertion, { decimals: true })} × {t.insertions} {tr("insertions")}
        </p>
      )}
      <Row label={tr("Base rate")} sub={baseSub} value={t.base} />
      <Row label={isText ? tr("Extra lines / words") : tr("Extra area")} sub={extraSub} value={t.extra} />
      <Row
        label={tr("Visual enhancements")}
        sub={quote.enhancementItems.length ? quote.enhancementItems.map((i) => `${tr(i.label)} ${formatINR(i.amount)}`).join(" · ") : isText ? tr("None") : tr("Black & white")}
        value={t.enhancements}
      />
      {t.discount > 0 && <Row label={tr("Combo / bulk discount")} sub={tr("Multi-edition savings")} value={t.discount} negative />}
      {t.multiDay > 0 && (
        <div className="my-1 flex items-center justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200">
          <span>{tr("Multi-day Savings")} ({t.multiDayPct}%)</span>
          <span className="font-mono tabular-nums">−{formatINR(t.multiDay, { decimals: true })}</span>
        </div>
      )}
      <Row label={tr("Taxable amount")} value={t.taxable} muted />
      <Row label={tr("GST ({pct}%)", { pct: GST_RATE * 100 })} value={t.gst} />
      <Row label={tr("Total payable")} value={t.total} strong />
      {showEditions && quote.lines.length > 0 && (
        <details className="mt-3 rounded border border-dashed border-zinc-400 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-[#0F172A] dark:text-zinc-100">{tr("Per-edition breakdown")}</summary>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
            {quote.lines.map((l) => (
              <li key={l.editionId} className="flex justify-between gap-3 py-1.5">
                <span>
                  {l.newspaperName} – {l.editionName}
                  {l.discountPct > 0 && <span className="block text-xs text-zinc-900">{tr("{pct}% combo discount", { pct: l.discountPct })}</span>}
                </span>
                <span className="font-mono tabular-nums">{formatINR(l.net, { decimals: true })}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

"use client";

import { Field, Input } from "@/components/ui/field";
import { HEIGHT_LIMITS, SIZE_PRESETS, WIDTH_LIMITS } from "@/lib/display";
import type { ColorMode } from "@/lib/types";
import type { Quote } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";

/**
 * Dimension-based pricing control for display ads: width × height = area, with standard presets,
 * custom inputs, colour mode, and the formula that turns the area into a price.
 */
export function DisplaySizer({
  widthCm,
  heightCm,
  colorMode,
  colorPremiumPct,
  minAreaCm2,
  quote,
  errors,
  onSize,
  onColor,
}: {
  widthCm: number;
  heightCm: number;
  colorMode: ColorMode;
  colorPremiumPct: number;
  minAreaCm2: number;
  quote: Quote;
  errors: { widthCm?: string; heightCm?: string };
  onSize: (widthCm: number, heightCm: number) => void;
  onColor: (c: ColorMode) => void;
}) {
  const w = Number.isFinite(widthCm) ? widthCm : 0;
  const h = Number.isFinite(heightCm) ? heightCm : 0;
  const area = Math.round(w * h * 100) / 100; // same rounding as the quote, so the sentence below matches it exactly
  const line = quote.lines[0];
  const billed = Math.max(area, minAreaCm2);
  const colour = quote.enhancementItems.find((e) => e.key === "color");

  return (
    <fieldset className="space-y-5">
      <legend className="mb-2 text-sm font-bold">Ad size · width × height (cm)</legend>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Standard sizes">
        {SIZE_PRESETS.map((p) => {
          const on = w === p.widthCm && h === p.heightCm;
          return (
            <button
              key={`${p.widthCm}x${p.heightCm}`}
              type="button"
              aria-pressed={on}
              onClick={() => onSize(p.widthCm, p.heightCm)}
              className={cn("rounded border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-navy-500", on ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}
            >
              <span className="block font-mono font-bold">{p.widthCm} × {p.heightCm} cm</span>
              <span className="block text-xs text-zinc-500">{p.label} · {p.widthCm * p.heightCm} cm²</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field id="ad-width" label="Width (cm)" required error={errors.widthCm} className="w-32">
          <Input id="ad-width" type="number" step="0.5" min={WIDTH_LIMITS.min} max={WIDTH_LIMITS.max} inputMode="decimal" value={Number.isFinite(widthCm) ? widthCm : ""} aria-invalid={!!errors.widthCm} onChange={(e) => onSize(e.target.valueAsNumber, h)} />
        </Field>
        <span className="pb-2.5 font-mono text-lg font-bold" aria-hidden="true">×</span>
        <Field id="ad-height" label="Height (cm)" required error={errors.heightCm} className="w-32">
          <Input id="ad-height" type="number" step="0.5" min={HEIGHT_LIMITS.min} max={HEIGHT_LIMITS.max} inputMode="decimal" value={Number.isFinite(heightCm) ? heightCm : ""} aria-invalid={!!errors.heightCm} onChange={(e) => onSize(w, e.target.valueAsNumber)} />
        </Field>
        <p className="pb-2 font-mono text-sm font-bold" aria-live="polite">= {Number(area.toFixed(2))} cm²</p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Colour mode">
        {(["bw", "color"] as const).map((c) => (
          <label key={c} className={cn("cursor-pointer rounded border px-3 py-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", colorMode === c ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white dark:bg-[#0F1D3D]")}>
            <input type="radio" className="sr-only" checked={colorMode === c} onChange={() => onColor(c)} />
            <span className="font-semibold">{c === "bw" ? "Black & white" : "Multi-colour"}</span>
            <span className="block text-xs text-zinc-500">{c === "bw" ? "Colour multiplier ×1.00" : `Colour multiplier ×${(1 + colorPremiumPct / 100).toFixed(2)}`}</span>
          </label>
        ))}
      </div>

      {line && (() => {
        const mult = colorMode === "color" ? 1 + colorPremiumPct / 100 : 1;
        const perEdition = Math.round(billed * line.rate * mult * 100) / 100; // exactly what the sentence below multiplies out to
        const n = quote.editionCount;
        return (
          <div className="rounded-md border border-dashed border-zinc-400 bg-white/60 p-3 font-mono text-xs leading-relaxed dark:bg-transparent" aria-live="polite">
            <p className="font-bold">Price = area × base rate × colour multiplier, then GST</p>
            <p>{Number(billed.toFixed(2))} cm² × {formatINR(line.rate, { decimals: true })}/cm² × {mult.toFixed(2)} = {formatINR(perEdition, { decimals: true })}{n > 1 ? " per edition" : ""}</p>
            {area < minAreaCm2 && <p className="text-amber-700 dark:text-amber-200">Minimum billable area is {minAreaCm2} cm²; smaller boxes are billed at the minimum.</p>}
            {n > 1 && <p>× {n} editions = {formatINR(quote.totals.gross, { decimals: true })}</p>}
            {quote.totals.discount > 0 && <p>− multi-edition discount {formatINR(quote.totals.discount, { decimals: true })} = {formatINR(quote.totals.taxable, { decimals: true })}</p>}
            <p>+ 18% GST {formatINR(quote.totals.gst, { decimals: true })} → <b>{formatINR(quote.totals.total, { decimals: true })}</b></p>
          </div>
        );
      })()}
    </fieldset>
  );
}

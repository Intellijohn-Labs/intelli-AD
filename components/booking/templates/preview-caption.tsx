"use client";

import { getNewspaper } from "@/data/newspapers";
import type { BookingState } from "@/lib/booking-store";
import { displayWidth } from "@/lib/display";
import { applySpacing } from "@/lib/paragraphs";
import { measureText } from "@/lib/pricing";
import { useBookingQuote } from "@/lib/use-quote";
import { formatINR } from "@/lib/utils";

/**
 * Line / size counter and live cost under a notice preview. Uses the same quote as the sidebar summary,
 * so the line count (text ads) and area (display ads) always agree with the price shown there.
 */
export function PreviewCaption({ state }: { state: BookingState }) {
  const quote = useBookingQuote(state);
  const paper = getNewspaper(Object.keys(state.selection).find((k) => state.selection[k].length));
  const isText = state.adType === "classified-text";
  const cpl = paper?.rates.charsPerLine ?? 28;
  const minLines = paper?.rates.textMinLines ?? 3;
  const m = measureText(isText ? applySpacing(state.text, state.paragraphSpacing) : state.text, cpl);
  const extra = Math.max(0, m.lines - minLines);
  const tier = extra === 0 ? "Base" : extra <= 3 ? "Standard" : "Extended";
  const h = Number.isFinite(state.display.heightCm) ? state.display.heightCm : 0;
  const widthCm = displayWidth(state.display, paper?.rates.colWidthCm ?? 4);
  const area = widthCm * h;
  const size = isText
    ? `${m.lines} lines · ${tier} tier (${minLines} base${extra ? ` + ${extra} extra at ${formatINR(quote.lines[0] && quote.lines[0].extraUnits ? quote.lines[0].extra / quote.lines[0].extraUnits : 0)}/line` : ""})`
    : `${widthCm} × ${h} cm = ${area.toFixed(1)} cm²`;
  return (
    <figcaption className="mt-2 space-y-0.5 text-center text-xs text-zinc-500">
      <p>{m.chars} characters · {size}</p>
      <p className="font-semibold text-zinc-900">Estimated cost: {formatINR(quote.totals.total)} <span className="font-normal text-zinc-500">incl. GST</span></p>
    </figcaption>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Maximize2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getNewspaper } from "@/data/newspapers";
import { useI18n } from "@/context/language-context";
import type { BookingState } from "@/lib/booking-store";
import { displayWidth } from "@/lib/display";
import { measureText } from "@/lib/pricing";
import { AdRender } from "./ad-render";

/** Step 4: the composed ad as it will print, with an Edit shortcut back to Compose and a click-to-enlarge proof. */
export function ProofCard({ state, onEdit }: { state: BookingState; onEdit: () => void }) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(false);
  const paper = getNewspaper(Object.keys(state.selection).find((k) => state.selection[k].length));
  const isText = state.adType === "classified-text";
  const w = displayWidth(state.display, paper?.rates.colWidthCm ?? 4);
  const lines = measureText(state.text, paper?.rates.charsPerLine ?? 28).lines;
  const tag = isText ? `${lines} ${t("lines")}` : `${w} cm × ${state.display.heightCm} cm`;
  // A finished upload is a single large image: show it big rather than re-scaling the template preview.
  const bigImage = !isText && state.creativeMode === "upload" && state.artwork?.previewUrl;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <section aria-labelledby="proof-h" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-700 dark:bg-zinc-800/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="proof-h" className="text-lg font-bold text-navy-900 dark:text-zinc-50">{t("Print Proof & Creative Preview")}</h3>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("Ready for Print")}
          </span>
        </div>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit Ad / മാറ്റങ്ങൾ വരുത്തുക
        </button>
      </div>

      <div className="newsprint-texture relative mt-4 rounded-lg border border-zinc-300/70 p-4 dark:border-zinc-600">
        <span className="absolute top-2 left-2 z-10 rounded bg-white/90 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-700 shadow-sm">{tag}</span>
        <button type="button" onClick={() => setZoom(true)} aria-label="Enlarge proof" className="block w-full cursor-zoom-in rounded text-left focus-visible:outline-2 focus-visible:outline-blue-600">
          <div className="pointer-events-none"><AdRender state={state} /></div>
        </button>
      </div>
      <button type="button" onClick={() => setZoom(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Enlarge Proof / വലുതാക്കി കാണുക
      </button>

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setZoom(false); }}
          >
            <motion.div role="dialog" aria-modal="true" aria-label="Print proof" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
              className="relative max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#132247]">
              <button type="button" onClick={() => setZoom(false)} aria-label="Close proof" className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
              <p className="mb-3 pr-8 font-mono text-xs font-bold uppercase tracking-wider text-slate-500">{t("Print Proof & Creative Preview")} · {tag}</p>
              {bigImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bigImage} alt="Uploaded creative, full size" className="mx-auto max-h-[78vh] w-auto max-w-full rounded border border-zinc-300 object-contain" />
              ) : (
                <div className="newsprint-texture rounded-lg border border-zinc-300/70 p-4"><div style={{ zoom: 1.7 }}><AdRender state={state} /></div></div>
              )}
              <p className="mt-3 text-xs text-slate-500">Check spelling, names, dates and photo quality before you pay.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getNewspaper } from "@/data/newspapers";
import { useI18n } from "@/context/language-context";
import { useBooking } from "@/lib/booking-store";
import { isDisplayOnlyCategory } from "@/lib/display";
import { AdRender } from "./ad-render";

const fmtDate = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : null);

/**
 * Print simulation of the ad as it is composed right now. Reuses the booking's own renderers, so every ad type matches
 * the live proof: classified text (tick / bold first line / border in a classified column), obituary and tender
 * templates with the uploaded photo, and display ads (uploaded creative or text mockup) scaled to the chosen size.
 */
export function NewspaperPreviewModal({ onClose, onContinue }: { onClose: () => void; onContinue: () => void }) {
  const { state } = useBooking();
  const { pn, place } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const paperId = Object.keys(state.selection).find((k) => state.selection[k].length);
  const paper = getNewspaper(paperId);
  const edition = paper?.editions.find((e) => state.selection[paper.id]?.includes(e.id));
  const isText = state.adType === "classified-text";
  const template = isDisplayOnlyCategory(state.categoryId);
  const date = fmtDate(state.releaseDate);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="np-title" className="my-6 w-full max-w-2xl rounded-sm border border-stone-300 bg-[#fbfbf9] text-stone-900 shadow-2xl [background-image:radial-gradient(rgba(0,0,0,0.035)_1px,transparent_1px)] [background-size:4px_4px]">
        <header className="flex items-start justify-between gap-3 border-b-[3px] border-double border-stone-800 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id="np-title" className="font-serif text-xl font-extrabold tracking-tight sm:text-2xl">{paper ? pn(paper) : "The Daily"} – Print Simulation</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-600">
              {edition && <span className="rounded border border-stone-500 px-1.5 py-0.5">{place(edition.name)} edition</span>}
              <span>{date ?? "Release date to be chosen"}</span>
            </p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close preview" onClick={onClose} className="rounded p-1 text-stone-600 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-stone-700"><X className="h-5 w-5" /></button>
        </header>

        <div className="px-5 py-6">
          <div className="mx-auto rounded-sm border border-stone-300 bg-[#fbfbf9] p-3 shadow-inner" style={{ maxWidth: isText || template ? 260 : "100%" }}>
            <div className="font-serif text-stone-900">
              <AdRender state={state} />
            </div>
          </div>
        </div>

        <footer className="border-t border-stone-300 px-5 py-4">
          <p className="text-xs italic text-stone-600">This is an approximate simulation of how your ad will appear in the print edition.</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close Preview</Button>
            <Button type="button" onClick={onContinue}>Looks Good, Continue <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

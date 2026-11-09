"use client";

import { getCategory } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { paperConfig } from "@/lib/rates";
import { useRatesVersion } from "@/lib/use-rates";
import { useI18n } from "@/context/language-context";
import { useBooking, type BookingState } from "@/lib/booking-store";
import { displayWidth, isDisplayOnlyCategory } from "@/lib/display";
import { applySpacing } from "@/lib/paragraphs";
import { NewspaperPreview, type ProofEditor } from "./newspaper-preview";
import { PrintPreview } from "./print-preview";
import { ObituaryPreview } from "./templates/obituary-template";
import { TenderPreview } from "./templates/tender-template";

/** The composed ad exactly as the live preview shows it: template notice, text clip, or uploaded creative, on newsprint. */
export function AdRender({ state, editable = false }: { state: BookingState; editable?: boolean }) {
  const { tl, pn } = useI18n();
  const { update } = useBooking();
  const category = getCategory(state.categoryId);
  const paperId = Object.keys(state.selection).find((k) => state.selection[k].length);
  const paper = getNewspaper(paperId) ?? undefined;
  const isText = state.adType === "classified-text";
  const displayOnly = isDisplayOnlyCategory(state.categoryId) && !isText;
  useRatesVersion();
  const colW = paper?.rates.colWidthCm ?? 4;
  const widthCm = displayWidth(state.display, colW);
  const builder = displayOnly && state.creativeMode === "builder";
  const paperName = paper ? pn(paper) : "The Daily";

  if (builder)
    return (
      <PrintPreview widthCm={widthCm} heightCm={state.display.heightCm} colWidthCm={colW} paperName={paperName} colorMode={state.display.colorMode}>
        {state.categoryId === "tender" ? <TenderPreview state={state} bare editable={editable} /> : <ObituaryPreview state={state} bare editable={editable} />}
      </PrintPreview>
    );
  if (isDisplayOnlyCategory(state.categoryId) && isText) return state.categoryId === "tender" ? <TenderPreview state={state} editable={editable} /> : <ObituaryPreview state={state} editable={editable} />;
  if (isText) {
    // In the live sidebar the proof is editable in place; edits write straight back to the booking (and so the form and price).
    const editor: ProofEditor | undefined = editable
      ? {
          rawText: state.text,
          onText: (txt) => update({ text: txt }),
          onStyle: (p) => update({ textStyle: { ...state.textStyle, ...p } }),
          onEnhancements: (p) => update({ enhancements: { ...state.enhancements, ...p } }),
        }
      : undefined;
    return (
      <NewspaperPreview
        text={applySpacing(state.text, state.paragraphSpacing)}
        charsPerLine={paper?.rates.charsPerLine ?? 28}
        enhancements={state.enhancements}
        paperName={paperName}
        categoryName={category ? tl(category.name, category.nameMl) : "General"}
        minLines={paper ? paperConfig(paper, "classified-text").minLines : 3}
        colWidthCm={colW}
        textStyle={state.textStyle}
        floralAllowed={state.categoryId === "obituary" || state.categoryId === "remembrance"}
        editor={editor}
      />
    );
  }
  // Display ad with no artwork: the composed text is set in the box.
  if (!state.artwork && state.text.trim())
    return (
      <PrintPreview widthCm={widthCm} heightCm={state.display.heightCm} colWidthCm={colW} paperName={paperName} colorMode={state.display.colorMode}>
        <div className="bg-[#FBF8F1] p-3 text-slate-900" style={{ fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", Georgia, serif' }}>
          <div lang={/[\u0D00-\u0D7F]/.test(state.text) ? "ml" : "en"} className="hyphens-auto text-justify text-[13px] leading-snug [overflow-wrap:anywhere]">
            {state.text.replace(/\s+$/g, "").split("\n").map((p, i) => (p.trim() ? <p key={i} className="mb-1.5 last:mb-0">{p}</p> : <div key={i} className="h-2" aria-hidden="true" />))}
          </div>
        </div>
      </PrintPreview>
    );
  return <PrintPreview widthCm={widthCm} heightCm={state.display.heightCm} colWidthCm={colW} paperName={paperName} colorMode={state.display.colorMode} imageUrl={state.artwork?.previewUrl} fileName={state.artwork?.name} />;
}

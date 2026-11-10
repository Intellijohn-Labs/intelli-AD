"use client";

import { AlignCenter, AlignJustify, AlignLeft, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { composeObituary, DEFAULT_OBITUARY, FRAME_STYLES, type FrameStyle, type ObituaryFields } from "@/data/obituary";
import { useBooking, type TextStyle } from "@/lib/booking-store";
import { isDisplayOnlyCategory } from "@/lib/display";
import { cn } from "@/lib/utils";
import { AdRender } from "./ad-render";

const DEFAULT_STYLE: TextStyle = { italic: false, align: "justify", borderStyle: "single", size: "md" };
const btn = "inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600";
const idle = "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100";
const active = "border-zinc-900 bg-zinc-900 text-white";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

/**
 * Large interactive proof. It edits the live booking state directly (the Step 2 form mirrors that state), so every
 * change is two-way synced and "Done" only has to close the dialog.
 */
export function FullScreenProofEditorModal({ onClose }: { onClose: () => void }) {
  const { state, update } = useBooking();
  const doneRef = useRef<HTMLButtonElement>(null);
  const style: TextStyle = { ...DEFAULT_STYLE, ...state.textStyle };
  const isText = state.adType === "classified-text";
  const isObit = state.categoryId === "obituary" || state.categoryId === "remembrance";
  const hasPhoto = isObit && isDisplayOnlyCategory(state.categoryId) && !isText && state.creativeMode === "builder";
  const showFrames = hasPhoto; // notice border styles only exist on the display notice
  const ob: ObituaryFields = { ...DEFAULT_OBITUARY, ...state.obituary, kind: state.categoryId === "remembrance" ? "anniversary" : "demise" };
  const setStyle = (patch: Partial<TextStyle>) => update({ textStyle: { ...style, ...patch } });
  const setOb = (patch: Partial<ObituaryFields>) => update({ obituary: { ...ob, ...patch } });

  useEffect(() => {
    doneRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); document.body.style.overflow = prev; };
  }, [onClose]);

  const reset = () => {
    const base = { photoFrame: DEFAULT_OBITUARY.photoFrame, frameStyle: DEFAULT_OBITUARY.frameStyle, photoCrop: DEFAULT_OBITUARY.photoCrop, photoScale: 1 };
    if (isObit && state.obituary) {
      const next = { ...ob, ...base };
      update({ textStyle: DEFAULT_STYLE, obituary: next, text: composeObituary(next) }); // regenerate the text from the form fields: drops inline edits
    } else update({ textStyle: DEFAULT_STYLE });
  };

  const photoScale = Math.round((ob.photoScale ?? 1) * 100);
  const photoZoom = Math.round(ob.photoCrop.zoom * 100);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="fse-title" className="flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-zinc-100 text-zinc-900 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 bg-white px-4 py-3">
          <h2 id="fse-title" className="font-serif text-lg font-bold">Edit your proof</h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset Layout</Button>
            <button ref={doneRef} type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <Check className="h-4 w-4" aria-hidden="true" /> Done / Save &amp; Close
            </button>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-200"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div role="toolbar" aria-label="Proof formatting" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-zinc-300 bg-zinc-50 px-4 py-2.5">
          <Group label="Text size">
            {([["sm", "Small"], ["md", "Medium"], ["lg", "Large"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={style.size === k} onClick={() => setStyle({ size: k })} className={cn(btn, style.size === k ? active : idle)}>{l}</button>
            ))}
          </Group>
          <Group label="Align">
            {([["left", AlignLeft, "Left"], ["center", AlignCenter, "Center"], ["justify", AlignJustify, "Justify"]] as const).map(([k, Icon, l]) => (
              <button key={k} type="button" aria-label={`Align ${l}`} aria-pressed={style.align === k} onClick={() => setStyle({ align: k })} className={cn(btn, "w-8 px-0", style.align === k ? active : idle)}><Icon className="h-4 w-4" /></button>
            ))}
          </Group>
          {showFrames ? (
            <Group label="Border frame">
              {FRAME_STYLES.map((f) => (
                <button key={f.id} type="button" aria-pressed={ob.frameStyle === f.id} onClick={() => setOb({ frameStyle: f.id as FrameStyle })} className={cn(btn, ob.frameStyle === f.id ? active : idle)}>{f.en}</button>
              ))}
            </Group>
          ) : isText ? (
            <Group label="Border">
              {([["none", "None"], ["single", "Single"], ["double", "Double"]] as const).map(([k, l]) => {
                const on = k === "none" ? !state.enhancements.border : state.enhancements.border && style.borderStyle === k;
                return (
                  <button key={k} type="button" aria-pressed={on} title={k === "none" ? "No border" : "Billed at the published border rate"}
                    onClick={() => (k === "none" ? update({ enhancements: { ...state.enhancements, border: false } }) : update({ enhancements: { ...state.enhancements, border: true }, textStyle: { ...style, borderStyle: k } }))}
                    className={cn(btn, on ? active : idle)}>{l}</button>
                );
              })}
            </Group>
          ) : null}
          {hasPhoto && (
            <>
              <Group label="Photo frame">
                {([["round", "Circular"], ["rect", "Rectangular"]] as const).map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={ob.photoFrame === k} onClick={() => setOb({ photoFrame: k })} className={cn(btn, ob.photoFrame === k ? active : idle)}>{l}</button>
                ))}
              </Group>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Photo size</span>
                <input type="range" min={50} max={150} step={5} value={photoScale} onChange={(e) => setOb({ photoScale: Number(e.target.value) / 100 })} aria-label="Photo size, 50 to 150 percent" />
                <span className="w-10 tabular-nums">{photoScale}%</span>
              </label>
              {state.artwork?.previewUrl || state.artwork?.url ? (
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Zoom in photo</span>
                  <input type="range" min={100} max={300} step={5} value={photoZoom} onChange={(e) => setOb({ photoCrop: { ...ob.photoCrop, zoom: Number(e.target.value) / 100 } })} aria-label="Zoom inside the photo frame" />
                  <span className="w-10 tabular-nums">{photoZoom}%</span>
                </label>
              ) : null}
            </>
          )}
        </div>

        {/* Newsprint canvas: grain plus faint column rules */}
        <div className="flex-1 overflow-auto p-6 sm:p-10 [background-color:#efece2] [background-image:repeating-linear-gradient(to_right,transparent_0,transparent_239px,rgba(0,0,0,0.16)_239px,rgba(0,0,0,0.16)_240px),radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:240px_100%,4px_4px]">
          <div className="mx-auto w-fit max-w-full bg-[#faf8f2] p-6 shadow-[0_6px_24px_rgba(0,0,0,0.25)] ring-1 ring-black/10" style={{ zoom: 1.5 }}>
            <AdRender state={state} editable inlineText toolbar={false} />
          </div>
          <p className="mt-6 text-center text-xs text-zinc-600">
            {isText ? "Click the text to edit it." : isObit && hasPhoto ? "Click any line to edit it. Drag the photo to reposition it; click it to replace." : "Changes here update your booking form and price instantly."}
            {" "}Text size affects the on-screen proof only; the price follows the line count.
          </p>
        </div>
      </div>
    </div>
  );
}

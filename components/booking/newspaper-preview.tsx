"use client";

import { AlignCenter, AlignJustify, AlignLeft, Bold, Italic, Pencil } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { FloralBand } from "./templates/obituary-template";
import { useI18n } from "@/context/language-context";
import type { TextStyle } from "@/lib/booking-store";
import { splitParagraphs } from "@/lib/paragraphs";
import { cn, wrapText } from "@/lib/utils";
import type { Enhancements } from "@/lib/types";

/** Approximate set height of one classified line (7 pt type on 8 pt leading is ~0.28 cm; we allow for rules and leading). */
export const LINE_CM = 0.34;
const HEADER_CM = 0.9;

export interface ProofEditor {
  /** Raw ad text as typed (what the form textarea holds). */
  rawText: string;
  onText: (text: string) => void;
  onStyle: (patch: Partial<TextStyle>) => void;
  onEnhancements: (patch: Partial<Enhancements>) => void;
}

/** Plain-text contentEditable: Enter inserts a line break, nothing else is stored. Mounted only while editing. */
function InlineEditor({ value, onChange, onDone, className }: { value: string; onChange: (v: string) => void; onDone: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(value);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = value;
    last.current = value;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Changes from the form textarea while the box is open (cursor only jumps when the text really differs).
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && value !== last.current) { el.textContent = value; last.current = value; }
  }, [value]);
  return (
    <div
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Edit the ad text in place"
      spellCheck
      onInput={(e) => { const v = (e.currentTarget.textContent ?? "").replace(/\u00a0/g, " "); last.current = v; onChange(v); }}
      onBlur={onDone}
      onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
      className={cn("min-h-[3em] whitespace-pre-wrap outline-2 outline-offset-2 outline-blue-500", className)}
    />
  );
}

const ALIGN = { left: "text-left", center: "text-center", justify: "text-justify" } as const;

/**
 * Live newsprint proof of a classified text ad, set in a Malayalam-capable serif. With an `editor` the text is
 * editable right in the box (click to edit) and a hover toolbar controls bold, italic, alignment and border style.
 * Edits flow back to the form, so the price and line count update as you type.
 */
export function NewspaperPreview({
  text,
  charsPerLine,
  enhancements,
  paperName,
  categoryName,
  minLines,
  colWidthCm = 4,
  textStyle = { italic: false, align: "justify", borderStyle: "single" },
  floralAllowed = false,
  editor,
}: {
  /** Text as it prints (paragraph spacing applied). */
  text: string;
  charsPerLine: number;
  enhancements: Enhancements;
  paperName: string;
  categoryName: string;
  minLines: number;
  colWidthCm?: number;
  textStyle?: TextStyle;
  floralAllowed?: boolean;
  editor?: ProofEditor;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const lines = wrapText(text, charsPerLine);
  const heightCm = Math.round((lines.length * LINE_CM + HEADER_CM) * 10) / 10;
  const bs = textStyle.borderStyle === "floral" && !floralAllowed ? "single" : textStyle.borderStyle;
  const ml = /[\u0D00-\u0D7F]/.test(text);

  const tool = "flex h-7 w-7 items-center justify-center rounded text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-100 dark:hover:bg-white/15";
  const on = "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white";

  return (
    <figure aria-label="Newspaper column preview" className="group/proof relative mx-auto w-fit max-w-full">
      {editor && (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200">
            <Pencil className="h-3 w-3" aria-hidden="true" /> Click anywhere inside to edit / നേരിട്ട് തിരുത്താം
          </span>
        </div>
      )}
      {editor && (
        <div role="toolbar" aria-label="Text formatting" className="mb-2 flex flex-wrap items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-sm transition-opacity dark:border-slate-700 dark:bg-slate-800 [@media(hover:hover)]:opacity-40 [@media(hover:hover)]:group-focus-within/proof:opacity-100 [@media(hover:hover)]:group-hover/proof:opacity-100">
          <button type="button" aria-label="Bold (billed +15%)" title="Bold: +15% of the text charge" aria-pressed={enhancements.bold} onClick={() => editor.onEnhancements({ bold: !enhancements.bold })} className={cn(tool, enhancements.bold && on)}><Bold className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Italic" title="Italic" aria-pressed={textStyle.italic} onClick={() => editor.onStyle({ italic: !textStyle.italic })} className={cn(tool, textStyle.italic && on)}><Italic className="h-3.5 w-3.5" /></button>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
          {([["left", AlignLeft], ["center", AlignCenter], ["justify", AlignJustify]] as const).map(([a, Icon]) => (
            <button key={a} type="button" aria-label={`Align ${a}`} title={`Align ${a}`} aria-pressed={textStyle.align === a} onClick={() => editor.onStyle({ align: a })} className={cn(tool, textStyle.align === a && on)}><Icon className="h-3.5 w-3.5" /></button>
          ))}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
          {([["none", "None"], ["single", "Single"], ["double", "Double"], ...(floralAllowed ? [["floral", "Floral"]] : [])] as [string, string][]).map(([k, label]) => {
            const active = k === "none" ? !enhancements.border : enhancements.border && bs === k;
            return (
              <button key={k} type="button" aria-pressed={active} title={k === "none" ? "No border" : `${label} border: +25% of the text charge`} onClick={() => (k === "none" ? editor.onEnhancements({ border: false }) : (editor.onEnhancements({ border: true }), editor.onStyle({ borderStyle: k as TextStyle["borderStyle"] })))} className={cn(tool, "w-auto px-1.5 text-[10px] font-bold uppercase", active && on)}>{label}</button>
            );
          })}
        </div>
      )}

      {/* Newsprint box: publication rules, column margins, dimension tags on the border */}
      <div className="relative">
        <span className="absolute -top-2.5 left-3 z-10 bg-[#FBF8F1] px-1.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-[#1E2430] dark:text-slate-200">Width: {colWidthCm} cm</span>
        <span className="absolute -top-2.5 right-3 z-10 whitespace-nowrap bg-[#FBF8F1] px-1.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-[#1E2430] dark:text-slate-200">Height: ≈{heightCm} cm</span>
        <div className="font-serif relative rounded-sm border-2 border-slate-900/80 bg-[#FBF8F1] p-4 tracking-tight text-slate-900 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] dark:border-slate-300 dark:bg-[#1E2430] dark:text-slate-100 dark:shadow-[3px_3px_0px_rgba(255,255,255,0.18)]" style={{ fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", Georgia, serif' }}>
          <div className="mb-2 border-y-[3px] border-double border-slate-800 py-1 text-center dark:border-slate-300">
            <p className="text-base font-bold tracking-tight">{paperName}</p>
            <p className="text-[10px] font-semibold uppercase">{t("Classifieds")} · {categoryName}</p>
          </div>
          <div className="relative mx-auto px-3 py-2 text-[14px] leading-tight" style={{ width: `min(100%, ${(charsPerLine * 0.68 + 1.5).toFixed(1)}em)` }}>
            {enhancements.tint && <span aria-hidden="true" className="absolute inset-0 bg-amber-200/80 dark:bg-amber-400/25" />}
            {enhancements.border && (
              <span aria-hidden="true" className={cn("absolute inset-0 border-slate-900 dark:border-slate-200", bs === "double" ? "border-[5px] border-double" : "border-2")} />
            )}
            {enhancements.border && bs === "floral" && <><FloralBand className="absolute inset-x-0 -top-1.5" /><FloralBand className="absolute inset-x-0 -bottom-1.5" /></>}
            <div lang={ml ? "ml" : "en"} className={cn("relative transition-[font-weight] duration-300", ALIGN[textStyle.align], "hyphens-auto [overflow-wrap:anywhere]", enhancements.bold && "font-bold", textStyle.italic && "italic")}>
              {editor && editing ? (
                <InlineEditor value={editor.rawText} onChange={editor.onText} onDone={() => setEditing(false)} />
              ) : lines.length === 0 ? (
                <p
                  className={cn("text-zinc-400 italic", editor && "cursor-text")}
                  {...(editor ? { role: "button", tabIndex: 0, onClick: () => setEditing(true), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") setEditing(true); } } : {})}
                >{t("Your ad appears here as you type…")}</p>
              ) : (
                <div
                  className={cn(editor && "cursor-text rounded-sm hover:bg-blue-500/5 focus-visible:outline-2 focus-visible:outline-blue-500")}
                  {...(editor ? { role: "button", tabIndex: 0, "aria-label": "Edit the ad text in place", onClick: () => setEditing(true), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") setEditing(true); } } : {})}
                >
                  {splitParagraphs(text).map((para, i) =>
                    para.trim() ? <p key={i} className="mb-1.5 whitespace-pre-wrap last:mb-0">{para}</p> : <div key={i} aria-hidden="true" className="h-3" />,
                  )}
                </div>
              )}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 border-t-[3px] border-double border-slate-800 dark:border-slate-300" />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-500">
        {t("Set at {cpl} characters per line · {n} lines (minimum {min} billed)", { cpl: charsPerLine, n: lines.length, min: minLines })}
      </figcaption>
    </figure>
  );
}

/** Proportional preview of a display ad. */
export function DisplayPreview({
  columns,
  heightCm,
  colWidthCm,
  colorMode,
  imageUrl,
  artworkName,
}: {
  columns: number;
  heightCm: number;
  colWidthCm: number;
  colorMode: "bw" | "color";
  imageUrl?: string;
  artworkName?: string;
}) {
  const { t } = useI18n();
  const w = columns * colWidthCm;
  const h = Number.isFinite(heightCm) ? Math.max(heightCm, 1) : 10;
  const maxW = 280;
  const scale = Math.min(maxW / w, 360 / h);
  return (
    <figure aria-label="Display ad size preview" className="mx-auto w-fit max-w-full">
      <div className="newsprint-texture rounded-sm border border-zinc-400/70 p-4 shadow-sm">
        <div
          className="relative flex items-center justify-center overflow-hidden border-2 border-zinc-800 bg-white"
          style={{ width: w * scale, height: h * scale }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Uploaded artwork" className={cn("h-full w-full object-cover", colorMode === "bw" && "grayscale")} />
          ) : (
            <p className={cn("px-2 text-center text-xs text-zinc-500", colorMode === "color" && "text-navy-600")}>
              {artworkName ? `${artworkName} (no preview)` : t("Artwork placeholder")}
            </p>
          )}
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-slate-200">
        {t("{c} col × {h} cm = {a} cm² · {mode}", { c: columns, h, a: (w * h).toFixed(1), mode: colorMode === "color" ? t("Full colour") : t("Black & white") })}
      </figcaption>
    </figure>
  );
}

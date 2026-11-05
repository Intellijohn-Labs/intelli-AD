"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { useI18n } from "@/context/language-context";
import { cn, wrapText } from "@/lib/utils";
import type { Enhancements } from "@/lib/types";

/** Live newsprint column preview of a classified text ad, set in a Malayalam print face. */
export function NewspaperPreview({
  text,
  charsPerLine,
  enhancements,
  paperName,
  categoryName,
  minLines,
}: {
  text: string;
  charsPerLine: number;
  enhancements: Enhancements;
  paperName: string;
  categoryName: string;
  minLines: number;
}) {
  const { t } = useI18n();
  const lines = wrapText(text, charsPerLine);
  const controls = useAnimationControls();
  const first = useRef(true);

  // Subtle pulse whenever the ad matter changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    controls.start({ scale: [1, 1.012, 1], transition: { type: "tween", duration: 0.28 } });
  }, [text, controls]);

  return (
    <figure aria-label="Newspaper column preview" className="mx-auto w-fit max-w-full">
      <motion.div animate={controls} className="preview-paper font-clipping relative border-2 border-dashed border-zinc-400 px-4 pt-3 pb-5 text-zinc-900 shadow-md dark:border-slate-600 dark:bg-[#1e293b] dark:text-zinc-100">
        <div className="mb-2 border-y border-zinc-800 py-0.5 text-center">
          <p className="text-sm font-bold">{paperName}</p>
          <p className="text-[10px] font-semibold uppercase">{t("Classifieds")} · {categoryName}</p>
        </div>
        <div className="relative p-3 text-[14px] leading-[1.65]" style={{ width: `min(100%, ${(charsPerLine * 0.68 + 1.5).toFixed(1)}em)` }}>
          <AnimatePresence>
            {enhancements.tint && (
              <motion.span key="tint" aria-hidden="true" className="absolute inset-0 origin-left bg-amber-200/80 dark:bg-amber-400/25" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {enhancements.border && (
              <motion.span key="border" aria-hidden="true" className="absolute inset-0 border-2 border-zinc-900" initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 420, damping: 26 }} />
            )}
          </AnimatePresence>
          <div className={cn("relative transition-[font-weight] duration-300", enhancements.bold && "font-bold")}>
            {lines.length === 0 ? (
              <p className="text-zinc-400 italic">{t("Your ad appears here as you type…")}</p>
            ) : (
              lines.map((l, i) => (
                <div key={i} className="whitespace-pre">
                  {l || " "}
                  {i >= minLines && <span className="sr-only"> (extra line)</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
      <figcaption className="mt-2 text-center text-xs text-zinc-500">
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
      <div className="newsprint-texture rounded-sm border border-zinc-400/70 p-4 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.4)]">
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
      <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {t("{c} col × {h} cm = {a} cm² · {mode}", { c: columns, h, a: (w * h).toFixed(1), mode: colorMode === "color" ? t("Full colour") : t("Black & white") })}
      </figcaption>
    </figure>
  );
}

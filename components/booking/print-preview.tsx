"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NATURAL_W = 340; // px width the template content is laid out at before being scaled into the box

/**
 * To-scale newsprint preview: shows the ad as a width × height cm box sitting in the publication's
 * column grid, with rulers, so the advertiser sees the physical footprint before paying.
 * Template content is laid out at a fixed natural width and scaled to fit the box; if it would
 * overflow, a warning says by how much.
 */
export function PrintPreview({
  widthCm,
  heightCm,
  colWidthCm,
  paperName,
  colorMode,
  imageUrl,
  fileName,
  children,
  stretch = false,
}: {
  widthCm: number;
  heightCm: number;
  colWidthCm: number;
  paperName: string;
  colorMode: "bw" | "color";
  imageUrl?: string;
  fileName?: string;
  /** Template content (omit to show an uploaded creative instead). */
  children?: ReactNode;
  /** Template content grows to fill the whole box height (flex column), so it can centre itself vertically. */
  stretch?: boolean;
}) {
  const w = Number.isFinite(widthCm) && widthCm > 0 ? widthCm : colWidthCm;
  const h = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 5;
  const cols = Math.max(1, Math.ceil(w / colWidthCm - 0.01));
  const stripCols = Math.max(cols + 1, 3); // show at least a full page-width strip around the ad
  const stripW = Math.max(stripCols * colWidthCm, w + colWidthCm);
  const stripH = h + 2;
  // Fit the strip into ~300 × 460 px.
  const scale = Math.min(300 / stripW, 460 / stripH);
  const px = (cm: number) => cm * scale;

  const inner = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(0);
  const fit = px(w) / NATURAL_W;
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.offsetHeight));
    ro.observe(el);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentH(el.offsetHeight);
    return () => ro.disconnect();
  }, [children]);
  const usedCm = children ? (contentH * fit) / scale : 0;
  const overflowCm = usedCm - h;

  return (
    <figure aria-label={`To-scale print preview, ${w} by ${h} centimetres`} className="mx-auto w-fit max-w-full">
      <div className="flex gap-1.5">
        <div className="flex flex-col items-center">
          <div style={{ width: px(stripW) }} className="mb-1 flex justify-between font-mono text-[9px] text-zinc-500" aria-hidden="true">
            <span>0</span><span>{stripW.toFixed(0)} cm</span>
          </div>
          <div className="paper-grain relative border border-zinc-400/70 bg-[#faf8f5] shadow-sm" style={{ width: px(stripW) + 16, height: px(stripH) + 28, padding: 8 }}>
            <p className="mb-1 truncate text-center font-mono text-[8px] font-bold uppercase tracking-widest text-zinc-500">{paperName} · actual column grid</p>
            <div className="relative" style={{ width: px(stripW), height: px(stripH) }}>
              {/* column rules */}
              {Array.from({ length: Math.floor(stripW / colWidthCm) + 1 }, (_, i) => (
                <span key={i} aria-hidden="true" className="absolute top-0 h-full border-l border-dashed border-zinc-300" style={{ left: px(i * colWidthCm) }} />
              ))}
              {/* neighbouring copy, as grey text bars */}
              <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(#d4d4d8 0 2px, transparent 2px 7px)" }} />
              {/* the ad */}
              <div className={cn("absolute top-0 left-0 overflow-hidden border-2 bg-white shadow-md", overflowCm > 0.05 ? "border-red-600" : "border-zinc-900")} style={{ width: px(w), height: px(h) }}>
                {children ? (
                  <div ref={inner} className={cn("origin-top-left", stretch && "flex flex-col", colorMode === "bw" && "grayscale")} style={{ width: NATURAL_W, transform: `scale(${fit})`, minHeight: stretch ? Math.max(0, px(h) - 4) / fit : undefined }}>
                    {children}
                  </div>
                ) : imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Uploaded creative" className={cn("h-full w-full object-contain", colorMode === "bw" && "grayscale")} />
                ) : (
                  <p className="flex h-full items-center justify-center px-2 text-center text-[11px] text-zinc-500">{fileName ? `${fileName} (preview unavailable for this format)` : "Your creative appears here"}</p>
                )}
              </div>
              {/* dimension tags */}
              <span aria-hidden="true" className="absolute -bottom-4 left-0 font-mono text-[9px] font-bold text-zinc-800" style={{ width: px(w) }}>
                <span className="block border-t border-zinc-800 pt-px text-center">{w} cm</span>
              </span>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="flex items-center font-mono text-[9px] font-bold text-zinc-600" style={{ writingMode: "vertical-rl" }}>{h} cm</div>
      </div>
      <figcaption className="mt-3 space-y-0.5 text-center text-xs text-zinc-500">
        <p>{w} × {h} cm = {(w * h).toFixed(1)} cm² · {cols} column{cols > 1 ? "s" : ""} wide · shown to scale on {paperName} newsprint</p>
        {overflowCm > 0.05 && <p className="font-semibold text-red-700 dark:text-red-300">Content is about {overflowCm.toFixed(1)} cm taller than the box. Choose a taller size or shorten the text.</p>}
      </figcaption>
    </figure>
  );
}

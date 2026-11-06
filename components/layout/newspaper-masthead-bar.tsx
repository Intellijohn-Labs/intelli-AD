"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, type CSSProperties } from "react";
import { brandFor } from "@/data/brand-colors";
import { getNewspaper } from "@/data/newspapers";
import { useI18n } from "@/context/language-context";
import { usePublication } from "@/lib/publication";
import { cn } from "@/lib/utils";

/**
 * Stylised wordmarks set in different Malayalam display faces. These are typographic
 * approximations, not the publishers' registered logos.
 */
const MASTHEADS: { id: string; style: CSSProperties }[] = [
  { id: "malayala-manorama", style: { fontFamily: '"Noto Serif Malayalam", serif', fontWeight: 800, WebkitTextStroke: "0.6px currentColor" } },
  { id: "mathrubhumi", style: { fontFamily: '"Baloo Chettan 2", sans-serif', fontWeight: 800 } },
  { id: "deshabhimani", style: { fontFamily: '"Anek Malayalam", sans-serif', fontWeight: 800 } },
  { id: "madhyamam", style: { fontFamily: "Manjari, sans-serif", fontWeight: 700 } },
  { id: "kerala-kaumudi", style: { fontFamily: '"Noto Serif Malayalam", serif', fontWeight: 700, fontStyle: "italic" } },
  { id: "siraj", style: { fontFamily: "Chilanka, cursive", fontWeight: 400 } },
  { id: "janmabhumi", style: { fontFamily: "Gayathri, sans-serif", fontWeight: 700 } },
  { id: "chandrika", style: { fontFamily: '"Meera Inimai", sans-serif', fontWeight: 400 } },
  { id: "mangalam", style: { fontFamily: '"Anek Malayalam", sans-serif', fontWeight: 500, letterSpacing: "0.01em" } },
  { id: "suprabhaatham", style: { fontFamily: '"Noto Sans Malayalam", sans-serif', fontWeight: 800 } },
];

export function NewspaperMastheadBar() {
  const { activeId, setActive } = usePublication();
  const { t } = useI18n();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Keep the active masthead visible when it changes from elsewhere on the page.
  useEffect(() => {
    refs.current[activeId]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div id="publication-bar" className="sticky top-[68px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-[#2a2b30] dark:bg-[#121316]/95">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-6 py-3 md:px-12">
        <span className="hidden shrink-0 font-mono text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase lg:block">{t("Publication")}</span>
        {/* Tactile publication chips: white pills; the chosen paper becomes a solid ink pill with a sliding highlight. */}
        <div
          role="radiogroup"
          aria-label="Select publication"
          className="no-scrollbar -my-1 flex min-w-0 flex-1 touch-pan-x snap-x snap-proximity items-center gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)]"
          style={{ scrollbarWidth: "none" }}
        >
          {MASTHEADS.map(({ id, style }) => {
            const paper = getNewspaper(id);
            if (!paper) return null;
            const active = id === activeId;
            const brand = brandFor(id).primary;
            return (
              <button
                key={id}
                ref={(el) => {
                  refs.current[id] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={paper.name}
                title={paper.name}
                onClick={() => setActive(id)}
                className={cn(
                  "relative flex shrink-0 snap-center items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap antialiased transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500",
                  active
                    ? "border-transparent text-white dark:text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-slate-400 dark:border-[#2a2b30] dark:bg-[#1a1b1f] dark:text-[#d6d7db] dark:hover:border-[#5c5d64]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="activePublicationIndicator"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-slate-900 shadow-sm ring-2 ring-slate-900/10 dark:bg-[#eaeaea] dark:ring-white/10"
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  />
                )}
                {/* Mini masthead badge in the paper's own colour (typographic, not the registered logo) */}
                <span
                  aria-hidden="true"
                  className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] leading-none font-extrabold text-white ring-1 ring-white/30"
                  style={{ background: brand, ...style, fontWeight: 800, fontStyle: "normal", letterSpacing: 0, WebkitTextStroke: undefined }}
                >
                  {Array.from(paper.nameMl)[0]}
                </span>
                <span className="relative" style={{ ...style, fontWeight: active ? 800 : 600, letterSpacing: "normal", WebkitTextStroke: undefined }}>{paper.nameMl}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

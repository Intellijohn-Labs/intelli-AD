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
    <div className="sticky top-16 z-30 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <span className="hidden shrink-0 text-[11px] font-bold tracking-[0.18em] text-zinc-500 uppercase lg:block">{t("Publication")}</span>
        {/* Capsule track: the soft backdrop stays put while the tabs inside scroll under faded edges. */}
        {/* NB: the app's dark mode inverts the zinc scale, so dark-mode colours here are explicit hex (real zinc-300/800/900…). */}
        <div className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-100/80 px-2 py-1.5 backdrop-blur-md dark:border-[#27272a] dark:bg-[rgba(24,24,27,0.8)]">
          <div
            role="radiogroup"
            aria-label="Select publication"
            className="no-scrollbar -my-2 flex touch-pan-x snap-x snap-proximity items-center gap-2 overflow-x-auto px-1 py-2 overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-24px),transparent)]"
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
                    "relative flex shrink-0 snap-center items-center gap-2 rounded-xl whitespace-nowrap antialiased transition-all duration-200 ease-out will-change-transform focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-500",
                    active
                      ? "z-10 -translate-y-0.5 scale-105 px-5 py-2.5 text-base font-bold text-[#09090b] dark:text-white"
                      : "scale-100 px-4 py-2 text-sm font-semibold text-[#52525b] opacity-80 hover:bg-white/60 hover:text-[#09090b] hover:opacity-100 dark:text-[#d4d4d8] dark:hover:bg-[rgba(63,63,70,0.5)] dark:hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="activePublicationIndicator"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl border border-transparent bg-[#ffffff] shadow-lg shadow-black/10 ring-1 ring-black/5 dark:border-[#3f3f46] dark:bg-[#27272a] dark:shadow-black/40 dark:ring-0"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {/* Miniature monogram (typographic, not the registered logo). Dark mode swaps the deep brand colour for a light tint of it. */}
                  <span
                    aria-hidden="true"
                    className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--b)] text-[13px] leading-none font-extrabold text-white dark:bg-[color-mix(in_srgb,var(--b)_40%,white)] dark:text-[#0f172a]"
                    style={{ "--b": brand, ...style, fontWeight: 800, fontStyle: "normal", letterSpacing: 0, WebkitTextStroke: undefined } as CSSProperties}
                  >
                    {Array.from(paper.nameMl)[0]}
                  </span>
                  <span className="relative" style={{ ...style, fontWeight: active ? 800 : 600, letterSpacing: "normal", WebkitTextStroke: undefined }}>
                    {paper.nameMl}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

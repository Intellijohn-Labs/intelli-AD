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
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <span className="hidden shrink-0 text-[11px] font-bold tracking-[0.18em] text-zinc-500 uppercase lg:block">{t("Publication")}</span>
        <div
          role="radiogroup"
          aria-label="Select publication"
          className="scrollbar-none flex flex-1 snap-x items-center gap-1 overflow-x-auto py-2 [mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-20px),transparent)]"
          style={{ scrollbarWidth: "none" }}
        >
          {MASTHEADS.map(({ id, style }) => {
            const paper = getNewspaper(id);
            if (!paper) return null;
            const active = id === activeId;
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
                style={{ color: brandFor(id).primary, "--c": brandFor(id).primary } as CSSProperties}
                className={cn(
                  "relative shrink-0 snap-center rounded-lg px-3 py-1.5 text-[19px] leading-tight whitespace-nowrap transition-all hover:opacity-100 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--c)_28%,transparent)]",
                  active ? "scale-105 opacity-100 shadow-[0_0_20px_color-mix(in_srgb,var(--c)_28%,transparent)]" : "opacity-70",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-masthead-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-0 rounded-lg border bg-[color-mix(in_srgb,var(--c)_9%,white)] shadow-xs"
                    style={{ borderColor: `color-mix(in srgb, ${brandFor(id).primary} 30%, transparent)` }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative" style={{ ...style, letterSpacing: style.letterSpacing ?? "normal" }}>
                  {paper.nameMl}
                </span>
                {active && <motion.span aria-hidden="true" layoutId="active-masthead-rule" className="absolute right-3 bottom-0.5 left-3 h-0.5 rounded" style={{ background: `linear-gradient(90deg, ${brandFor(id).primary}, ${brandFor(id).accent})` }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

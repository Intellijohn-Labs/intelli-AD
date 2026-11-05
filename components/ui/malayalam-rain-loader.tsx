"use client";

import { animate, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Logo spring settles ≈0.6s after assembly, then a 0.8s static hold, then the overlay fades out.
const HOLD_MS = 1400;
const FALL_S = 2.4;
const STAGGER_S = 0.2;

/** "നമസ്കാരം" (Namaskaram), one glyph cluster per entry, each with its own colour + glow. */
const GLYPHS = [
  { ch: "ന", color: "#38bdf8", glow: "56,189,248" }, // sky blue
  { ch: "മ", color: "#fbbf24", glow: "251,191,36" }, // warm gold
  { ch: "സ്കാ", color: "#fb7185", glow: "251,113,133" }, // rose / coral
  { ch: "രം", color: "#a855f7", glow: "168,85,247" }, // electric violet
];
const glow = (rgb: string) => `drop-shadow(0 0 14px rgba(${rgb},0.5))`;

/**
 * One glyph. Phase 1: fall slowly from above the viewport with a little sideways drift.
 * Phase 2: spring-snap into its slot in the row. After that it stays completely static
 * (no loops, pulses or glow waves).
 */
function Glyph({ index, onSettled }: { index: number; onSettled: () => void }) {
  const g = GLYPHS[index];
  const ref = useRef<HTMLSpanElement>(null);
  const [from] = useState(() => ({
    y: -(window.innerHeight * 0.82) - 120, // start above the viewport (row sits at bottom: 18%)
    drift: (Math.random() - 0.5) * 90,
  }));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    (async () => {
      // Phase 1: slow fall, ending just above the row and slightly off to the side
      await animate(el, { y: -44, x: from.drift * 0.5, opacity: 1 }, { delay: index * STAGGER_S, duration: FALL_S, ease: [0.25, 0.6, 0.35, 1] });
      if (cancelled) return;
      // Phase 2: magnetic snap into place
      await animate(el, { x: 0, y: 0 }, { type: "spring", stiffness: 120, damping: 14 });
      if (!cancelled && index === GLYPHS.length - 1) onSettled();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      className="inline-block text-5xl leading-tight font-black tracking-normal select-none sm:text-7xl"
      style={{ color: g.color, filter: glow(g.glow), fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' }}
      initial={{ y: from.y, x: from.drift, opacity: 0 }}
    >
      {g.ch}
    </motion.span>
  );
}

/**
 * Full-screen post-login celebration (rendered by AuthProvider right after sign-in).
 * Letters fall once, snap together as "നമസ്കാരം", hold ~0.9s, then the overlay fades out and unmounts.
 */
export function MalayalamRainLoader({ onComplete }: { onComplete: () => void }) {
  const [assembled, setAssembled] = useState(false);
  // Keep the latest callback in a ref so a parent re-render can never restart the timer.
  const done = useRef(onComplete);
  useEffect(() => { done.current = onComplete; });

  useEffect(() => {
    if (!assembled) return;
    const id = setTimeout(() => done.current(), HOLD_MS);
    return () => clearTimeout(id);
  }, [assembled]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] overflow-hidden bg-slate-950"
      exit={{ opacity: 0, pointerEvents: "none" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      role="dialog"
      aria-label="Namaskaram. Welcome to IntelliAd"
    >
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-indigo-500/15 to-transparent" />

      <button
        type="button"
        onClick={onComplete}
        className="absolute top-4 right-4 z-10 rounded px-2 py-1 text-xs text-slate-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-400"
      >
        Skip
      </button>

      <div className="absolute inset-x-0 bottom-[18%] flex flex-col items-center px-4">
        {/* Logo is hidden while the letters fall and pops in the instant "നമസ്കാരം" locks together. */}
        <motion.div
          className="relative mb-6 sm:mb-8"
          initial={{ opacity: 0, scale: 0.85, y: -20 }}
          animate={assembled ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.85, y: -20 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.div
            animate={assembled ? { filter: ["drop-shadow(0 0 4px rgba(99,102,241,0.3))", "drop-shadow(0 0 26px rgba(99,102,241,0.95))", "drop-shadow(0 0 14px rgba(99,102,241,0.6))"] } : undefined}
            transition={{ duration: 0.7, times: [0, 0.4, 1], ease: "easeOut" }} // single flash, then static
            style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.3))" }}
          >
            <Image src="/images/intelliad-icon.png" alt="" width={600} height={540} priority className="h-16 w-auto sm:h-20" />
          </motion.div>
          {/* One light streak sweeping across the mark, clipped to the icon's shape */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ WebkitMaskImage: "url(/images/intelliad-icon.png)", maskImage: "url(/images/intelliad-icon.png)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}
          >
            <motion.div
              className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent"
              initial={{ x: "-120%" }}
              animate={assembled ? { x: "260%" } : { x: "-120%" }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
        <div className="flex items-end justify-center gap-4 sm:gap-6" role="img" aria-label="നമസ്കാരം">
          {GLYPHS.map((_, i) => (
            <Glyph key={i} index={i} onSettled={() => setAssembled(true)} />
          ))}
        </div>
        <motion.p
          role="status"
          className="mt-3 text-xs font-medium tracking-[0.25em] text-slate-300 uppercase sm:text-sm"
          initial={{ opacity: 0, y: 8 }} animate={assembled ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }} transition={{ duration: 0.6 }}
        >
          Welcome to IntelliAd
        </motion.p>
      </div>
    </motion.div>
  );
}

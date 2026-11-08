"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { useEffect, useRef, type PointerEvent } from "react";
import { cn, wrapText } from "@/lib/utils";

const CPL = 30; // characters per line
const LOOP_SECONDS = 30; // time for one full pass of the (duplicated) strip, right to left

interface Ad { category: string; paper: keyof typeof PAPERS; text: string; boxed?: boolean; bold?: boolean }

/** Stylised typographic mastheads (not the publishers' registered logos), as in the masthead bar. */
const PAPERS = {
  manorama: { label: "മലയാള മനോരമ", style: { fontFamily: '"Noto Serif Malayalam", serif', fontWeight: 800 } as CSSProperties },
  mathrubhumi: { label: "മാതൃഭൂമി", style: { fontFamily: '"Baloo Chettan 2", sans-serif', fontWeight: 800 } as CSSProperties },
  madhyamam: { label: "മാധ്യമം", style: { fontFamily: "Manjari, sans-serif", fontWeight: 700 } as CSSProperties },
  kaumudi: { label: "കേരള കൗമുദി", style: { fontFamily: '"Noto Serif Malayalam", serif', fontWeight: 700, fontStyle: "italic" } as CSSProperties },
  deshabhimani: { label: "ദേശാഭിമാനി", style: { fontFamily: '"Anek Malayalam", sans-serif', fontWeight: 800 } as CSSProperties },
};
const TILTS = [-1, 1, -0.8, 1.2, -1.2, 0.8];

/** Sample classifieds (fictional names, numbers and addresses). */
const ADS: Ad[] = [
  {
    category: "Matrimonial", paper: "manorama",
    boxed: true,
    text: "ഹിന്ദു, നായർ, 28/175cm, B.Tech, MNC സോഫ്റ്റ്‌വെയർ എൻജിനീയർ (Kochi), അനുയോജ്യരായ ബിരുദധാരികളായ യുവതികളുടെ രക്ഷിതാക്കളിൽ നിന്നും ആലോചനകൾ ക്ഷണിക്കുന്നു. Ph: 98xxx xxx01",
  },
  {
    category: "Matrimonial", paper: "mathrubhumi",
    text: "Proposals invited for Syrian Christian girl, 27/162cm, MBBS, MD (Radiology), doctor in Ernakulam. Seeking well-settled professional match from decent family. Contact: 94xxx xxx02",
  },
  {
    category: "Property", paper: "mathrubhumi",
    boxed: true,
    bold: true,
    text: "FOR SALE: 3 BHK independent villa, 5.5 cents, Kakkanad, Kochi. 2,150 sq.ft, car porch, 5 mins from Infopark. Genuine buyers only, no brokers. Call: 99xxx xxx03",
  },
  {
    category: "Recruitment", paper: "madhyamam",
    text: "WANTED: Senior React / Next.js Developers (3+ yrs) and Graphic Designers for a Kochi-based digital agency. Hybrid, competitive pay. Send CV to careers@agency.example",
  },
  {
    category: "Gazette Notice", paper: "kaumudi",
    boxed: true,
    text: "I, Aswin Raj S/o Rajan K, residing at Thrikkakara, Ernakulam, hereby declare that my name has been changed to ASWIN RAJAN K vide Affidavit No. 4821/2026 before the Notary Public, Ernakulam.",
  },
  {
    category: "Business Notice", paper: "deshabhimani",
    text: "NOTICE: The partnership firm M/s Nair & Menon Traders, Edappally, stands dissolved w.e.f. 01-11-2026 by mutual consent. Our shop shifts to Vyttila Hub, Kochi. Clients kindly note.",
  },
];

/** Glossy metal paper clip: silver gradient wire with a bright highlight and a soft cast shadow. */
function MetalClip() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 48" className="absolute -top-5 right-5 h-11 w-6 rotate-12 drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]">
      <defs>
        <linearGradient id="clip-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="0.35" stopColor="#94a3b8" /><stop offset="0.6" stopColor="#e2e8f0" /><stop offset="1" stopColor="#64748b" /></linearGradient>
      </defs>
      <path d="M8 34V12a5 5 0 0 1 10 0v26a8 8 0 0 1-16 0V16" fill="none" stroke="url(#clip-metal)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 33V13a5 5 0 0 1 3-4.6" fill="none" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** One newspaper cut-piece: tilted newsprint scrap with tape or a paper clip, masthead badge, category tag and line count. */
function Clipping({ ad, index }: { ad: Ad; index: number }) {
  const lines = wrapText(ad.text, CPL);
  const paper = PAPERS[ad.paper];
  return (
    // paper-grain keeps the slip warm newsprint with dark ink in BOTH themes (and restores the light colour scale inside it).
    <article
      className="paper-grain relative w-60 min-w-[240px] rounded-sm border border-dashed border-amber-900/30 bg-[#FFFDF7] p-3 pt-6 text-slate-900 shadow-md sm:w-[300px] sm:min-w-[300px] sm:p-4 sm:pt-6"
      style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
    >
      {index % 2 === 0 ? (
        /* pastel yellow masking tape, translucent with torn-looking ends */
        <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 border-x border-dashed border-yellow-400/60 bg-gradient-to-b from-yellow-100/95 to-yellow-300/85 shadow-[0_2px_4px_rgba(120,80,0,0.25)]" />
      ) : (
        <MetalClip />
      )}
      <div className="font-typeset">
        <div className="flex items-center justify-between gap-2 border-y border-slate-800 py-1">
          <span className="text-sm leading-tight font-bold text-[#0f172a]" style={paper.style}>{paper.label}</span>
          <span className="border border-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800 uppercase">{ad.category}</span>
        </div>
        <div className={cn("mt-2 p-2 text-xs leading-snug break-words text-slate-900 sm:text-sm", ad.boxed && "border-2 border-slate-900", ad.bold && "font-bold")}>
          {/* CSS wraps the text to the card width; the footer below reports the billed line count at CPL chars/line. */}
          {ad.text}
        </div>
        <p className="mt-3 border-t border-slate-300 pt-1 text-right font-mono text-[10px] text-slate-600">{lines.length} lines · {CPL} chars/line</p>
      </div>
    </article>
  );
}

/**
 * Horizontal marquee of newspaper clippings moving right to left on a seamless loop.
 * Hover or keyboard focus pauses it; with reduced motion it becomes a plain scrollable strip.
 */
export function AdTicker() {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resume = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resume.current), []);

  useAnimationFrame((_, delta) => {
    const el = track.current;
    if (reduce || paused.current || !el) return;
    const loop = el.scrollWidth / 2; // the strip is rendered twice
    if (!loop) return;
    let next = x.get() - ((loop / LOOP_SECONDS) * Math.min(delta, 50)) / 1000; // constant linear speed
    if (next <= -loop) next += loop;
    x.set(next);
  });

  const set = (v: boolean) => { clearTimeout(resume.current); paused.current = v; };
  // Mouse: pause while hovering. Touch: pause while pressed, and stay paused 3s after a tap so it can be read.
  const pointer = {
    onPointerEnter: (e: PointerEvent) => { if (e.pointerType === "mouse") set(true); },
    onPointerLeave: (e: PointerEvent) => { if (e.pointerType === "mouse") set(false); },
    onPointerDown: (e: PointerEvent) => { if (e.pointerType !== "mouse") set(true); },
    onPointerUp: (e: PointerEvent) => { if (e.pointerType !== "mouse") { clearTimeout(resume.current); resume.current = setTimeout(() => { paused.current = false; }, 3000); } },
    onPointerCancel: (e: PointerEvent) => { if (e.pointerType !== "mouse") set(false); }, // browser took over for page scroll
  };

  return (
    <figure aria-label="Sample newspaper classifieds" className="w-full">
      <div
        tabIndex={0}
        aria-label="Classified ad clippings. Scrolling pauses on hover, tap or focus."
        {...pointer} onFocus={() => set(true)} onBlur={() => set(false)}
        className={cn("relative block w-0 max-w-full min-w-full touch-pan-y py-4 focus-visible:outline-2 focus-visible:outline-navy-500", reduce ? "overflow-x-auto" : "overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]")}
      >
        <motion.div ref={track} style={{ x: reduce ? 0 : x }} className="flex w-max items-start will-change-transform">
          {ADS.map((ad, i) => <div key={i} className="shrink-0 pr-3 sm:pr-4"><Clipping ad={ad} index={i} /></div>)}
          {!reduce && ADS.map((ad, i) => <div key={`dup-${i}`} aria-hidden="true" className="shrink-0 pr-3 sm:pr-4"><Clipping ad={ad} index={i} /></div>)}
        </motion.div>
      </div>
      <figcaption className="mt-1 text-center text-xs text-zinc-500">Sample ads · hover or tap to pause</figcaption>
    </figure>
  );
}

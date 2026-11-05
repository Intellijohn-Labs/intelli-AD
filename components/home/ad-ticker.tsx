"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import { Paperclip } from "lucide-react";
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
const TILTS = [-1.5, 1.2, -0.8, 1.6, -1.1, 0.9];

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

/** One newspaper cut-piece: tilted newsprint scrap with tape or a paper clip, masthead badge, category tag and line count. */
function Clipping({ ad, index }: { ad: Ad; index: number }) {
  const lines = wrapText(ad.text, CPL);
  const paper = PAPERS[ad.paper];
  return (
    <article
      className="relative w-60 min-w-[240px] border border-dashed border-zinc-400 bg-[#faf8f5] p-3 pt-6 text-zinc-900 sm:w-[300px] sm:min-w-[300px] sm:p-4 sm:pt-6 shadow-[2px_4px_12px_rgba(0,0,0,0.08)] dark:border-slate-700 dark:bg-slate-900/90 dark:text-zinc-100"
      style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
    >
      {index % 2 === 0 ? (
        <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-3 border border-amber-200/70 bg-amber-100/70 shadow-sm dark:border-amber-300/20 dark:bg-amber-200/20" />
      ) : (
        <Paperclip aria-hidden="true" className="absolute -top-3 right-6 h-6 w-6 rotate-12 text-zinc-500 dark:text-zinc-400" />
      )}
      <div className="font-clipping">
        <div className="flex items-center justify-between gap-2 border-y border-zinc-800 py-0.5 dark:border-zinc-300">
          <span className="text-sm leading-tight text-navy-800 dark:text-navy-400" style={paper.style}>{paper.label}</span>
          <span className="rounded-sm bg-zinc-900 px-1.5 py-px text-[10px] font-bold tracking-wider text-white uppercase dark:bg-zinc-100 dark:text-zinc-900">{ad.category}</span>
        </div>
        <div className={cn("mt-2 p-2 text-xs leading-[1.65] break-words sm:text-sm", ad.boxed && "border-2 border-zinc-900 dark:border-zinc-200", ad.bold && "font-bold")}>
          {/* CSS wraps the text to the card width; the badge below reports the billed line count at CPL chars/line. */}
          {ad.text}
        </div>
        <p className="mt-2 border-t border-dotted border-zinc-400 pt-1 text-right text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{lines.length} lines · {CPL} chars/line</p>
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
        className={cn("relative block w-0 max-w-full min-w-full touch-pan-y py-4 focus-visible:outline-2 focus-visible:outline-navy-500", reduce ? "overflow-x-auto" : "overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]")}
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

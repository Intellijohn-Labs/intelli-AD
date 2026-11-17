import Link from "next/link";
import { cn } from "@/lib/utils";

/** Geometric logo mark + wordmark with a small "Kerala" badge; `onDark` for the obsidian header (mint mark + mint badge). */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/" aria-label="IntelliAd home" className={cn("flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className={cn("grid h-8 w-8 place-items-center rounded-[10px]", onDark ? "bg-emerald-400 shadow-[0_0_16px_-2px_rgba(52,211,153,0.6)]" : "bg-[#0B1215] shadow-[0_2px_6px_-1px_rgba(11,18,21,0.4)]")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={onDark ? "#0B1215" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19V9l7-5 7 5v10" /><path d="M9.5 19v-5h5v5" /></svg>
      </span>
      <span className={cn("text-[1.2rem] leading-none font-extrabold tracking-[-0.03em]", onDark ? "text-white" : "text-[#0B1215]")}>IntelliAd</span>
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide", onDark ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
        <span className={cn("h-1 w-1 rounded-full", onDark ? "bg-emerald-300" : "bg-emerald-500")} aria-hidden="true" />Kerala
      </span>
    </Link>
  );
}

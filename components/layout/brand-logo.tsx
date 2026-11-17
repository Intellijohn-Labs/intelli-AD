import Link from "next/link";
import { cn } from "@/lib/utils";

/** Geometric logo mark + wordmark with a small "Kerala" badge. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/" aria-label="IntelliAd home" className={cn("flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#0F172A] shadow-[0_2px_6px_-1px_rgba(15,23,42,0.4)]">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19V9l7-5 7 5v10" /><path d="M9.5 19v-5h5v5" /></svg>
      </span>
      <span className={cn("text-[1.2rem] leading-none font-extrabold tracking-[-0.03em]", onDark ? "text-white" : "text-[#0F172A]")}>IntelliAd</span>
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide text-emerald-700">Kerala</span>
    </Link>
  );
}

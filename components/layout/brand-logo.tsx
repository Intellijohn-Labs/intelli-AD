import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo mark + "AI admanager" wordmark; the "AI" is an Electric Mint badge. `onDark` for the obsidian header. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/" aria-label="AI admanager home" className={cn("flex items-center gap-2", className)}>
      <span className={cn("flex items-center gap-1.5 text-[1.15rem] leading-none font-extrabold tracking-[-0.03em]", onDark ? "text-white" : "text-[#0B1215]")}>
        <span className="rounded-md bg-emerald-400 px-1.5 py-1 text-[0.95rem] leading-none text-[#0B1215] shadow-[0_0_14px_-3px_rgba(52,211,153,0.7)]">AI</span>admanager
      </span>
      <span className={cn("hidden items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide sm:inline-flex", onDark ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
        <span className={cn("h-1 w-1 rounded-full", onDark ? "bg-emerald-300" : "bg-emerald-500")} aria-hidden="true" />Kerala
      </span>
    </Link>
  );
}

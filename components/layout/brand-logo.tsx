import Link from "next/link";
import { cn } from "@/lib/utils";

/** Masthead-style wordmark: a serif nameplate between double rules, with a tiny "Est. for Kerala" dateline. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const ink = onDark ? "text-white" : "text-[#18181B]";
  return (
    <Link href="/" aria-label="IntelliAd home" className={cn("group flex flex-col leading-none", className)}>
      <span className={cn("border-y-[3px] border-double py-1 font-serif text-[1.65rem] leading-none font-black tracking-tight", onDark ? "border-white/70" : "border-[#18181B]", ink)}>
        Intelli<span className="text-[#C2410C]">Ad</span>
      </span>
      <span className={cn("mt-1 text-[9px] font-bold tracking-[0.28em] uppercase", onDark ? "text-white/70" : "text-stone-500")}>Newspaper ad desk · Kerala</span>
    </Link>
  );
}

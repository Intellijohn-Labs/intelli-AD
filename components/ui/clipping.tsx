"use client";

import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A physical newspaper cutting: grainy newsprint, dashed cut line, scissors mark,
 * classification tag, bold headline, fine rules and a columnar Malayalam body.
 * Set at a slight angle, as if pasted onto the page.
 */
export function Clipping({ tag, headline, children, rotate = 0, className }: { tag: string; headline?: string; children: ReactNode; rotate?: number; className?: string }) {
  return (
    <figure
      style={{ transform: `rotate(${rotate}deg)` }}
      className={cn("paper-grain relative border-2 border-dashed border-zinc-400 px-5 pt-5 pb-4 text-zinc-900 shadow-sm", className)}
    >
      <Scissors className="absolute -top-3 left-6 h-5 w-5 rotate-90 rounded-full bg-[#F8FAFC] text-[#0F172A]" aria-hidden="true" />
      <div className="font-clipping">
        <p className="border-y border-[#0F172A] py-0.5 text-center font-mono text-[11px] font-bold tracking-wide text-[#0F172A]">{tag}</p>
        {headline && <h4 className="mt-2 mb-1 font-clipping text-xl leading-snug font-bold text-[#0F172A]">{headline}</h4>}
        <div className="mt-1 border-t border-zinc-400 pt-2 text-[14px] leading-[1.75] ">{children}</div>
      </div>
    </figure>
  );
}

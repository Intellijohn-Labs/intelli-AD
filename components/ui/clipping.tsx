"use client";

import { motion } from "framer-motion";
import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A physical newspaper cutting: grainy newsprint, dashed cut line, scissors mark,
 * classification tag, bold headline, fine rules and a columnar Malayalam body.
 * Tilts slightly on hover as if lifted off the table.
 */
export function Clipping({ tag, headline, children, rotate = 0, className }: { tag: string; headline?: string; children: ReactNode; rotate?: number; className?: string }) {
  return (
    <motion.figure
      initial={{ rotate }}
      animate={{ rotate }}
      // Multi-keyframe values need a tween; springs only support two keyframes.
      whileHover={{
        rotate: [rotate - 0.5, rotate + 0.5, rotate],
        scale: 1.02,
        transition: {
          rotate: { type: "tween", ease: "easeInOut", duration: 0.4 },
          scale: { type: "spring", stiffness: 300, damping: 20 },
        },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("paper-grain relative border-2 border-dashed border-zinc-400 px-5 pt-5 pb-4 text-zinc-900 shadow-md transition-shadow hover:shadow-xl", className)}
    >
      <Scissors className="absolute -top-3 left-6 h-5 w-5 rotate-90 rounded-full bg-white text-navy-600" aria-hidden="true" />
      <div className="font-clipping">
        <p className="border-y border-navy-600/60 bg-navy-50 py-0.5 text-center text-[11px] font-bold tracking-wide text-navy-800">{tag}</p>
        {headline && <h4 className="mt-2 mb-1 font-clipping text-xl leading-snug font-bold text-navy-900">{headline}</h4>}
        <div className="mt-1 border-t border-zinc-400 pt-2 text-[14px] leading-[1.75] ">{children}</div>
      </div>
    </motion.figure>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Small ruled labels; tone only changes the ink colour, not a pastel fill. */
const tones = {
  navy: "border-navy-700 text-navy-800",
  green: "border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300",
  amber: "border-amber-700 text-amber-900 dark:border-amber-400 dark:text-amber-300",
  red: "border-rose-700 text-rose-800 dark:border-rose-400 dark:text-rose-300",
  slate: "border-zinc-400 text-zinc-700",
};

export function Badge({ tone = "navy", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight", tones[tone], className)} {...props} />;
}

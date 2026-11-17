import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Compact status pills. */
const tones = {
  navy: "border-blue-100 bg-blue-50 text-blue-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  red: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

export function Badge({ tone = "navy", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-semibold", tones[tone], className)} {...props} />;
}

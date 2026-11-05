import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  navy: "bg-navy-100 text-navy-800",
  green: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  amber: "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200",
  red: "bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200",
  slate: "bg-zinc-100 text-zinc-700",
};

export function Badge({ tone = "navy", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...props} />;
}

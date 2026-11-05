import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard surface: near-solid white, rounded-2xl, hairline border and a soft diffused shadow.
 * Pass `accent` for a thin branded top border (also exposed as `--c` for hover rings).
 */
export function Card({ className, accent, style, ...props }: HTMLAttributes<HTMLDivElement> & { accent?: string }) {
  const accentStyle: CSSProperties | undefined = accent ? { ["--c" as string]: accent, borderTopColor: accent } : undefined;
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/90 bg-white/95 text-zinc-900 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl dark:border-slate-700/80 dark:bg-[#1e293b]/90 dark:backdrop-blur-md",
        accent && "border-t-[3px]",
        className,
      )}
      style={{ ...accentStyle, ...style }}
      {...props}
    />
  );
}

export function SectionHeading({ eyebrow, title, children, className }: { eyebrow?: string; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-edition">{eyebrow}</p>}
      <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-zinc-600">{children}</p>}
    </div>
  );
}

import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard surface: solid paper, ink hairline border, 6px corners, no glass or glow.
 * Pass `accent` for a thin branded top border (also exposed as `--c` for hover rings).
 */
export function Card({ className, accent, style, ...props }: HTMLAttributes<HTMLDivElement> & { accent?: string }) {
  const accentStyle: CSSProperties | undefined = accent ? { ["--c" as string]: accent, borderTopColor: accent } : undefined;
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E7E5E4] bg-white text-[#18181B] shadow-[0_1px_0_rgba(24,24,27,0.04),0_8px_22px_-14px_rgba(24,24,27,0.2)] dark:border-slate-800/80 dark:bg-[#132247] dark:text-[#FFFFFF] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
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
      {eyebrow && <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>}
      <h2 className="font-[family-name:var(--font-jakarta)] text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-[#FFFFFF]">{title}</h2>
      {children && <p className="mt-3 text-zinc-600">{children}</p>}
    </div>
  );
}

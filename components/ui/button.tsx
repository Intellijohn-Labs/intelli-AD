import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

/** Flat, ink-black print buttons: square-ish corners, no gradients, glow or bounce. */
export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; shimmer?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:pointer-events-none disabled:opacity-50",
    {
      primary: "bg-[#111827] text-white hover:bg-black dark:bg-white dark:text-[#111827] dark:hover:bg-slate-200",
      accent: "bg-navy-700 text-white hover:bg-navy-800",
      secondary: "border border-slate-300 bg-transparent text-slate-800 hover:border-slate-900 hover:bg-slate-50 dark:border-[#3a3b41] dark:text-[#eaeaea] dark:hover:border-[#eaeaea] dark:hover:bg-white/5",
      ghost: "text-[#0F172A] hover:bg-black/5 dark:text-[#eaeaea] dark:hover:bg-white/10",
    }[variant],
    { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-base" }[size],
    className,
  );
}

export function Button({ variant, size, shimmer, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; shimmer?: boolean }) {
  return <button type={type} className={buttonStyles({ variant, size, shimmer, className })} {...props} />;
}

export function ButtonLink({ variant, size, shimmer, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; shimmer?: boolean }) {
  return <Link className={buttonStyles({ variant, size, shimmer, className })} {...props} />;
}

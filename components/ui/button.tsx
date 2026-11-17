import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

/** Buttons: midnight-slate primary, white bordered secondary; solid fills so className colour overrides still win. */
export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; shimmer?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50",
    {
      primary: "bg-[#0A0B0D] text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_8px_16px_-8px_rgba(15,23,42,0.5)] hover:-translate-y-px hover:bg-[#17181C] dark:bg-[#D12014] dark:text-white dark:shadow-none dark:hover:bg-[#E83E32]",
      accent: "bg-navy-700 text-white hover:bg-navy-800 dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]",
      secondary: "border border-slate-200 bg-white text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:bg-slate-50 dark:border-[#35363B] dark:text-[#FFFFFF] dark:hover:border-[#E83E32] dark:hover:bg-[#E83E32]/10 dark:hover:shadow-[0_0_18px_rgba(56,189,248,0.25)]",
      ghost: "text-[#0A0B0D] hover:bg-black/5 dark:text-[#FFFFFF] dark:hover:bg-white/10",
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

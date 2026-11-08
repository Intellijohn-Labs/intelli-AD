import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

/** Brand buttons: vibrant blue primary with a soft coloured glow; solid fills so className colour overrides still win. */
export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; shimmer?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:pointer-events-none disabled:opacity-50",
    {
      primary: "bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 dark:bg-sky-400 dark:text-[#0B132B] dark:shadow-sky-400/20 dark:hover:bg-sky-300 dark:hover:shadow-[0_0_22px_rgba(56,189,248,0.4)]",
      accent: "bg-navy-700 text-white hover:bg-navy-800 dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]",
      secondary: "border border-slate-300 bg-transparent text-slate-800 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-800 dark:border-[#2B3D6B] dark:text-[#FFFFFF] dark:hover:border-[#38BDF8] dark:hover:bg-[#38BDF8]/10 dark:hover:shadow-[0_0_18px_rgba(56,189,248,0.25)]",
      ghost: "text-[#0F172A] hover:bg-black/5 dark:text-[#FFFFFF] dark:hover:bg-white/10",
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

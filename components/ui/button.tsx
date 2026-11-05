"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

export function buttonStyles({ variant = "primary", size = "md", shimmer, className }: { variant?: Variant; size?: Size; shimmer?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:pointer-events-none disabled:opacity-50",
    {
      primary: "bg-gradient-to-r from-navy-600 to-navy-500 text-white shadow-[0_6px_20px_-6px_var(--brand)] hover:brightness-110",
      accent: "bg-gradient-to-r from-navy-600 to-navy-500 text-white shadow-[0_6px_20px_-6px_var(--brand)] hover:brightness-110",
      secondary: "border border-navy-200 bg-white/80 text-navy-800 hover:bg-navy-50",
      ghost: "text-navy-800 hover:bg-navy-50",
    }[variant],
    { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-base" }[size],
    shimmer && "btn-sheen",
    className,
  );
}

const press = { whileTap: { scale: 0.97 }, whileHover: { scale: 1.02 }, transition: { type: "spring" as const, stiffness: 500, damping: 30 } };

export function Button({ variant, size, shimmer, className, type = "button", ...props }: HTMLMotionProps<"button"> & { variant?: Variant; size?: Size; shimmer?: boolean }) {
  return <motion.button type={type} {...press} className={buttonStyles({ variant, size, shimmer, className })} {...props} />;
}

const MotionLink = motion.create(Link);

export function ButtonLink({ variant, size, shimmer, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; shimmer?: boolean }) {
  return <MotionLink {...press} className={buttonStyles({ variant, size, shimmer, className })} {...(props as ComponentProps<typeof MotionLink>)} />;
}

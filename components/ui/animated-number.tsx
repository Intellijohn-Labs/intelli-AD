"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

/** Odometer-style number that springs to its new value. Transform-free: only text updates. */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 170, damping: 26, mass: 0.6 });
  const text = useTransform(spring, (v) => format(v));
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  if (reduce) return <span className={className}>{format(value)}</span>;
  return <motion.span className={className}>{text}</motion.span>;
}

/** Counts from 0 to `to` the first time it scrolls into view. */
export function CountUp({ to, decimals = 0, suffix = "", className }: { to: number; decimals?: number; suffix?: string; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => v.toFixed(decimals) + suffix);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(mv, to, { duration: 1.3, ease: "easeOut" });
    return () => controls.stop();
  }, [inView, reduce, to, mv]);
  if (reduce) return <span className={className}>{to.toFixed(decimals) + suffix}</span>;
  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

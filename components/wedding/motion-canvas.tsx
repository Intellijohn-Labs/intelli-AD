"use client";

import { useEffect, useRef } from "react";
import { drawEffect } from "@/lib/wedding-motion";
import type { CardEffect, Palette } from "@/lib/wedding";

/** Plays the chosen motion over the still preview image (static when the visitor prefers reduced motion). */
export function MotionCanvas({ src, effect, pal, warm }: { src: string; effect: CardEffect; pal: Palette; warm: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !src) return;
    let live = true, raf = 0;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const img = new Image();
    img.onload = () => {
      if (!live) return;
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      const draw = (t: number) => { ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0); drawEffect(ctx, effect, (t / 3200) % 1, c.width, c.height, pal, warm); if (live && !reduce) raf = requestAnimationFrame(draw); };
      draw(0);
    };
    img.src = src;
    return () => { live = false; cancelAnimationFrame(raf); };
  }, [src, effect, pal, warm]);
  return <canvas ref={ref} role="img" aria-label="Animated card preview" draggable={false} onContextMenu={(e) => e.preventDefault()} className="pointer-events-none h-full w-full object-cover select-none" />;
}


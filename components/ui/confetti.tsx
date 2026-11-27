"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#D12014", "#E3BE5C", "#25D366", "#60A5FA", "#F472B6", "#FFFFFF"];

/** A short confetti burst each time `trigger` goes up (and is > 0). Skipped for visitors who prefer reduced motion. Never blocks clicks. */
export function ConfettiBurst({ trigger }: { trigger: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let calm = false; try { calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* show it */ }
    if (calm) return;
    setShown(trigger);
    const t = setTimeout(() => setShown(0), 2200);
    return () => clearTimeout(t);
  }, [trigger]);
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.2, d = 160 + ((i * 53) % 220);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8 + 140, r: ((i * 97) % 720) - 360, c: COLORS[i % COLORS.length], delay: (i % 6) * 25 };
  }), []);
  if (!shown) return null;
  return (
    <div aria-hidden="true" key={shown} className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => <span key={i} className="confetti-piece" style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, "--c": p.c, "--d": `${p.delay}ms` } as React.CSSProperties} />)}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

const orbs = [
  { className: "left-[-8%] top-[-6%] h-[46vmax] w-[46vmax] bg-[var(--brand)]", x: [0, 60, -20, 0], y: [0, 40, 70, 0], d: 26, o: 0.22 },
  { className: "right-[-10%] top-[18%] h-[38vmax] w-[38vmax] bg-indigo-400", x: [0, -70, 30, 0], y: [0, 50, -30, 0], d: 32, o: 0.2 },
  { className: "left-[22%] bottom-[-14%] h-[40vmax] w-[40vmax] bg-[var(--brand-accent)]", x: [0, 50, -40, 0], y: [0, -60, 20, 0], d: 36, o: 0.18 },
  { className: "right-[8%] bottom-[6%] h-[22vmax] w-[22vmax] bg-amber-300", x: [0, -30, 40, 0], y: [0, 30, -40, 0], d: 28, o: 0.18 },
];

/**
 * Ambient atmosphere: bright mesh gradient, floating blurred colour orbs that pick up the
 * active publication's brand colour, and a very faint print watermark. Fixed, behind content,
 * non-interactive.
 */
export function ManoramaWatermarkBg() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl will-change-transform ${o.className}`}
          style={{ opacity: o.o }}
          animate={{ x: o.x, y: o.y }}
          transition={{ type: "tween", duration: o.d, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)", backgroundSize: "88px 88px" }}
      />
    </div>
  );
}

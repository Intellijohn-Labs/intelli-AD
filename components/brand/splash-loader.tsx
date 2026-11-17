"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const FLAG = "aiadmanager.splash.v1";
const SHOW_MS = 700; // logo + progress; the fade-out adds ~0.2s, so ~0.9s in total

/**
 * One-time site-open reveal: obsidian overlay, mint glow, the logo springing in with a shimmer sweep and a thin progress line,
 * then a quick lift-and-fade. Runs once per browser session. It renders nothing on the server (so crawlers and the first paint
 * are untouched, with no hydration mismatch), never intercepts clicks, and is skipped for reduced-motion users.
 */
export function SplashLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(FLAG) === "1"; } catch { /* storage blocked: show once per load */ }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce || window.location.pathname.startsWith("/admin")) return;
    setShow(true);
    // The flag is written when the splash finishes (not when it starts), so React StrictMode's double effect run can't cancel it.
    const id = window.setTimeout(() => { try { sessionStorage.setItem(FLAG, "1"); } catch { /* ignore */ } setShow(false); }, SHOW_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0B0D]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -14, transition: { duration: 0.2, ease: "easeIn" } }}
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(232,62,50,0.22), rgba(209,32,20,0.10) 45%, transparent 72%)" }} />
          <motion.div
            className="relative overflow-hidden rounded-[28px] shadow-[0_0_60px_-8px_rgba(232,62,50,0.55)] ring-1 ring-white/15"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <Image src="/logo.png" alt="" width={168} height={168} priority className="h-36 w-36 sm:h-44 sm:w-44" />
            <motion.span
              className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: "-130%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 0.45, delay: 0.22, ease: "easeInOut" }}
            />
          </motion.div>
          <div className="relative mt-7 h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-[#E83E32] shadow-[0_0_12px_rgba(232,62,50,0.8)]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: SHOW_MS / 1000, ease: "easeInOut" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

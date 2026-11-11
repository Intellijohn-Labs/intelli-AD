"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PROMO_SLIDES, type PromoSlide } from "@/data/login-slides";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 4500;

/** Auto-advancing poster carousel: fades between slides, pauses on hover / focus, dots double as progress pills. */
export function PromoSlider({ slides = PROMO_SLIDES, className }: { slides?: PromoSlide[]; className?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches); // eslint-disable-line react-hooks/set-state-in-effect
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced || slides.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduced, slides.length]);

  if (!slides.length) return null;
  const s = slides[i];
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn("relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-md lg:aspect-[4/5] lg:max-h-[640px]", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={s.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${slides.length}`}
          initial={{ opacity: 0, x: reduced ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduced ? 0 : -24 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={cn("absolute inset-0 flex flex-col justify-end bg-gradient-to-br p-5 text-white sm:p-7", s.gradient)}
        >
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className={cn("absolute inset-0 h-full w-full object-cover", !s.custom && "opacity-45 mix-blend-luminosity")} />
          )}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
          {s.linkUrl && <a href={s.linkUrl} aria-label={s.title} className="absolute inset-0 z-[5] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white" {...(/^https?:/i.test(s.linkUrl) ? { target: "_blank", rel: "noopener noreferrer" } : {})} />}
          <div className="pointer-events-none relative max-w-md pb-8">
            {s.badge && <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide uppercase ring-1 ring-white/25 backdrop-blur">{s.badge}</span>}
            <h2 className="mt-3 font-serif text-2xl leading-tight font-black sm:text-3xl">{s.title}</h2>
            {s.description && <p className="mt-2 text-sm leading-relaxed text-slate-100/90">{s.description}</p>}
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 px-5" role="tablist" aria-label="Choose slide">
          {slides.map((x, n) => (
            <button key={x.id} type="button" role="tab" aria-selected={n === i} aria-label={`Slide ${n + 1}: ${x.title}`} onClick={() => setI(n)} className="relative h-1.5 w-8 overflow-hidden rounded-full bg-white/30 focus-visible:outline-2 focus-visible:outline-white">
              {n === i && (
                <motion.span
                  key={`${i}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-white"
                  initial={{ width: reduced || paused ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={reduced || paused ? { duration: 0 } : { duration: INTERVAL_MS / 1000, ease: "linear" }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

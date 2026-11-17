"use client";

import Image from "next/image";

/**
 * Site-open reveal (~1.0s: logo spring-in, shimmer sweep, progress line, then lift-and-fade). It is plain server-rendered markup driven
 * entirely by CSS keyframes (see globals.css), so it is on screen from the very first paint instead of waiting for hydration, never
 * intercepts clicks (pointer-events: none), keeps no state (no hydration mismatch) and removes itself visually after one second.
 * The `no-splash` class, set by SPLASH_INIT_SCRIPT, hides it on repeat visits in the same session.
 */
export function SplashLoader() {
  return (
    <div id="aiadm-splash" aria-hidden="true">
      <div className="splash-glow" />
      <div className="splash-logo">
        <Image src="/logo.png" alt="" width={168} height={168} priority className="h-36 w-36 sm:h-44 sm:w-44" />
        <span className="splash-shimmer" />
      </div>
      <div className="splash-bar"><i /></div>
    </div>
  );
}

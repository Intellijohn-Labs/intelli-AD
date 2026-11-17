"use client";

import { cn } from "@/lib/utils";

/** Witty copy for each stretch of the run. */
export function courierLine(pct: number, done: boolean) {
  if (done) return "Delivered. Laying out your review table…";
  if (pct < 25) return "Sprinting to the press room with your PDF…";
  if (pct < 60) return "Squinting at tiny newspaper columns…";
  if (pct < 85) return "Double-checking every rupee & edition…";
  return "Phew! Almost at the finish line…";
}

const CSS = `
@keyframes cr-leg-a { 0%,100% { transform: rotate(-42deg); } 50% { transform: rotate(42deg); } }
@keyframes cr-leg-b { 0%,100% { transform: rotate(42deg); } 50% { transform: rotate(-42deg); } }
@keyframes cr-arm-a { 0%,100% { transform: rotate(48deg); } 50% { transform: rotate(-48deg); } }
@keyframes cr-arm-b { 0%,100% { transform: rotate(-48deg); } 50% { transform: rotate(48deg); } }
@keyframes cr-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.4px); } }
@keyframes cr-cap { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(5deg); } }
@keyframes cr-dash { 0% { transform: translateX(6px); opacity: 0; } 30% { opacity: .85; } 100% { transform: translateX(-9px); opacity: 0; } }
@keyframes cr-sweat { 0% { transform: translate(0,0); opacity: 0; } 25% { opacity: .9; } 100% { transform: translate(-4px,-11px); opacity: 0; } }
@keyframes cr-flag { 0%,100% { transform: skewY(0deg); } 50% { transform: skewY(-9deg); } }
.cr-run * { transform-box: fill-box; }
.cr-leg-a { transform-origin: 50% 0%; animation: cr-leg-a .42s ease-in-out infinite; }
.cr-leg-b { transform-origin: 50% 0%; animation: cr-leg-b .42s ease-in-out infinite; }
.cr-arm-a { transform-origin: 50% 8%; animation: cr-arm-a .42s ease-in-out infinite; }
.cr-arm-b { transform-origin: 50% 8%; animation: cr-arm-b .42s ease-in-out infinite; }
.cr-body { animation: cr-bounce .21s ease-in-out infinite; }
.cr-cap { transform-origin: 20% 100%; animation: cr-cap .42s ease-in-out infinite; }
.cr-dash-1 { animation: cr-dash .5s linear infinite; }
.cr-dash-2 { animation: cr-dash .5s linear .17s infinite; }
.cr-dash-3 { animation: cr-dash .5s linear .33s infinite; }
.cr-sweat-1 { animation: cr-sweat .9s ease-out infinite; }
.cr-sweat-2 { animation: cr-sweat .9s ease-out .45s infinite; }
.cr-flag { transform-origin: 0% 50%; animation: cr-flag 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .cr-run *, .cr-flag { animation: none !important; } }
`;

/** A hurried courier with a rolled rate sheet. Purely decorative SVG; every limb is animated with CSS. */
function Runner({ finished }: { finished: boolean }) {
  return (
    <svg viewBox="0 0 64 56" width="64" height="56" aria-hidden="true" className="cr-run block overflow-visible">
      {/* motion lines + sweat */}
      {!finished && (
        <g stroke="#A8A29E" strokeWidth="1.6" strokeLinecap="round">
          <line className="cr-dash-1" x1="2" y1="22" x2="11" y2="22" />
          <line className="cr-dash-2" x1="0" y1="30" x2="10" y2="30" />
          <line className="cr-dash-3" x1="3" y1="38" x2="11" y2="38" />
        </g>
      )}
      {!finished && (
        <g fill="#E83E32">
          <path className="cr-sweat-1" d="M31 9 q-2 3 0 4.6 q2 -1.6 0 -4.6z" />
          <path className="cr-sweat-2" d="M36 7 q-1.6 2.6 0 4 q1.6 -1.4 0 -4z" />
        </g>
      )}
      {/* back leg + back arm */}
      <g stroke="#44403C" strokeWidth="4.2" strokeLinecap="round" fill="none">
        <path className={finished ? undefined : "cr-leg-b"} d="M29 33 L29 46" />
        <path className={finished ? undefined : "cr-arm-b"} d="M31 22 L31 32" stroke="#57534E" />
      </g>
      <g className={finished ? undefined : "cr-body"}>
        {/* torso */}
        <path d="M24 20 h13 q3 0 3 3 v10 q0 2 -2 2 h-15 q-2 0 -2 -2 v-10 q0 -3 3 -3z" fill="#D12014" />
        <rect x="24" y="30" width="16" height="2.6" fill="#7C2D12" opacity=".55" />
        {/* head */}
        <circle cx="31" cy="13" r="6.2" fill="#F5D0A9" />
        <circle cx="33.4" cy="12.4" r=".95" fill="#1C1917" />
        <path d="M33 16 q2 1.2 3.6 0" stroke="#7C2D12" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {/* flat cap */}
        <g className={finished ? undefined : "cr-cap"}>
          <path d="M24.6 11 q1 -6.8 8 -6.8 q5.6 0 6.2 6.8z" fill="#292524" />
          <path d="M33 10.6 h9 q1.4 0 1.4 1.3 h-10.4z" fill="#0A0B0D" />
        </g>
      </g>
      {/* front leg + front arm holding the rolled sheet */}
      <g stroke="#292524" strokeWidth="4.2" strokeLinecap="round" fill="none">
        <path className={finished ? undefined : "cr-leg-a"} d="M33 33 L33 46" />
      </g>
      <g className={finished ? undefined : "cr-arm-a"}>
        <path d="M34 22 L34 32" stroke="#D12014" strokeWidth="4" strokeLinecap="round" fill="none" />
        <g transform="rotate(-24 34 33)">
          <rect x="28" y="31" width="14" height="4.6" rx="2.3" fill="#F3F3F4" stroke="#A8A29E" strokeWidth="1" />
          <line x1="31" y1="33.3" x2="38" y2="33.3" stroke="#A8A29E" strokeWidth=".9" />
          <rect x="33.6" y="30.6" width="2" height="5.4" fill="#D12014" opacity=".85" />
        </g>
      </g>
    </svg>
  );
}

/** Progress track with the courier running from the start (0%) to a little finish flag (100%). */
export function CourierLoader({ pct, finishing }: { pct: number; finishing: boolean }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F3F3F4] p-3 pb-2.5 dark:border-slate-700 dark:bg-slate-900" aria-live="polite">
      <style>{CSS}</style>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{courierLine(p, finishing)}</p>
        <span className="font-mono text-sm font-bold tabular-nums text-[#D12014]">{Math.round(p)}%</span>
      </div>
      <div className="relative mt-1 h-[64px]">
        {/* the runner: left edge follows the percentage, so he stays inside the track at 0% and 100% */}
        <div className="absolute bottom-[-3px] z-10 transition-[left] duration-300 ease-out" style={{ left: `calc((100% - 64px) * ${p / 100})` }}>
          <Runner finished={finishing} />
        </div>
        {/* finish: a flag on a pole beside a tiny desk */}
        <div className="absolute right-0 bottom-[5px] flex items-end gap-1" aria-hidden="true">
          <svg viewBox="0 0 30 34" width="30" height="34">
            <rect x="3" y="3" width="2" height="30" fill="#57534E" />
            <g className="cr-flag"><path d="M5 4 h17 l-4 5.4 l4 5.4 h-17z" fill="#D12014" /></g>
            <rect x="0" y="31" width="14" height="3" rx="1" fill="#44403C" />
          </svg>
        </div>
        {/* track */}
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label="Rate card extraction progress" className="absolute inset-x-0 bottom-0 h-[5px] overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-slate-700">
          <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", finishing ? "bg-[#059669]" : "bg-[#E83E32]")} style={{ width: `${p}%` }} />
        </div>
      </div>
    </div>
  );
}

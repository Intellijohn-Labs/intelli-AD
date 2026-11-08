import type { ReactNode } from "react";

/*
 * High-fidelity isometric / claymorphic SVG illustrations for the services hub. Each is a self-contained
 * 240 × 160 viewBox with its own <defs> (gradients, glow, blur drop shadows), stacked "thickness" layers and
 * glossy overlays. Colours are fixed hex so they read as printed paper plus bright accents on the tinted
 * canvases in both themes; only shadow strength adapts (--art-shadow). Animation is transform / opacity only,
 * applied to inner groups so SVG transform attributes stay intact.
 */
const shadow = { floodColor: "var(--art-shadow)" } as const;
const SANS = "var(--font-jakarta), Arial, sans-serif";
const DISPLAY = "var(--font-syne), Impact, sans-serif";

function Art({ label, children, className = "" }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 240 160" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={`h-full w-full overflow-visible ${className}`}>
      {children}
    </svg>
  );
}

/** Blur drop shadow filter. */
const Shadow = ({ id, dy = 6, blur = 5, dx = 0 }: { id: string; dy?: number; blur?: number; dx?: number }) => (
  <filter id={id} x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx={dx} dy={dy} stdDeviation={blur} style={shadow} />
  </filter>
);
const Blur = ({ id, s = 3 }: { id: string; s?: number }) => (
  <filter id={id} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation={s} /></filter>
);
const Stop = ({ o, c, a = 1 }: { o: number; c: string; a?: number }) => <stop offset={o} stopColor={c} stopOpacity={a} />;
const Lin = ({ id, x1 = 0, y1 = 0, x2 = 1, y2 = 1, children }: { id: string; x1?: number; y1?: number; x2?: number; y2?: number; children: ReactNode }) => (
  <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{children}</linearGradient>
);

// ── 1. Classified text: isometric folded sheet, organic highlighter, glossy gold pen ──────────
export function ClassifiedTextArt() {
  const W = 118, H = 84;
  return (
    <Art>
      <defs>
        <Shadow id="ct-sh" dy={9} blur={6} />
        <Blur id="ct-blur" s={2.2} />
        <Lin id="ct-paper" x2={1} y2={1}><Stop o={0} c="#FFFDF7" /><Stop o={1} c="#FAF6EE" /></Lin>
        <Lin id="ct-half" x1={0} y1={0} x2={1} y2={0}><Stop o={0} c="#000" a={0.07} /><Stop o={0.15} c="#000" a={0} /><Stop o={1} c="#000" a={0} /></Lin>
        <Lin id="ct-edge" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#e8dcc0" /><Stop o={1} c="#b9a679" /></Lin>
        <Lin id="ct-mark" x1={0} y1={0} x2={1} y2={0}><Stop o={0} c="#FDE047" a={0.88} /><Stop o={0.5} c="#FBBF24" a={0.85} /><Stop o={1} c="#F59E0B" a={0.85} /></Lin>
        <Lin id="gold-grad" x1={0} y1={0} x2={1} y2={1}><Stop o={0} c="#FEF3C7" /><Stop o={0.3} c="#FBBF24" /><Stop o={0.65} c="#D97706" /><Stop o={1} c="#92400E" /></Lin>
        <Lin id="ct-metal" x1={0} y1={0} x2={1} y2={0}><Stop o={0} c="#0f172a" /><Stop o={0.3} c="#475569" /><Stop o={0.45} c="#e2e8f0" /><Stop o={0.62} c="#64748b" /><Stop o={1} c="#0b1220" /></Lin>
        <Lin id="ct-barrel" x1={0} y1={0} x2={1} y2={0}><Stop o={0} c="#172554" /><Stop o={0.35} c="#4f6ef0" /><Stop o={0.5} c="#93a8ff" /><Stop o={0.7} c="#3347c9" /><Stop o={1} c="#0f1b4d" /></Lin>
        <filter id="ct-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.38  0 0 0 0 0.2  0 0 0 0.28 0" />
        </filter>
        <clipPath id="ct-clip"><rect width={W} height={H} rx="3" /></clipPath>
        <rect id="ct-shape" width={W} height={H} rx="3" />
      </defs>
      <ellipse cx="116" cy="124" rx="68" ry="9" fill="#000" opacity="0.18" filter="url(#ct-blur)" />
      <g transform="matrix(1 -0.22 0.32 0.92 36 46)" filter="url(#ct-sh)">
        {/* dimensional thickness: a stack of paper edges */}
        {[7, 6, 5, 4, 3, 2, 1].map((k) => <use key={k} href="#ct-shape" y="0" transform={`translate(0 ${k}.3)`} fill={k % 2 ? "#d9cba5" : "#cdbf98"} />)}
        <use href="#ct-shape" fill="url(#ct-paper)" />
        <g clipPath="url(#ct-clip)">
          <rect width={W} height={H} filter="url(#ct-grain)" opacity="0.6" />
          <rect x="59" width="59" height={H} fill="#000" opacity="0.045" />
          <rect x="52" width="14" height={H} fill="url(#ct-half)" />
          <line x1="59" x2="59" y1="0" y2={H} stroke="#b9a679" strokeWidth="0.6" opacity="0.7" />
          <rect x="8" y="8" width="62" height="7" rx="2" fill="#44403c" opacity="0.88" />
          {[[8, 24, 96], [8, 34, 100], [8, 62, 88], [8, 72, 62]].map(([x, y, w]) => <rect key={y} x={x} y={y} width={w} height="4.6" rx="2.3" fill="#a8a29e" opacity="0.8" />)}
          <rect x="8" y="46.6" width="98" height="4.6" rx="2.3" fill="#57534e" opacity="0.9" />
          {/* organic slanted highlighter stroke with ragged caps */}
          <path className="svg-hl" d="M3 42.5C2 44 3.6 51 2.4 55 5 57.4 12 56.4 22 56.3L108 54.4C111.6 53.4 110 46.8 111.4 43.4 104 41.6 92 42.8 80 43L8 44.4Z" fill="url(#ct-mark)" style={{ mixBlendMode: "multiply" }} />
        </g>
        <rect width={W} height={H} rx="3" fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />
      </g>
      {/* hand-drawn pen shadow on the sheet */}
      <path d="M150 74c9 2 19 6 27 12-8 1-18 1-28-3Z" fill="#000" opacity="0.2" filter="url(#ct-blur)" />
      <ellipse cx="158" cy="78" rx="5" ry="2" fill="#000" opacity="0.28" filter="url(#ct-blur)" />
      {/* glossy fountain pen at the end of the stroke */}
      <g transform="translate(156 70) rotate(32)">
        <g className="svg-float">
          <rect x="-8.5" y="-82" width="17" height="48" rx="8.5" fill="url(#ct-barrel)" />
          <rect x="-5" y="-76" width="2.6" height="36" rx="1.3" fill="#fff" opacity="0.55" />
          <rect x="3" y="-70" width="1.6" height="26" rx="0.8" fill="#fff" opacity="0.18" />
          <path d="M5 -80v26" stroke="url(#gold-grad)" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="-10.5" y="-35" width="21" height="9" rx="3" fill="url(#gold-grad)" />
          <rect x="-10.5" y="-35" width="21" height="2.6" rx="1.3" fill="#fff" opacity="0.45" />
          <path d="M-8 -26H8L10.5 -9Q10.5 -3.5 0 0Q-10.5 -3.5 -10.5 -9Z" fill="url(#ct-metal)" />
          <path d="M-8 -26H8L10.5 -9Q10.5 -3.5 0 0Q-10.5 -3.5 -10.5 -9Z" fill="url(#gold-grad)" opacity="0.7" />
          <path d="M0 -4V-19" stroke="#78350f" strokeWidth="1" />
          <circle cx="0" cy="-18" r="2" fill="#78350f" />
          <path d="M-6 -24L-9 -11" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        </g>
      </g>
    </Art>
  );
}

// ── 2. Classified display: dual-layer isometric ad box with glass overlays ────────────────────
export function ClassifiedDisplayArt() {
  return (
    <Art>
      <defs>
        <Shadow id="cd-sh" dy={10} blur={6} />
        <Shadow id="cd-sh2" dy={4} blur={2.5} />
        <Blur id="cd-glow" s={4} />
        <Lin id="cd-plane" x2={1} y2={1}><Stop o={0} c="#bfdbfe" a={0.9} /><Stop o={1} c="#c7d2fe" a={0.55} /></Lin>
        <Lin id="cd-face" x2={1} y2={1}><Stop o={0} c="#ffffff" /><Stop o={0.6} c="#eef2ff" /><Stop o={1} c="#dbe4ff" /></Lin>
        <Lin id="cd-rim" x2={1} y2={1}><Stop o={0} c="#38bdf8" /><Stop o={0.5} c="#2563eb" /><Stop o={1} c="#4338ca" /></Lin>
        <Lin id="cd-side" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#4338ca" /><Stop o={1} c="#1e1b4b" /></Lin>
        <radialGradient id="cd-av" cx="0.35" cy="0.3" r="0.9"><Stop o={0} c="#bae6fd" /><Stop o={0.5} c="#6366f1" /><Stop o={1} c="#312e81" /></radialGradient>
        <radialGradient id="cd-body" cx="0.4" cy="0.2" r="0.9"><Stop o={0} c="#ffffff" /><Stop o={1} c="#a5b4fc" /></radialGradient>
        <Lin id="cd-head" x2={1} y2={0}><Stop o={0} c="#1d4ed8" /><Stop o={1} c="#6366f1" /></Lin>
        <Lin id="cd-pill" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#a5f3fc" /><Stop o={0.5} c="#22d3ee" /><Stop o={1} c="#0891b2" /></Lin>
        <Lin id="cd-glass" x2={1} y2={1}><Stop o={0} c="#fff" a={0.75} /><Stop o={0.5} c="#fff" a={0.12} /><Stop o={1} c="#fff" a={0} /></Lin>
        <clipPath id="cd-av-clip"><circle cx="76" cy="78" r="20" /></clipPath>
        <clipPath id="cd-face-clip"><rect x="34" y="26" width="164" height="104" rx="15" /></clipPath>
        <rect id="cd-box" x="34" y="26" width="164" height="104" rx="15" />
      </defs>
      <g transform="translate(120 82) skewY(-6) rotate(-1) translate(-120 -82)">
        {/* gradient backplane */}
        <rect x="22" y="14" width="196" height="132" rx="22" fill="url(#cd-plane)" />
        <rect x="22" y="14" width="196" height="132" rx="22" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.7" />
        {/* box glow + extruded body */}
        <use href="#cd-box" fill="none" stroke="#38bdf8" strokeWidth="5" opacity="0.5" filter="url(#cd-glow)" />
        <g filter="url(#cd-sh)">
          {[8, 7, 6, 5, 4, 3, 2, 1].map((k) => <use key={k} href="#cd-box" transform={`translate(${k * 0.5} ${k})`} fill="url(#cd-side)" />)}
          <use href="#cd-box" fill="url(#cd-face)" />
        </g>
        <use href="#cd-box" fill="none" stroke="url(#cd-rim)" strokeWidth="3" />
        <use href="#cd-box" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.7" transform="translate(0.8 0.8)" />
        {/* glassmorphic overlays */}
        <g clipPath="url(#cd-face-clip)">
          <path d="M34 26H128L84 130H34Z" fill="url(#cd-glass)" opacity="0.8" />
          <rect x="34" y="26" width="164" height="22" fill="#fff" opacity="0.35" />
        </g>
        {/* extruded circular avatar */}
        <g filter="url(#cd-sh2)">
          {[5, 4, 3, 2, 1].map((k) => <circle key={k} cx={76 + k * 0.4} cy={78 + k} r="21.5" fill="#312e81" />)}
          <circle cx="76" cy="78" r="21.5" fill="#fff" />
        </g>
        <circle cx="76" cy="78" r="20" fill="url(#cd-av)" />
        <g clipPath="url(#cd-av-clip)">
          <circle cx="76" cy="72" r="8" fill="url(#cd-body)" />
          <path d="M56 104a20 17 0 0 1 40 0Z" fill="url(#cd-body)" />
          <ellipse cx="68" cy="62" rx="14" ry="9" fill="#fff" opacity="0.28" transform="rotate(-25 68 62)" />
        </g>
        <circle cx="76" cy="78" r="20" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.85" />
        {/* side text bars */}
        <rect x="110" y="50" width="76" height="13" rx="6.5" fill="url(#cd-head)" />
        <rect x="112" y="52" width="60" height="3" rx="1.5" fill="#fff" opacity="0.4" />
        {[[70, 76], [60, 86], [66, 96]].map(([w, y]) => (
          <g key={y}><rect x="110" y={y} width={w} height="6" rx="3" fill="#94a3b8" opacity="0.55" /><rect x="110" y={y} width={w} height="2.4" rx="1.2" fill="#fff" opacity="0.6" /></g>
        ))}
        {/* raised cyan AD pill */}
        <g className="svg-float">
          <ellipse cx="170" cy="120" rx="17" ry="3.5" fill="#000" opacity="0.2" filter="url(#cd-glow)" />
          <rect x="152" y="106" width="36" height="15" rx="7.5" fill="#0e7490" />
          <rect x="152" y="104" width="36" height="15" rx="7.5" fill="url(#cd-pill)" />
          <rect x="156" y="105.5" width="28" height="3.4" rx="1.7" fill="#fff" opacity="0.7" />
          <text x="170" y="115" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#083344" fontFamily={SANS} letterSpacing="1.2">AD</text>
        </g>
      </g>
    </Art>
  );
}

// ── 3. Tender / public notices: parchment scroll, gold crest, bevelled ledger, inked seal ─────
export function TenderNoticeArt() {
  return (
    <Art>
      <defs>
        <Shadow id="tn-sh" dy={8} blur={5} />
        <Blur id="tn-blur" s={2} />
        <Lin id="tn-sheet" x1={0} y1={0} x2={1} y2={0}><Stop o={0} c="#f3e8cf" /><Stop o={0.25} c="#fffdf6" /><Stop o={0.75} c="#fbf5e6" /><Stop o={1} c="#eadfc3" /></Lin>
        <Lin id="dark-paper-shadow" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#3b2f14" a={0.5} /><Stop o={0.14} c="#3b2f14" a={0} /><Stop o={0.86} c="#3b2f14" a={0} /><Stop o={1} c="#3b2f14" a={0.5} /></Lin>
        <Lin id="tn-roll" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#fff3d1" /><Stop o={0.35} c="#e3c88a" /><Stop o={0.75} c="#b8944f" /><Stop o={1} c="#8a6a30" /></Lin>
        <radialGradient id="tn-crest" cx="0.35" cy="0.3" r="0.9"><Stop o={0} c="#FDE68A" /><Stop o={0.45} c="#D97706" /><Stop o={1} c="#78350F" /></radialGradient>
        <Lin id="tn-row" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#ffffff" /><Stop o={1} c="#e7e0cd" /></Lin>
        <Lin id="tn-head" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#475569" /><Stop o={1} c="#1e293b" /></Lin>
        <filter id="tn-ink" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 2.0" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="t" />
          <feDropShadow in="t" dx="1.4" dy="2" stdDeviation="1.1" floodColor="#450a0a" floodOpacity="0.55" />
        </filter>
        <clipPath id="tn-clip"><path d="M64 20Q120 8 176 20V142Q120 154 64 142Z" /></clipPath>
      </defs>
      <g filter="url(#tn-sh)"><path d="M64 20Q120 8 176 20V142Q120 154 64 142Z" fill="url(#tn-sheet)" /></g>
      <path d="M64 20Q120 8 176 20V142Q120 154 64 142Z" fill="url(#dark-paper-shadow)" />
      <path d="M64 20Q120 8 176 20" fill="none" stroke="#fff" strokeWidth="1" opacity="0.7" />
      {/* rolled ends */}
      {[{ y: 14, r: 0 }, { y: 140, r: 1 }].map(({ y }) => (
        <g key={y}>
          <rect x="54" y={y - 8} width="132" height="16" rx="8" fill="url(#tn-roll)" />
          <rect x="60" y={y - 6} width="120" height="3" rx="1.5" fill="#fff" opacity="0.45" />
          <ellipse cx="55" cy={y} rx="4" ry="8" fill="#a07a38" /><ellipse cx="55" cy={y} rx="2" ry="4.5" fill="#6b5122" /><ellipse cx="185" cy={y} rx="4" ry="8" fill="#a07a38" /><ellipse cx="185" cy={y} rx="2" ry="4.5" fill="#6b5122" />
        </g>
      ))}
      <g clipPath="url(#tn-clip)">
        {/* embossed gold state crest */}
        <circle cx="120" cy="43" r="14.5" fill="#92400e" opacity="0.4" filter="url(#tn-blur)" transform="translate(1 2)" />
        <circle cx="120" cy="42" r="14" fill="url(#tn-crest)" stroke="#D97706" strokeWidth="1.2" />
        <circle cx="120" cy="42" r="10.8" fill="none" stroke="#FEF3C7" strokeWidth="0.8" opacity="0.8" />
        <g fill="#78350F" opacity="0.65" transform="translate(0.7 0.9)"><path d="M120 33.5l8.5 4.3H111.5Z" />{[113.6, 117.6, 121.6, 125.6].map((x) => <rect key={x} x={x} y="38.5" width="2" height="7.6" />)}<rect x="110.8" y="46.6" width="18.4" height="2" rx="1" /></g>
        <g fill="#FFF7D6"><path d="M120 33.5l8.5 4.3H111.5Z" />{[113.6, 117.6, 121.6, 125.6].map((x) => <rect key={x} x={x} y="38.5" width="2" height="7.6" />)}<rect x="110.8" y="46.6" width="18.4" height="2" rx="1" /></g>
        <rect x="94" y="62" width="52" height="4.4" rx="2.2" fill="#44403c" opacity="0.8" />
        <rect x="103" y="69.5" width="34" height="3" rx="1.5" fill="#a8a29e" opacity="0.8" />
        {/* 3D ledger: bevelled header and rows */}
        <rect x="75" y="78" width="90" height="12" fill="url(#tn-head)" />
        {[0, 1, 2].map((r) => <rect key={r} x="75" y={91 + r * 11} width="90" height="10" fill="url(#tn-row)" stroke="#a8a08a" strokeWidth="0.5" />)}
        {[0, 1, 2].map((r) => <rect key={`h${r}`} x="75" y={91 + r * 11} width="90" height="1.4" fill="#fff" opacity="0.85" />)}
        {[105, 135].map((x) => <g key={x}><line x1={x} x2={x} y1="78" y2="124" stroke="#6b645a" strokeWidth="0.7" /><line x1={x + 0.8} x2={x + 0.8} y1="78" y2="124" stroke="#fff" strokeWidth="0.5" opacity="0.7" /></g>)}
        {[[79, 16], [109, 18], [139, 14]].map(([x, w]) => <rect key={x} x={x} y="82.4" width={w} height="3.4" rx="1.7" fill="#e2e8f0" opacity="0.9" />)}
        {[93, 104, 115].flatMap((y) => [[79, 18], [109, 22], [139, 16]].map(([x, w]) => <rect key={`${x}${y}`} x={x} y={y} width={w} height="3" rx="1.5" fill="#78716c" opacity="0.6" />))}
        <rect x="76" y="129" width="46" height="3" rx="1.5" fill="#a8a29e" opacity="0.8" />
      </g>
      {/* textured 3D rubber seal */}
      <g transform="translate(158 116) rotate(-16)">
        <g className="svg-stamp" filter="url(#tn-ink)">
          <circle r="25" fill="#dc2626" opacity="0.12" />
          <circle r="25" fill="none" stroke="#b91c1c" strokeWidth="2.6" strokeDasharray="3.4 2.2" />
          <circle r="19.5" fill="none" stroke="#b91c1c" strokeWidth="1.6" />
          <text y="-3.5" textAnchor="middle" fontSize="6.8" fontWeight="900" fill="#b91c1c" letterSpacing="0.6" fontFamily={SANS}>OFFICIAL</text>
          <text y="6.2" textAnchor="middle" fontSize="6.8" fontWeight="900" fill="#b91c1c" letterSpacing="0.6" fontFamily={SANS}>APPROVAL</text>
          <path d="M-10 11h20M-7 14h14" stroke="#b91c1c" strokeWidth="1.1" />
        </g>
      </g>
    </Art>
  );
}

// ── 4. Obituary & remembrance: angled memorial frame, jasmine garland, Kerala lamp ────────────
const JASMINE = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2;
  return { x: 108 + 45 * Math.cos(a), y: 68 + 54 * Math.sin(a), r: (i * 53) % 72, s: 0.9 + ((i * 7) % 4) * 0.08 };
});
const LEAVES = Array.from({ length: 13 }, (_, i) => {
  const a = ((i + 0.5) / 13) * Math.PI * 2;
  return { x: 108 + 46 * Math.cos(a), y: 68 + 55 * Math.sin(a), r: (a * 180) / Math.PI + 90 };
});

export function ObituaryArt() {
  return (
    <Art className="flicker">
      <defs>
        <Shadow id="ob-sh" dy={7} blur={5} />
        <Blur id="ob-blur" s={4} />
        <radialGradient id="ob-glow" cx="0.5" cy="0.5" r="0.5"><Stop o={0} c="#fbbf24" a={0.5} /><Stop o={1} c="#fbbf24" a={0} /></radialGradient>
        <radialGradient id="ob-halo" cx="0.5" cy="0.5" r="0.5"><Stop o={0} c="#fff7c2" a={0.95} /><Stop o={0.4} c="#fbbf24" a={0.45} /><Stop o={1} c="#f97316" a={0} /></radialGradient>
        <Lin id="ob-frame" x2={1} y2={1}><Stop o={0} c="#FEF3C7" /><Stop o={0.35} c="#F59E0B" /><Stop o={0.7} c="#B45309" /><Stop o={1} c="#78350F" /></Lin>
        <Lin id="ob-depth" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#92400E" /><Stop o={1} c="#451A03" /></Lin>
        <radialGradient id="shading" cx="0.38" cy="0.3" r="0.85"><Stop o={0} c="#e9e0d2" /><Stop o={0.55} c="#9c8c78" /><Stop o={1} c="#4a3f33" /></radialGradient>
        <Lin id="ob-photo" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#f8f1e4" /><Stop o={1} c="#bfb09a" /></Lin>
        <Lin id="ob-brass" x1={0} y1={0} x2={1} y2={0}><Stop o={0} c="#92400E" /><Stop o={0.3} c="#FCD34D" /><Stop o={0.5} c="#FFF3B0" /><Stop o={0.75} c="#D97706" /><Stop o={1} c="#78350F" /></Lin>
        <radialGradient id="ob-petal" cx="0.4" cy="0.35" r="0.8"><Stop o={0} c="#ffffff" /><Stop o={1} c="#F8FAFC" /></radialGradient>
        <clipPath id="ob-clip"><ellipse cx="108" cy="68" rx="30" ry="38" /></clipPath>
      </defs>
      <ellipse cx="108" cy="68" rx="90" ry="78" fill="url(#ob-glow)" />
      {/* angled 3D frame: extruded depth, gold bevel, matte inner mount */}
      <g transform="translate(108 68) skewY(-4) translate(-108 -68)">
        <g filter="url(#ob-sh)">
          {[7, 6, 5, 4, 3, 2, 1].map((k) => <ellipse key={k} cx={108 + k * 0.6} cy={68 + k} rx="36" ry="44" fill="url(#ob-depth)" />)}
          <ellipse cx="108" cy="68" rx="36" ry="44" fill="url(#ob-frame)" />
        </g>
        <ellipse cx="108" cy="68" rx="32.5" ry="40.5" fill="none" stroke="#FEF3C7" strokeWidth="1" opacity="0.7" />
        <ellipse cx="108" cy="68" rx="31" ry="39" fill="#fffaf0" />
        <ellipse cx="108" cy="68" rx="30" ry="38" fill="url(#ob-photo)" />
        <g clipPath="url(#ob-clip)">
          <circle cx="108" cy="59" r="12.5" fill="url(#shading)" />
          <path d="M74 110a34 30 0 0 1 68 0Z" fill="url(#shading)" />
          <ellipse cx="100" cy="48" rx="13" ry="21" fill="#fff" opacity="0.22" />
          <ellipse cx="108" cy="68" rx="30" ry="38" fill="none" stroke="#3b2f1e" strokeWidth="9" opacity="0.18" />
        </g>
        <ellipse cx="108" cy="68" rx="30" ry="38" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
        <path d="M80 44Q84 24 108 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {/* jasmine garland */}
        {LEAVES.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx="6.5" ry="2.6" fill={i % 2 ? "#3f8f5f" : "#56a876"} transform={`rotate(${l.r} ${l.x} ${l.y})`} />)}
        {JASMINE.map((g, i) => (
          <g key={i} transform={`translate(${g.x.toFixed(1)} ${g.y.toFixed(1)}) rotate(${g.r}) scale(${g.s})`}>
            <circle r="5.6" fill="#000" opacity="0.14" transform="translate(0.6 1.1)" />
            {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx="0" cy="-3.4" rx="1.9" ry="3.1" fill="url(#ob-petal)" stroke="#d6dde8" strokeWidth="0.3" transform={`rotate(${r})`} />)}
            <circle r="1.3" fill="#fbbf24" />
          </g>
        ))}
      </g>
      {/* solemn lines */}
      <rect x="70" y="128" width="76" height="5" rx="2.5" fill="#a8a29e" opacity="0.8" />
      <rect x="84" y="138" width="48" height="4" rx="2" fill="#a8a29e" opacity="0.6" />
      {/* Nilavilakku with pulsing halo */}
      <g transform="translate(190 148)">
        <circle className="svg-halo" cx="0" cy="-66" r="32" fill="url(#ob-halo)" />
        <ellipse cx="0" cy="0" rx="19" ry="3.8" fill="#000" opacity="0.2" filter="url(#ob-blur)" />
        <path d="M-17 -1h34l5 -8H-22Z" fill="url(#ob-brass)" />
        <path d="M-11 -9h22l-3.5 -10h-15Z" fill="url(#ob-brass)" />
        <ellipse cx="0" cy="-19" rx="7.5" ry="2" fill="#FDE68A" />
        <rect x="-3" y="-44" width="6" height="26" rx="2.5" fill="url(#ob-brass)" />
        <circle cx="0" cy="-32" r="4.6" fill="url(#ob-brass)" />
        <path d="M-16 -44h32l-4.5 -6h-23Z" fill="url(#ob-brass)" />
        <rect x="-19" y="-55" width="38" height="6" rx="3" fill="url(#ob-brass)" />
        <path d="M-17 -54q17 -5 34 0" fill="none" stroke="#FFF7D6" strokeWidth="1.2" opacity="0.85" />
        <rect x="-1.6" y="-62" width="3.2" height="7" rx="1" fill="#7c4a12" />
        <g className="lamp-flame"><path d="M0 -80c6 7 7 12 0 18-7-6-6-11 0-18Z" fill="#F97316" /><path d="M0 -77c4 5 4.6 8 0 12.4-4.6-4.4-4-7.4 0-12.4Z" fill="#FDE047" /><path d="M0 -73c1.8 2.4 2 4 0 6.2-2-2.2-1.8-3.8 0-6.2Z" fill="#FFFBEB" /></g>
      </g>
    </Art>
  );
}

// ── 5. Premium display & jackets: open broadsheet with sunset jacket and glass light-sweep ────
export function JacketsArt() {
  const page = (side: "l" | "r") => {
    const left = side === "l";
    return (
      <g transform={left ? "translate(40 42) skewY(-9.7)" : "translate(122 28) skewY(9.7)"}>
        <clipPath id={`jk-c-${side}`}><rect width="82" height="108" /></clipPath>
        <rect width="82" height="108" fill={`url(#jk-paper-${side})`} />
        <g clipPath={`url(#jk-c-${side})`}>
          {/* upper jacket wrap */}
          <rect width="82" height="28" fill="url(#jk-sun)" />
          <rect y="26" width="82" height="2.4" fill="#4c1d95" opacity="0.4" />
          <rect x={left ? 8 : 6} y="8" width={left ? 50 : 40} height="9" rx="2.2" fill="#fff" opacity="0.96" />
          <rect x={left ? 8 : 6} y="19" width={left ? 30 : 26} height="3" rx="1.5" fill="#fff" opacity="0.6" />
          {!left && <g><rect x="52" y="5" width="24" height="18" rx="3" fill="#fff" opacity="0.95" /><rect x="56" y="9" width="16" height="3.4" rx="1.7" fill="#7C3AED" /><rect x="56" y="15" width="10" height="3.4" rx="1.7" fill="#F97316" /></g>}
          {/* headline + photo + mini ad layouts */}
          <rect x="6" y="36" width="70" height="8" rx="2" fill="#1e293b" opacity="0.88" />
          <rect x="6" y="48" width="33" height="25" rx="3" fill="url(#jk-img)" />
          <path d="M6 73l11-11 8 7 7-9 7 9v4Z" fill="#fff" opacity="0.45" />
          {[0, 1, 2].map((i) => <rect key={i} x="43" y={49 + i * 8} width={[31, 25, 29][i]} height="4" rx="2" fill="#94a3b8" opacity="0.9" />)}
          <rect x="6" y="78" width="32" height="24" rx="3" fill="#fff" stroke="#F97316" strokeWidth="1.2" /><rect x="9" y="82" width="26" height="4" rx="2" fill="#F97316" /><rect x="9" y="89" width="18" height="3" rx="1.5" fill="#94a3b8" /><rect x="9" y="95" width="12" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="43" y="78" width="33" height="24" rx="3" fill="#fff" stroke="#7C3AED" strokeWidth="1.2" /><rect x="46" y="82" width="12" height="9" rx="2" fill="#7C3AED" opacity="0.85" /><rect x="60" y="82" width="13" height="3" rx="1.5" fill="#94a3b8" /><rect x="60" y="88" width="9" height="3" rx="1.5" fill="#94a3b8" /><rect x="46" y="95" width="24" height="3" rx="1.5" fill="#94a3b8" />
          {/* fold-depth shading toward the spine */}
          <rect width="82" height="108" fill={`url(#jk-fold-${side})`} />
        </g>
      </g>
    );
  };
  return (
    <Art>
      <defs>
        <Shadow id="jk-sh" dy={10} blur={6} />
        <Lin id="jk-sun" x2={1} y2={1}><Stop o={0} c="#F97316" /><Stop o={0.5} c="#F43F5E" /><Stop o={1} c="#7C3AED" /></Lin>
        <Lin id="jk-paper-l" x2={1} y2={0}><Stop o={0} c="#fffdf8" /><Stop o={1} c="#e8dfc8" /></Lin>
        <Lin id="jk-paper-r" x2={1} y2={0}><Stop o={0} c="#e1d7bd" /><Stop o={1} c="#faf4e4" /></Lin>
        <Lin id="jk-fold-l" x2={1} y2={0}><Stop o={0.6} c="#3b2f14" a={0} /><Stop o={1} c="#3b2f14" a={0.3} /></Lin>
        <Lin id="jk-fold-r" x2={1} y2={0}><Stop o={0} c="#3b2f14" a={0.3} /><Stop o={0.4} c="#3b2f14" a={0} /></Lin>
        <Lin id="jk-img" x2={1} y2={1}><Stop o={0} c="#bfdbfe" /><Stop o={1} c="#818cf8" /></Lin>
        <Lin id="jk-beam" x2={1} y2={0}><Stop o={0} c="#fff" a={0} /><Stop o={0.5} c="#fff" a={0.8} /><Stop o={1} c="#fff" a={0} /></Lin>
        <clipPath id="jk-all"><path d="M40 42L122 28L204 42V150L122 136L40 150Z" /></clipPath>
        <path id="jk-shape" d="M40 42L122 28L204 42V150L122 136L40 150Z" />
      </defs>
      {/* page-stack thickness */}
      <g filter="url(#jk-sh)">
        {[8, 7, 6, 5, 4, 3, 2, 1].map((k) => <use key={k} href="#jk-shape" transform={`translate(0 ${k * 0.9})`} fill={k % 2 ? "#d8cdb0" : "#efe6cf"} />)}
        {page("l")}{page("r")}
      </g>
      <path d="M122 28V136" stroke="#3b2f14" strokeWidth="1.4" opacity="0.35" />
      <path d="M121 28V136" stroke="#fff" strokeWidth="0.8" opacity="0.7" />
      {/* glass light sweep across the cover */}
      <g clipPath="url(#jk-all)"><rect className="svg-sweep" x="-10" y="20" width="30" height="140" fill="url(#jk-beam)" transform="skewX(-22)" opacity="0.7" /></g>
      <path d="M44 44L120 31V50L44 63Z" fill="#fff" opacity="0.16" />
    </Art>
  );
}

// ── 6. Commercial display: isometric sale badge, relief lettering, hanging tag, raised banner ─
const spark = (cx: number, cy: number, s: number) => `M${cx} ${cy - s}Q${cx} ${cy} ${cx + s} ${cy}Q${cx} ${cy} ${cx} ${cy + s}Q${cx} ${cy} ${cx - s} ${cy}Q${cx} ${cy} ${cx} ${cy - s}Z`;

export function CommercialDisplayArt() {
  const relief = (y: number, size: number, text: string, fill: string, layers = 6) => (
    <>
      {Array.from({ length: layers }, (_, i) => layers - i).map((d) => <text key={d} x={118 + d * 0.8} y={y + d * 1.05} textAnchor="middle" fontSize={size} fontWeight="900" fill={d > layers - 2 ? "#2e1065" : "#4c1d95"} fontFamily={DISPLAY}>{text}</text>)}
      <text x="118" y={y} textAnchor="middle" fontSize={size} fontWeight="900" fill={fill} stroke="#fff" strokeOpacity="0.6" strokeWidth="0.7" fontFamily={DISPLAY}>{text}</text>
    </>
  );
  return (
    <Art>
      <defs>
        <Shadow id="cm-sh" dy={11} blur={7} />
        <Shadow id="cm-sh2" dy={5} blur={3} />
        <Blur id="cm-blur" s={3} />
        <Lin id="cm-card" x2={1} y2={1}><Stop o={0} c="#F0ABFC" /><Stop o={0.4} c="#C026D3" /><Stop o={1} c="#6B21A8" /></Lin>
        <Lin id="cm-white" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#ffffff" /><Stop o={1} c="#fbcfe8" /></Lin>
        <Lin id="cm-yellow" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#FEF9C3" /><Stop o={0.5} c="#FDE047" /><Stop o={1} c="#EAB308" /></Lin>
        <Lin id="cm-tag" x2={1} y2={1}><Stop o={0} c="#FEF3C7" /><Stop o={0.4} c="#FBBF24" /><Stop o={1} c="#B45309" /></Lin>
        <Lin id="cm-ribbon" x1={0} y1={0} x2={0} y2={1}><Stop o={0} c="#FB7185" /><Stop o={1} c="#BE123C" /></Lin>
        <Lin id="cm-gloss" x1={0} y1={0} x2={1} y2={1}><Stop o={0} c="#fff" a={0.55} /><Stop o={0.6} c="#fff" a={0.05} /><Stop o={1} c="#fff" a={0} /></Lin>
        <rect id="cm-box" x="34" y="26" width="168" height="98" rx="18" />
      </defs>
      <ellipse cx="124" cy="142" rx="84" ry="9" fill="#000" opacity="0.2" filter="url(#cm-blur)" />
      {/* isometric card: extruded depth, glossy face */}
      <g transform="translate(120 76) skewY(-5) rotate(-4) translate(-120 -76)">
        <g filter="url(#cm-sh)">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((k) => <use key={k} href="#cm-box" transform={`translate(${k * 0.6} ${k})`} fill={k > 6 ? "#2e1065" : "#4c1d95"} />)}
          <use href="#cm-box" fill="url(#cm-card)" />
        </g>
        <use href="#cm-box" fill="url(#cm-gloss)" />
        <use href="#cm-box" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.55" />
        <text x="118" y="50" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff" letterSpacing="3.4" fontFamily={DISPLAY} opacity="0.95">GRAND LAUNCH</text>
        {relief(86, 33, "50% OFF", "url(#cm-yellow)", 7)}
        <path className="svg-twinkle" d={spark(52, 44, 8)} fill="#fff" />
        <path className="svg-twinkle" style={{ animationDelay: "0.7s" }} d={spark(190, 100, 7)} fill="#FEF08A" />
        <path className="svg-twinkle" style={{ animationDelay: "1.3s" }} d={spark(58, 104, 5)} fill="#fff" />
        <path className="svg-twinkle" style={{ animationDelay: "0.3s" }} d={spark(176, 38, 5)} fill="#fff" />
        {/* raised SALE banner with folded tails */}
        <g filter="url(#cm-sh2)">
          <path d="M18 100l14 5 -4 9 -14 -5Z" fill="#9F1239" transform="translate(0 10)" />
          <path d="M214 100l-14 5 4 9 14 -5Z" fill="#9F1239" transform="translate(0 10)" />
          <path d="M22 98H212L206 112L212 126H22L28 112Z" fill="url(#cm-ribbon)" transform="translate(0 6)" />
          <path d="M22 98H212" stroke="#fff" strokeWidth="1.2" opacity="0.7" transform="translate(0 6)" />
          <path d="M22 104H212" stroke="#fff" strokeWidth="0.8" opacity="0.35" transform="translate(0 6)" />
        </g>
        <text x="117" y="125" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" letterSpacing="5" fontFamily={DISPLAY}>SALE</text>
      </g>
      {/* golden discount tag on a thread */}
      <g className="svg-swing">
        <path d="M205 4C203 12 207 20 203 30" fill="none" stroke="#f5d0fe" strokeWidth="1.1" />
        <g filter="url(#cm-sh2)">
          <path d="M193 32h22a4 4 0 0 1 4 4v22a4 4 0 0 1-1.2 2.8l-9 9a4 4 0 0 1-5.6 0l-9-9a4 4 0 0 1-1.2-2.8V36a4 4 0 0 1 4-4Z" fill="url(#cm-tag)" transform="rotate(8 204 52)" />
        </g>
        <g transform="rotate(8 204 52)"><circle cx="204" cy="38" r="2.6" fill="#7c2d12" opacity="0.8" /><circle cx="204" cy="38" r="1.1" fill="#fff" opacity="0.8" /><path d="M196 36h16" stroke="#fff" strokeWidth="1" opacity="0.6" /><text x="204" y="58" textAnchor="middle" fontSize="13" fontWeight="900" fill="#7c2d12" fontFamily={DISPLAY}>%</text><text x="204" y="66" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#7c2d12" fontFamily={SANS}>OFF</text></g>
      </g>
    </Art>
  );
}

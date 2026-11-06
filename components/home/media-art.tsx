/*
 * Micro-illustrations for the home media cards. Each is animated with CSS keyframes (globals.css, "art-*"):
 * transform and opacity only, intensified by the card's group-hover and switched off for reduced motion.
 * Fixed hex colours (not theme tokens) so they
 * read as printed / painted artwork in both themes. Each fills a 200×120 viewBox.
 */
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 200 120" className="art-root h-full w-full overflow-visible" aria-hidden="true" preserveAspectRatio="xMidYMid meet">{children}</svg>
);
const bars = (x: number, y: number, w: number, n: number, c = "#a8a29e") =>
  Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * 6} width={i % 4 === 3 ? w * 0.6 : w - (i % 3) * 5} height="2.6" rx="1.3" fill={c} />);

/** Newspaper: a broadsheet with a Malayalam masthead, ruled columns, a photo and a boxed ad. */
export function NewspaperArt() {
  return (
    <Svg>
      <g transform="rotate(-3 100 60)">
        <g className="art-anim" style={{ animationName: "art-float", animationDuration: "6s" }}>
        <rect x="42" y="8" width="116" height="106" fill="#fffdf8" stroke="#1c1917" strokeWidth="1.2" />
        <text x="100" y="27" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1c1917" fontFamily='"Noto Serif Malayalam", serif'>ദിനപത്രം</text>
        <line x1="48" y1="32" x2="152" y2="32" stroke="#1c1917" strokeWidth="2" />
        <line x1="48" y1="35" x2="152" y2="35" stroke="#1c1917" strokeWidth="0.6" />
        <rect x="48" y="40" width="40" height="28" fill="#cfd6cf" stroke="#1c1917" strokeWidth="0.8" />
        {bars(92, 41, 58, 5)}
        {bars(48, 73, 48, 6)}
        <rect x="102" y="72" width="48" height="36" fill="#ecfdf5" stroke="#047857" strokeWidth="1.4" />
        <rect x="106" y="76" width="12" height="12" fill="#6ee7b7" />
        {bars(121, 77, 26, 3, "#047857")}
        {bars(106, 93, 40, 2, "#6b7280")}
        {/* highlighter stroke drawing itself across a line of copy */}
        <rect className="art-anim" x="90" y="40" width="62" height="6" rx="1" fill="#fde047" opacity="0.6" style={{ animationName: "art-draw", animationDuration: "5s", transformOrigin: "0% 50%" }} />
        </g>
      </g>
    </Svg>
  );
}

/** Digital: browser window with a banner, ad tiles and a cursor. */
export function DigitalArt() {
  return (
    <Svg>
      <rect x="30" y="14" width="140" height="94" rx="4" fill="#ffffff" stroke="#0e7490" strokeWidth="1.4" />
      <rect x="30" y="14" width="140" height="14" rx="4" fill="#0e7490" />
      {[40, 49, 58].map((x) => <circle key={x} cx={x} cy="21" r="2.4" fill="#cffafe" />)}
      <rect x="68" y="17.5" width="90" height="7" rx="3.5" fill="#cffafe" />
      <rect x="38" y="35" width="124" height="26" rx="2" fill="#22d3ee" />
      <rect x="46" y="42" width="56" height="5" rx="2.5" fill="#ffffff" />
      <rect x="46" y="51" width="34" height="4" rx="2" fill="#cffafe" />
      {[38, 82, 126].map((x, i) => (<g key={x} className="art-anim" style={{ animationName: "art-tile", animationDelay: `${i * 0.35}s` }}><rect x={x} y="68" width="36" height="32" rx="2" fill="#ecfeff" stroke="#67e8f9" /><rect x={x + 4} y="72" width="28" height="14" fill="#a5f3fc" /><rect x={x + 4} y="90" width="20" height="3" rx="1.5" fill="#67e8f9" /></g>))}
      <path className="art-anim" d="M142 74l0 22 6-5 4 9 4-2-4-9 8 0z" fill="#0f172a" stroke="#fff" strokeWidth="1" style={{ animationName: "art-click", animationDuration: "3.6s", transformOrigin: "0% 0%" }} />
    </Svg>
  );
}

/** Radio: a tabletop set with speaker grille, dial and sound arcs. */
export function RadioArt() {
  return (
    <Svg>
      <line x1="138" y1="40" x2="170" y2="10" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
      <rect x="34" y="40" width="132" height="66" rx="8" fill="#f59e0b" stroke="#78350f" strokeWidth="1.6" />
      <rect x="42" y="48" width="52" height="50" rx="4" fill="#fde68a" stroke="#78350f" />
      {Array.from({ length: 7 }, (_, i) => <line key={i} x1="48" y1={55 + i * 6} x2="88" y2={55 + i * 6} stroke="#b45309" strokeWidth="2" strokeLinecap="round" />)}
      <rect x="102" y="48" width="56" height="18" rx="3" fill="#fffbeb" stroke="#78350f" />
      <line x1="108" y1="57" x2="152" y2="57" stroke="#d97706" />
      <line x1="126" y1="51" x2="126" y2="63" stroke="#b91c1c" strokeWidth="1.6" />
      <circle cx="115" cy="86" r="9" fill="#fffbeb" stroke="#78350f" /><circle cx="145" cy="86" r="9" fill="#fffbeb" stroke="#78350f" />
      <line className="art-anim" x1="115" y1="86" x2="119" y2="81" stroke="#78350f" strokeWidth="1.6" style={{ animationName: "art-vibrate", animationDuration: "1.6s", transformOrigin: "115px 86px" }} />
      <line className="art-anim" x1="145" y1="86" x2="141" y2="82" stroke="#78350f" strokeWidth="1.6" style={{ animationName: "art-vibrate", animationDuration: "1.9s", transformOrigin: "145px 86px" }} />
      <path className="art-anim" d="M18 62c-6 6-6 18 0 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" style={{ animationName: "art-ripple", animationDuration: "2.4s", transformOrigin: "100% 50%" }} />
      <path className="art-anim" d="M10 54c-11 11-11 38 0 49" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" style={{ animationName: "art-ripple", animationDuration: "2.4s", animationDelay: "0.8s", transformOrigin: "100% 50%" }} />
      <circle className="art-anim" cx="154" cy="55" r="2.2" fill="#dc2626" style={{ animationName: "art-blink", animationDuration: "1.8s" }} />
    </Svg>
  );
}

/** Cinema: clapperboard over a film strip. */
export function CinemaArt() {
  return (
    <Svg>
      <rect x="14" y="88" width="172" height="22" fill="#1c1917" />
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={19 + i * 12.3} y="92" width="6" height="5" fill="#fafaf9" rx="1" />)}
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={19 + i * 12.3} y="102" width="6" height="5" fill="#fafaf9" rx="1" />)}
      <rect x="44" y="40" width="112" height="44" fill="#1c1917" stroke="#1c1917" strokeWidth="1.5" />
      <g className="art-anim" style={{ animationName: "art-clap", animationDuration: "4.2s", transformOrigin: "44px 38px", transformBox: "view-box", transform: "rotate(-12deg)" }}>
        <rect x="44" y="22" width="112" height="16" fill="#1c1917" />
        {Array.from({ length: 6 }, (_, i) => <polygon key={i} points={`${50 + i * 19},38 ${60 + i * 19},38 ${70 + i * 19},22 ${60 + i * 19},22`} fill="#fda4af" />)}
      </g>
      <rect x="44" y="40" width="112" height="9" fill="#e11d48" />
      {Array.from({ length: 6 }, (_, i) => <polygon key={i} points={`${50 + i * 19},49 ${60 + i * 19},49 ${70 + i * 19},40 ${60 + i * 19},40`} fill="#fff1f2" />)}
      {[56, 66, 76].map((y) => <rect key={y} x="52" y={y} width="60" height="3" rx="1.5" fill="#a8a29e" />)}
      <circle className="art-anim" cx="136" cy="68" r="9" fill="#e11d48" opacity="0.5" style={{ animationName: "art-halo", animationDuration: "2.2s" }} />
      <circle cx="136" cy="68" r="9" fill="#e11d48" /><polygon points="133,63 133,73 141,68" fill="#fff" />
    </Svg>
  );
}

/** Television: set on a stand with a channel bug and a spot-break banner. */
export function TvArt() {
  return (
    <Svg>
      <rect x="36" y="14" width="128" height="80" rx="8" fill="#5b21b6" />
      <rect x="44" y="22" width="112" height="64" rx="4" fill="#ddd6fe" />
      <rect x="50" y="28" width="52" height="30" fill="#a78bfa" />
      <g className="art-anim" style={{ animationName: "art-beat", animationDuration: "2.6s" }}><circle cx="76" cy="43" r="9" fill="#ede9fe" /><polygon points="73,38 73,48 82,43" fill="#6d28d9" /></g>
      <rect x="108" y="30" width="42" height="4" rx="2" fill="#6d28d9" /><rect x="108" y="38" width="30" height="3" rx="1.5" fill="#8b5cf6" />
      <rect x="50" y="66" width="100" height="14" fill="#6d28d9" /><rect x="55" y="70" width="52" height="3.5" rx="1.7" fill="#fff" /><rect x="55" y="75" width="30" height="2.5" rx="1.2" fill="#ddd6fe" />
      <rect x="140" y="26" width="12" height="7" rx="1.5" fill="#dc2626" />
      <path d="M72 94l-8 16h72l-8-16z" fill="#5b21b6" /><rect x="58" y="108" width="84" height="4" rx="2" fill="#3b0764" />
      <clipPath id="tv-screen-clip"><rect x="44" y="22" width="112" height="64" rx="4" /></clipPath>
      <g clipPath="url(#tv-screen-clip)"><rect className="art-anim" x="44" y="22" width="112" height="10" fill="#fff" opacity="0.28" style={{ animationName: "art-scan", animationDuration: "3.4s", animationTimingFunction: "linear" }} /></g>
      {[[72, 2, "0s"], [130, 2, "0.9s"]].map(([cx, cy, d]) => (
        <circle key={String(cx)} className="art-anim" cx={cx as number} cy={cy as number} r="5" fill="none" stroke="#7c3aed" strokeWidth="1.2" style={{ animationName: "art-ring", animationDuration: "2.2s", animationDelay: d as string }} />
      ))}
      <line x1="88" y1="14" x2="72" y2="2" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round" /><line x1="112" y1="14" x2="130" y2="2" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Outdoor & transit: a roadside hoarding and a bus with a side panel. */
export function OutdoorArt() {
  return (
    <Svg>
      <line x1="20" y1="108" x2="190" y2="108" stroke="#57534e" strokeWidth="2" />
      <rect x="40" y="52" width="5" height="56" fill="#78716c" /><rect x="76" y="52" width="5" height="56" fill="#78716c" />
      <rect x="28" y="12" width="64" height="42" fill="#f7fee7" stroke="#3f6212" strokeWidth="2" />
      <rect x="34" y="18" width="30" height="30" fill="#a3e635" /><rect x="68" y="20" width="18" height="4" rx="2" fill="#3f6212" /><rect x="68" y="28" width="14" height="3" rx="1.5" fill="#4d7c0f" /><rect x="68" y="36" width="18" height="8" rx="1" fill="#65a30d" />
      <g className="art-anim" style={{ animationName: "art-roll", animationDuration: "3s" }}>
      <rect x="104" y="58" width="82" height="42" rx="6" fill="#65a30d" />
      <rect x="110" y="64" width="14" height="12" fill="#ecfccb" /><rect x="128" y="64" width="14" height="12" fill="#ecfccb" /><rect x="146" y="64" width="34" height="12" fill="#ecfccb" />
      <rect x="110" y="80" width="68" height="12" fill="#f7fee7" stroke="#3f6212" strokeWidth="1" /><rect x="114" y="84" width="34" height="3.5" rx="1.7" fill="#3f6212" />
      <circle cx="124" cy="102" r="7" fill="#292524" /><circle cx="124" cy="102" r="3" fill="#d6d3d1" /><circle cx="166" cy="102" r="7" fill="#292524" /><circle cx="166" cy="102" r="3" fill="#d6d3d1" />
      </g>
      <polygon className="art-anim" points="22,2 36,2 74,54 12,54" fill="#fef9c3" opacity="0.35" style={{ animationName: "art-beam", animationDuration: "5s" }} />
      <clipPath id="billboard-clip"><rect x="28" y="12" width="64" height="42" /></clipPath>
      <g clipPath="url(#billboard-clip)"><rect className="art-anim" x="28" y="12" width="14" height="42" fill="#fff" opacity="0.4" style={{ animationName: "art-shine", animationDuration: "4.5s", animationTimingFunction: "ease-in-out" }} /></g>
    </Svg>
  );
}

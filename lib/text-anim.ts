/**
 * Deterministic canvas text animations for greeting videos. Every effect is a pure function of the video timestamp `t` (seconds), so the studio's live
 * preview (play, pause, scrubbing) and the 30 fps MP4 encoder draw exactly the same picture for the same `t`.
 */
export type TextAnim = "none" | "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom-in" | "zoom-out" | "bounce" | "typewriter" | "word" | "curtain" | "shimmer" | "float" | "pulse" | "slam-3d" | "glitch-neon" | "gold-shimmer" | "elastic-pop" | "cinematic-blur" | "sparkle-burst";

export const TEXT_ANIMS: { id: TextAnim; label: string; group: "static" | "entrance" | "loop" }[] = [
  { id: "none", label: "None (Static)", group: "static" },
  { id: "fade", label: "Fade In", group: "entrance" },
  { id: "slide-up", label: "Slide Up", group: "entrance" },
  { id: "slide-down", label: "Slide Down", group: "entrance" },
  { id: "slide-left", label: "Slide Left", group: "entrance" },
  { id: "slide-right", label: "Slide Right", group: "entrance" },
  { id: "zoom-in", label: "Zoom In (Pop)", group: "entrance" },
  { id: "zoom-out", label: "Zoom Out (Cinematic)", group: "entrance" },
  { id: "bounce", label: "Bounce In", group: "entrance" },
  { id: "typewriter", label: "Typewriter", group: "entrance" },
  { id: "word", label: "Word-by-Word Reveal", group: "entrance" },
  { id: "curtain", label: "Curtain Wipe", group: "entrance" },
  { id: "shimmer", label: "Soft Glint", group: "loop" },
  { id: "float", label: "Gentle Float", group: "loop" },
  { id: "pulse", label: "Soft Pulse / Festive Glow", group: "loop" },
  // Cinematic presets: bold entrances, glitch / metallic loops and sparkles. Pure functions of time like every other effect.
  { id: "slam-3d", label: "3D Flip Slam", group: "entrance" },
  { id: "elastic-pop", label: "Elastic Rubber Pop", group: "entrance" },
  { id: "cinematic-blur", label: "Cinematic Blur Zoom", group: "entrance" },
  { id: "sparkle-burst", label: "Sparkle Burst", group: "entrance" },
  { id: "glitch-neon", label: "Neon Glitch", group: "loop" },
  { id: "gold-shimmer", label: "Gold Shimmer Sweep", group: "loop" },
];
/** How a layer leaves the screen. */
export type ExitAnim = "none" | "fade-out" | "slide-up-out" | "slide-down-out" | "zoom-out-exit";
export const EXIT_ANIMS: { id: ExitAnim; label: string }[] = [
  { id: "none", label: "Stay Visible" }, { id: "fade-out", label: "Fade Out" }, { id: "slide-up-out", label: "Slide Up Out" },
  { id: "slide-down-out", label: "Slide Down Out" }, { id: "zoom-out-exit", label: "Zoom Out" },
];
export const EXIT_SECONDS = 0.7;
/** Per-layer timing as saved with the draft. `null` = automatic (preset default / 1.2 s before the end of the clip). */
export interface AnimTiming { speed: number; startIn: number; duration: number | null; exit: ExitAnim; outTime: number | null }
export const SPEED_RANGE = { min: 0.4, max: 2.5 }, START_RANGE = { min: 0, max: 10 }, DURATION_RANGE = { min: 0.3, max: 5 };
export const defaultTiming = (layer: "header" | "footer"): AnimTiming => ({ speed: 1, startIn: layer === "footer" ? 0.4 : 0, duration: null, exit: "none", outTime: null });
/** Preset's own entrance length at 1x (s): what `duration` replaces. */
const NATURAL: Partial<Record<TextAnim, number>> = { typewriter: 2.6, word: 2.4, curtain: 0.9, bounce: 0.95, "zoom-in": 0.75, "slam-3d": 0.9, "elastic-pop": 1, "cinematic-blur": 1.1, "sparkle-burst": 1.2, "glitch-neon": 0.6, "gold-shimmer": 0.7 };
export const defaultDuration = (a: TextAnim) => (a === "typewriter" || a === "word" ? 2.2 : 0.9);
/** Everything the drawing code needs, all numbers resolved. */
export interface AnimConfig extends Omit<AnimTiming, "duration" | "outTime"> { preset: TextAnim; duration: number; outTime: number }
const num = (v: unknown, d: number, a: number, b: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d);
/** Validates saved / typed timing and resolves defaults. `videoDuration` clamps the exit time to the clip. */
export function buildAnimConfig(preset: TextAnim, timing: Partial<AnimTiming> | undefined, layer: "header" | "footer", videoDuration: number): AnimConfig {
  const d = defaultTiming(layer), tm = timing ?? {};
  const exit = EXIT_ANIMS.some((e) => e.id === tm.exit) ? (tm.exit as ExitAnim) : "none";
  const out = num(tm.outTime, Math.max(0, videoDuration - 1.2), 0, 1e9);
  return {
    preset, exit,
    speed: num(tm.speed, d.speed, SPEED_RANGE.min, SPEED_RANGE.max),
    startIn: num(tm.startIn, d.startIn, START_RANGE.min, START_RANGE.max),
    duration: num(tm.duration, defaultDuration(preset), DURATION_RANGE.min, DURATION_RANGE.max),
    outTime: Math.min(out, Math.max(0, videoDuration)),
  };
}
export const NO_ANIM: AnimConfig = { preset: "none", speed: 1, startIn: 0, duration: 0.9, exit: "none", outTime: 0 };
export const isTextAnim = (v: unknown): v is TextAnim => TEXT_ANIMS.some((a) => a.id === v);

/** Where each grapheme / word of one text line sits inside its sprite (px): `g[k]` is the right edge after k+1 graphemes. */
export interface RevealLine { y0: number; y1: number; g: number[]; words: { x0: number; x1: number; first: number; last: number }[] }
/**
 * A text overlay as pixels. `bg` (the dark pill) and `fg` (the text) are optional separate layers: reveal effects (typewriter, word-by-word) act on the text
 * only. Without them `canvas` is the whole thing and reveals clip it, pill included.
 */
export interface AnimSprite { canvas: HTMLCanvasElement; bg?: HTMLCanvasElement; fg?: HTMLCanvasElement; reveal: RevealLine[] }

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** Splits into grapheme clusters (Malayalam conjuncts / chillaksharam and emoji stay whole). */
export function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
}

/** Reveal geometry for a sprite whose text layout isn't known (the greeting badge): positions are spread by grapheme count across the text area. */
export function plainReveal(text: string, w: number, h: number): RevealLine[] {
  const gs = graphemes(text), n = Math.max(1, gs.length), x0 = w * 0.1, span = w * 0.8;
  const g = gs.map((_, i) => (i === n - 1 ? w : x0 + (span * (i + 1)) / n));
  const words: RevealLine["words"] = []; let i = 0;
  while (i < gs.length) {
    while (i < gs.length && /^\s+$/.test(gs[i])) i++;
    const a = i; while (i < gs.length && !/^\s+$/.test(gs[i])) i++;
    if (i > a) words.push({ x0: a === 0 ? 0 : x0 + (span * a) / n, x1: i === n ? w : x0 + (span * i) / n, first: a, last: i - 1 });
  }
  return [{ y0: 0, y1: h, g, words }];
}

let tmp: HTMLCanvasElement | null = null;
const scratch = (w: number, h: number) => { tmp ??= document.createElement("canvas"); if (tmp.width !== w) tmp.width = w; if (tmp.height !== h) tmp.height = h; const c = tmp.getContext("2d")!; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, w, h); return { cv: tmp, c }; };

let tmp2: HTMLCanvasElement | null = null;
const scratch2 = (w: number, h: number) => { tmp2 ??= document.createElement("canvas"); if (tmp2.width !== w) tmp2.width = w; if (tmp2.height !== h) tmp2.height = h; const c = tmp2.getContext("2d")!; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.clearRect(0, 0, w, h); return { cv: tmp2, c }; };
/** Deterministic pseudo-random in [0, 1) from an integer seed: the same value in the preview and in every exported frame. */
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** `layer` recoloured to a flat `color` (keeps its alpha shape). */
function tinted(layer: HTMLCanvasElement, color: string) { const { cv, c } = scratch2(layer.width, layer.height); c.drawImage(layer, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = color; c.fillRect(0, 0, layer.width, layer.height); return cv; }

/** Four-point golden sparkle centred on (x, y), radius r. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.fillStyle = "rgba(255,226,140,1)"; ctx.shadowColor = "rgba(255,200,80,0.9)"; ctx.shadowBlur = r * 1.6;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r); ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r); ctx.fill();
  ctx.restore();
}

/**
 * Draws `sp` centred at (cx, cy) on `ctx` as it looks at time `t`. `k` = frame width / 1080: distances below are quoted at 1080 wide and scale with it.
 */
export function drawAnimated(ctx: CanvasRenderingContext2D, sp: AnimSprite, cx: number, cy: number, clock: number, cfg: AnimConfig, k: number) {
  const W = sp.canvas.width, H = sp.canvas.height, anim = cfg.preset;
  // Before "Start In" the layer is hidden. After it, entrance effects run on a clock scaled by speed and by natural/duration, loops on speed alone.
  if (clock < cfg.startIn) return;
  const local = clock - cfg.startIn, tl = local * cfg.speed, t = local * cfg.speed * ((NATURAL[anim] ?? 0.85) / cfg.duration);
  let alpha = 1, dx = 0, dy = 0, sc = 1, glow = 0, sx = 1, sy = 1, blurPx = 0, glowRGB = "255,205,100";
  const fade = (dur = 0.85) => easeOut(prog(t, 0, dur));
  switch (anim) {
    case "fade": alpha = fade(); break;
    case "slide-up": { const e = fade(); alpha = e; dy = 28 * k * (1 - e); break; }
    case "slide-down": { const e = fade(); alpha = e; dy = -28 * k * (1 - e); break; }
    case "slide-left": { const e = fade(); alpha = e; dx = 40 * k * (1 - e); break; }
    case "slide-right": { const e = fade(); alpha = e; dx = -40 * k * (1 - e); break; }
    case "zoom-in": { const e = easeOut(prog(t, 0, 0.75)); alpha = e; sc = 0.8 + 0.2 * e; break; }
    case "zoom-out": { const e = easeOut(prog(t, 0, 0.85)); alpha = e; sc = 1.22 - 0.22 * e; break; }
    case "bounce": { const u = prog(t, 0, 0.95); const s = u >= 1 ? 1 : 1 - Math.exp(-5.5 * u) * Math.cos(10 * u); alpha = clamp(u * 5); sc = Math.max(0.05, 0.7 + 0.3 * s); dy = (1 - s) * 34 * k; break; }
    case "shimmer": alpha = fade(0.7); break;
    case "float": alpha = fade(0.7); dy = 3.5 * k * Math.sin((2 * Math.PI * tl) / 3); break;
    case "pulse": { alpha = fade(0.7); const b = (1 - Math.cos((2 * Math.PI * tl) / 2.6)) / 2; sc = 1 + 0.035 * b; glow = 0.35 + 0.65 * b; break; }
    case "slam-3d": { // perspective flip (vertical foreshortening) that accelerates into the card, then a damped punch + shake on impact
      const u = prog(t, 0, 0.9), p1 = clamp(u / 0.55), ang = (Math.PI * 85 / 180) * (1 - p1 * p1), q = clamp((u - 0.55) / 0.45);
      sy = Math.max(0.02, Math.cos(ang)); sx = 1 + 0.12 * Math.sin(ang);
      sc = (1.5 - 0.5 * p1) * (u > 0.55 ? 1 + 0.14 * Math.exp(-6 * q) * Math.cos(14 * q) : 1);
      dy = u > 0.55 ? 6 * k * Math.exp(-8 * q) * Math.sin(30 * q) : 0; alpha = clamp(u * 6); break;
    }
    case "elastic-pop": { // from nothing, overshoots ~30 % and wobbles to rest, with squash and stretch
      const u = prog(t, 0, 1), s0 = u >= 1 ? 1 : 1 - Math.exp(-4.2 * u) * Math.cos(13 * u), w = u >= 1 ? 0 : 0.12 * Math.sin(13 * u) * Math.exp(-4 * u);
      sx = Math.max(0.001, s0) * (1 + w); sy = Math.max(0.001, s0) * (1 - w); alpha = clamp(u * 8); break;
    }
    case "cinematic-blur": { const e = easeOut(prog(t, 0, 1.1)); sc = 1.5 - 0.5 * e; blurPx = 22 * k * (1 - e); alpha = clamp(e * 1.6); break; }
    case "sparkle-burst": { const e = easeOut(prog(t, 0, 0.7)); alpha = e; sc = 0.92 + 0.08 * e; break; }
    case "glitch-neon": { const b = (1 - Math.cos((2 * Math.PI * tl) / 1.4)) / 2; alpha = clamp(t / 0.12 > 1 ? 1 : (hash(Math.floor(t * 40)) > 0.35 ? 1 : 0.25)); glow = 0.55 + 0.45 * b; glowRGB = "0,240,255"; break; }
    case "gold-shimmer": alpha = fade(0.7); break;
    default: break;
  }
  if (cfg.exit !== "none") {
    const u = prog(clock, cfg.outTime, EXIT_SECONDS), e = u * u * (3 - 2 * u);
    alpha *= 1 - e;
    if (cfg.exit === "slide-up-out") dy -= 24 * k * e; else if (cfg.exit === "slide-down-out") dy += 24 * k * e; else if (cfg.exit === "zoom-out-exit") sc *= 1 - 0.18 * e;
  }
  if (alpha <= 0.001) return;
  const text = sp.fg ?? sp.canvas;
  ctx.save();
  ctx.translate(Math.round(cx + dx), Math.round(cy + dy)); ctx.scale(sc * sx, sc * sy);
  ctx.globalAlpha = alpha;
  if (glow) { ctx.shadowColor = `rgba(${glowRGB},${0.85 * glow})`; ctx.shadowBlur = 22 * k * glow * (anim === "glitch-neon" ? 1.7 : 1); }
  if (blurPx > 0.2) (ctx as CanvasRenderingContext2D & { filter: string }).filter = `blur(${blurPx.toFixed(1)}px)`; // not supported everywhere (older Safari): the effect then simply has no blur
  const x0 = -W / 2, y0 = -H / 2;
  const reveal = anim === "typewriter" || anim === "word";
  // The pill / backdrop layer: always whole, fading in for reveal effects.
  if (sp.bg && reveal) { ctx.save(); if (reveal) ctx.globalAlpha = alpha * easeOut(prog(t, 0, 0.5)); ctx.drawImage(sp.bg, x0, y0); ctx.restore(); }

  if (anim === "typewriter") {
    const total = sp.reveal.reduce((a, l) => a + l.g.length, 0), shown = Math.floor(total * easeLinear(prog(t, 0.25, 2.35)) + 1e-9);
    if (shown >= total) ctx.drawImage(text, x0, y0);
    else {
      let left = shown;
      for (const l of sp.reveal) {
        const c = Math.min(left, l.g.length); left -= c;
        if (c <= 0) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 + l.y0, (c >= l.g.length ? W : l.g[c - 1]) + 1, l.y1 - l.y0); ctx.clip(); ctx.drawImage(text, x0, y0); ctx.restore();
      }
    }
  } else if (anim === "word") {
    const all = sp.reveal.flatMap((l) => l.words.map((w) => ({ l, w }))), m = Math.max(1, all.length);
    all.forEach(({ l, w }, i) => {
      const e = easeOut(prog(t, 0.25 + (2.15 * i) / m, 0.4)); if (e <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha * e; ctx.beginPath(); ctx.rect(x0 + w.x0 - 3 * k, y0 + l.y0 - 20 * k, w.x1 - w.x0 + 6 * k, l.y1 - l.y0 + 40 * k); ctx.clip();
      ctx.drawImage(text, x0, y0 + 10 * k * (1 - e)); ctx.restore();
    });
  } else if (anim === "curtain") {
    const u = easeOut(prog(t, 0, 0.9)), soft = Math.max(8, W * 0.16), edge = u * (W + soft);
    const { cv, c } = scratch(W, H);
    c.drawImage(sp.canvas, 0, 0); c.globalCompositeOperation = "destination-in";
    const gr = c.createLinearGradient(edge - soft, 0, edge, 0); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    ctx.drawImage(cv, x0, y0);
  } else if (anim === "glitch-neon") {
    // Neon glow comes from the shadow above. Every ~1.7 s a 0.28 s glitch burst splits the colour channels and shifts horizontal bands.
    const ph = tl % 1.7, burst = ph < 0.28 && t > 0.2, step = Math.floor(tl * 30);
    if (sp.bg) ctx.drawImage(sp.bg, x0, y0);
    if (!burst) ctx.drawImage(text, x0, y0);
    else {
      const d = (8 + 12 * hash(step)) * k;
      ctx.save(); ctx.globalAlpha = alpha * 0.85; ctx.shadowBlur = 0; ctx.drawImage(tinted(text, "rgba(255,40,90,1)"), x0 - d, y0); ctx.drawImage(tinted(text, "rgba(0,235,255,1)"), x0 + d, y0 + d * 0.15); ctx.restore();
      const bands = 4, bh = H / bands;
      for (let i = 0; i < bands; i++) { const off = (hash(step * 7 + i) - 0.5) * 34 * k; ctx.save(); ctx.beginPath(); ctx.rect(x0 - 40 * k, y0 + i * bh, W + 80 * k, bh); ctx.clip(); ctx.drawImage(text, x0 + off, y0); ctx.restore(); }
    }
  } else if (anim === "gold-shimmer") {
    // Glyphs are recoloured in metallic gold; a bright diagonal highlight sweeps across them every 2.4 s.
    if (sp.bg) ctx.drawImage(sp.bg, x0, y0);
    const { cv, c } = scratch(W, H);
    c.drawImage(text, 0, 0); c.globalCompositeOperation = "source-in";
    const base = c.createLinearGradient(0, 0, W * 0.35, H * 1.2); base.addColorStop(0, "#B8860B"); base.addColorStop(0.45, "#F6D56B"); base.addColorStop(1, "#9C6B0A");
    c.fillStyle = base; c.fillRect(0, 0, W, H);
    const cycle = (tl % 2.4) / 1.5;
    if (cycle <= 1) {
      const span = W + H, mid = -H * 0.5 + cycle * (span + H * 0.5), band = Math.max(18, W * 0.12);
      c.globalCompositeOperation = "source-atop";
      const gr = c.createLinearGradient(mid - band, 0, mid + band + H * 0.6, H);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,252,225,0.98)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
    }
    ctx.drawImage(cv, x0, y0);
  } else {
    ctx.drawImage(sp.canvas, x0, y0);
    if (anim === "sparkle-burst") {
      // 16 deterministic sparkles around the box: all burst in over the first second, then a sparser twinkle every 2.2 s.
      const P = 2.2;
      for (let i = 0; i < 16; i++) {
        const born = 0.1 + 0.8 * hash(i * 3 + 1), cyc = Math.floor((tl - born) / P); if (cyc < 0) continue;
        if (cyc > 0 && hash(i * 11 + cyc) < 0.55) continue;
        const age = ((tl - born) % P) / 0.75; if (age >= 1) continue;
        const ang = hash(i * 5 + 2) * Math.PI * 2, rr = 0.55 + 0.5 * hash(i * 7 + 3), px = Math.cos(ang) * (W / 2) * rr * 1.05, py = Math.sin(ang) * (H / 2) * rr * 1.5;
        star(ctx, x0 + W / 2 + px, y0 + H / 2 + py, (7 + 9 * hash(i * 13 + 4)) * k * Math.sin(Math.PI * age), 1);
      }
    }
    if (anim === "shimmer" && tl > 0.9) {
      const u = ((tl - 0.9) % 2.8) / 1.4;
      if (u <= 1) {
        const { cv, c } = scratch(W, H), band = W * 0.28, mid = -band + u * (W + band * 2);
        c.drawImage(text, 0, 0); c.globalCompositeOperation = "source-atop";
        const gr = c.createLinearGradient(mid - band, 0, mid + band, 0);
        gr.addColorStop(0, "rgba(255,214,120,0)"); gr.addColorStop(0.5, "rgba(255,238,175,0.95)"); gr.addColorStop(1, "rgba(255,214,120,0)");
        c.fillStyle = gr; c.fillRect(0, 0, W, H);
        ctx.shadowColor = "rgba(255,200,90,0.55)"; ctx.shadowBlur = 10 * k; ctx.drawImage(cv, x0, y0);
      }
    }
  }
  ctx.restore();
}
const easeLinear = (x: number) => x;

/** Background pill behind a text layer. "default" = the layer's own current look (header: the card's light pill with a gold border; footer: dark). */
export type PillStyle = "default" | "dark" | "frost" | "none" | "custom";
export const PILL_STYLES: { id: PillStyle; label: string }[] = [
  { id: "dark", label: "Dark Translucent" }, { id: "frost", label: "Light Frost" }, { id: "none", label: "None / Transparent" }, { id: "custom", label: "Custom Tint" },
];
export const isPillStyle = (v: unknown): v is PillStyle => v === "default" || PILL_STYLES.some((p) => p.id === v);
export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
/** The pill's fill colour for a style: `null` = no pill, `"default"` = use the layer's built-in look. Footer defaults to dark. */
export function pillFill(style: PillStyle | undefined, color: string | undefined, layer: "header" | "footer"): string | null {
  const st: PillStyle = style && isPillStyle(style) ? style : "default";
  if (st === "none") return null;
  if (st === "dark" || (st === "default" && layer === "footer")) return "rgba(0,0,0,0.5)";
  if (st === "frost") return "rgba(255,255,255,0.72)";
  if (st === "custom") { const c = isHex(color) ? color : "#000000"; return `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},0.78)`; }
  return "default";
}

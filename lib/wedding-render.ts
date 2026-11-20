/**
 * Client-only canvas renderer for the wedding card studio. One flow layout (blessing, title, names, photo, parents,
 * message, date, venue) is typeset over ten themed backgrounds, so the card is identical in the studio, on the guest's
 * invite page and in the downloadable personalised PNG. Logical size is 1080 x 1500; `width` scales it.
 */
import { loadPrintFonts } from "./print-ad-render";
import { drawMotif, MOTIF_LAYOUT } from "./wedding-motifs";
import { eventConfig, EVENT_TITLE, FONT_CHOICES, FONT_STACKS, TEXT_SCALE_MAX, TEXT_SCALE_MIN, formatDate, greetingText, type BlockId, type BlockKey, type CardLayer, type FontStyle, type TextId, type PhotoShape, type WeddingDetails, type WeddingTemplate, type Palette } from "./wedding";

export const CARD_W = 1080;
export const CARD_H = 1500;
const SERIF = '"Noto Serif Malayalam", "Noto Serif", Georgia, serif';
const SANS = '"Noto Sans Malayalam", "Noto Sans", Inter, system-ui, sans-serif';
const hasMl = (t: string) => /[ഀ-ൿ]/.test(t);

type Ctx = CanvasRenderingContext2D;

function mix(hex: string, other: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(other);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width <= maxW) { line = t; continue; }
      if (line) out.push(line);
      line = w;
      if (ctx.measureText(w).width > maxW) { // very long word: split by character
        let part = "";
        for (const ch of Array.from(w)) { if (ctx.measureText(part + ch).width > maxW && part) { out.push(part); part = ""; } part += ch; }
        line = part;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function shapePath(ctx: Ctx, shape: PhotoShape, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  if (shape === "circle") ctx.ellipse(x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.min(w, h) / 2, 0, 0, Math.PI * 2);
  else if (shape === "oval") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === "arch") { const r = w / 2; ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  else ctx.rect(x, y, w, h);
}

/** Template backdrops + ornaments, drawn in the 1080 x 1500 logical space. */
function backdrop(ctx: Ctx, t: WeddingTemplate, p: Palette) {
  const W = CARD_W, H = CARD_H;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.bg1); g.addColorStop(1, p.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const foil = () => { const f = ctx.createLinearGradient(0, 0, W, H); f.addColorStop(0, p.accent); f.addColorStop(0.5, mix(p.accent, "#ffffff", 0.5)); f.addColorStop(1, p.accent); return f; };
  const frame = (inset: number, lw: number, style: string | CanvasGradient) => { ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset); };
  const diamond = (x: number, y: number, r: number, fill: string | CanvasGradient) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); };
  const dot = (x: number, y: number, r: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const petals = (cx: number, cy: number, n: number, len: number, wid: number, fill: string, rot = 0) => { for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + (i * Math.PI * 2) / n); ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(0, -len / 2, wid / 2, len / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } };

  switch (t.motif) {
    case "kasavu": {
      frame(40, 24, foil()); frame(78, 4, p.accent2); frame(94, 2, foil());
      for (let x = 130; x <= W - 130; x += 44) { diamond(x, 118, 9, foil()); diamond(x, H - 118, 9, foil()); }
      for (let y = 170; y <= H - 170; y += 44) { diamond(118, y, 8, foil()); diamond(W - 118, y, 8, foil()); }
      break;
    }
    case "temple": {
      for (let i = 0; i <= 26; i++) { const x = (i / 26) * W, y = 70 + Math.sin((i / 26) * Math.PI) * 40; dot(x, y, 22, i % 2 ? "#F08C00" : "#E8590C"); dot(x, y, 9, "#FFD43B"); }
      for (let i = 0; i < 30; i++) { const y = 120 + i * 42; if (y > H - 220) break; dot(52, y, 15, i % 2 ? "#F08C00" : "#E8590C"); dot(W - 52, y, 15, i % 2 ? "#E8590C" : "#F08C00"); }
      petals(W / 2, H - 120, 10, 70, 34, "#F9A8B8"); petals(W / 2, H - 120, 8, 46, 26, "#FFE3EA", Math.PI / 8); dot(W / 2, H - 120, 11, "#FCC419");
      frame(110, 3, p.accent2);
      break;
    }
    case "church": {
      frame(50, 3, foil()); frame(68, 1.5, p.accent2);
      ctx.fillStyle = foil(); ctx.fillRect(W / 2 - 8, 92, 16, 100); ctx.fillRect(W / 2 - 34, 122, 68, 16);
      for (const [x, y, s] of [[100, 100, 1], [W - 100, 100, -1], [100, H - 100, 1], [W - 100, H - 100, -1]] as const) { petals(x, y, 6, 34, 14, mix(p.accent, "#ffffff", 0.55)); dot(x, y, 6, p.accent); void s; }
      break;
    }
    case "nikah": {
      ctx.strokeStyle = p.accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(46, 46, W - 92, H - 92, 150); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(72, 72, W - 144, H - 144, 128); ctx.stroke();
      for (const [x, y] of [[150, 150], [W - 150, 150], [150, H - 150], [W - 150, H - 150]]) { for (const r of [0, Math.PI / 4]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.strokeStyle = p.accent2; ctx.lineWidth = 3; ctx.strokeRect(-32, -32, 64, 64); ctx.restore(); } }
      dot(W / 2, 140, 42, p.accent); dot(W / 2 + 18, 130, 36, p.bg1); // crescent
      diamond(W / 2 + 62, 118, 11, p.accent2);
      for (let x = 200; x <= W - 200; x += 40) diamond(x, H - 104, 6, p.accent);
      break;
    }
    case "botanical": {
      for (const [x, y, c] of [[80, 120, "#F6C7C7"], [W - 60, H - 100, "#F6C7C7"], [W - 80, 80, "#DCE8E0"], [60, H - 80, "#DCE8E0"]] as const) { const rg = ctx.createRadialGradient(x, y, 10, x, y, 360); rg.addColorStop(0, c + "cc"); rg.addColorStop(1, c + "00"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
      const branch = (x: number, y: number, ang: number, len: number, flip: number) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = "#7C9C8A"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, 34 * flip, len, 0); ctx.stroke();
        for (let i = 1; i <= 9; i++) { const f = i / 9, bx = len * f, by = Math.sin(f * Math.PI) * 17 * flip; for (const sd of [-1, 1]) { ctx.save(); ctx.translate(bx, by); ctx.rotate(sd * 0.9); ctx.fillStyle = i % 2 ? "#8FB09E" : "#6F9A84"; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, sd * 22, 17, 26 - i, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
        ctx.restore();
      };
      branch(70, 90, 0.2, 380, 1); branch(60, 90, 1.2, 330, -1); branch(W - 70, H - 90, Math.PI + 0.2, 380, 1); branch(W - 60, H - 90, Math.PI + 1.2, 330, -1);
      for (const [x, y] of [[200, 70], [W - 240, H - 60], [110, 300], [W - 120, H - 330]]) dot(x, y, 16, "#F2B8B8");
      break;
    }
    case "banarasi": {
      frame(36, 16, foil()); frame(64, 4, p.accent2);
      for (let x = 100; x <= W - 100; x += 30) { diamond(x, 50, 9, p.accent2); diamond(x, H - 50, 9, p.accent2); }
      for (let y = 100; y <= H - 100; y += 30) { diamond(50, y, 9, p.accent2); diamond(W - 50, y, 9, p.accent2); }
      frame(118, 2, p.accent);
      for (const [x, y] of [[118, 118], [W - 118, 118], [118, H - 118], [W - 118, H - 118]]) { dot(x, y, 26, p.bg2); ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke(); petals(x, y, 8, 20, 9, p.accent); }
      break;
    }
    case "polaroid": {
      for (const [x, y, r] of [[90, 150, -0.5], [W - 140, 1300, 0.6]] as const) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = "#F5C16Cb0"; ctx.fillRect(-60, -16, 120, 32); ctx.restore(); }
      for (let i = 0; i < 26; i++) dot(((i * 397) % W), ((i * 613) % H), 5 + (i % 3) * 3, i % 2 ? p.accent + "66" : p.accent2 + "88");
      break;
    }
    case "velvet": {
      const rg = ctx.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H * 0.4, 900); rg.addColorStop(0, "#1B2A5C"); rg.addColorStop(1, p.bg2); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      let s = 7; for (let i = 0; i < 70; i++) { s = (s * 9301 + 49297) % 233280; const x = (s / 233280) * W; s = (s * 9301 + 49297) % 233280; const y = (s / 233280) * H; dot(x, y, 1.5 + (i % 3), `rgba(243,217,139,${0.25 + (i % 4) * 0.12})`); }
      const oct = (inset: number, c: number, lw: number) => { ctx.strokeStyle = foil(); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(inset + c, inset); ctx.lineTo(W - inset - c, inset); ctx.lineTo(W - inset, inset + c); ctx.lineTo(W - inset, H - inset - c); ctx.lineTo(W - inset - c, H - inset); ctx.lineTo(inset + c, H - inset); ctx.lineTo(inset, H - inset - c); ctx.lineTo(inset, inset + c); ctx.closePath(); ctx.stroke(); };
      oct(50, 60, 5); oct(70, 48, 1.5);
      break;
    }
    case "marigold": {
      for (let i = 0; i <= 24; i++) { const x = (i / 24) * W; for (const y of [48, H - 48]) { dot(x, y, 26, i % 2 ? "#E8590C" : "#F59F00"); dot(x, y, 11, "#FFE066"); } }
      for (let i = 0; i < 28; i++) { const y = 110 + i * 46; if (y > H - 100) break; dot(40, y, 17, i % 2 ? "#F59F00" : "#E8590C"); dot(W - 40, y, 17, i % 2 ? "#E8590C" : "#F59F00"); }
      for (let i = 0; i < 12; i++) { ctx.fillStyle = "#2F9E44"; ctx.beginPath(); ctx.ellipse(110 + i * 80, 96, 10, 24, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(110 + i * 80, H - 96, 10, 24, -0.3, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    default: { frame(60, 2, p.ink); frame(76, 0.8, p.accent2); }
  }
}

const MARGIN: Record<string, number> = { kasavu: 150, temple: 195, church: 160, nikah: 170, botanical: 175, banarasi: 170, polaroid: 90, velvet: 150, marigold: 160, minimal: 130 };

/** A clickable region of the card in the 1080 x 1500 logical space (used only by the interactive studio preview). */
type ZoneId = CardZone["id"];
/** Text-size multipliers are clamped to the range the controls offer (70 % - 180 %). */
const clampScale = (v: number | undefined) => Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, v ?? 1));
/** The group key older saves used for a text element's size (blockScale.header scaled blessing + title together, and so on). */
const LEGACY_SCALE_KEY: Partial<Record<string, BlockId>> = { blessing: "header", title: "header", parents: "body", message: "body", datetime: "dateTime" };
/** One text element's own font override: its own entry, else the legacy group entry. */
const fontOverride = (d: WeddingDetails, id: string | undefined): FontStyle | undefined => {
  if (!id) return undefined;
  const map = (d.blockFont ?? {}) as Record<string, FontStyle | undefined>, leg = LEGACY_SCALE_KEY[id];
  return map[id] ?? (leg ? map[leg] : undefined);
};
/** One text element's own size: its own entry, else the legacy group entry, else 1. */
const sizeOf = (d: WeddingDetails, id: string | undefined): number => {
  if (!id) return 1;
  const map = d.blockScale ?? {}, leg = LEGACY_SCALE_KEY[id];
  return clampScale((map as Record<string, number | undefined>)[id] ?? (leg ? (map as Record<string, number | undefined>)[leg] : undefined));
};

/** A block's resolved typography: the stack, a pinned weight (single-weight fonts), a size multiplier, and whether it is a script (no caps). */
interface FontSpec { fam: string; weight?: number; scale: number; script: boolean }
function fontSpec(style: FontStyle, id: string | undefined, base: string): FontSpec {
  if (style === "default") return { fam: base, scale: 1, script: false };
  const f = FONT_CHOICES.find((c) => c.id === style);
  if (f) return { fam: f.stack, weight: f.weight, scale: f.scale, script: !!f.script };
  if (style === "script") { // legacy preset: script for names / greeting / blessing, serif for the small lines
    const on = id === "guest" || id === "names" || id === "blessing";
    return on ? { fam: FONT_STACKS.script, weight: 400, scale: 1.2, script: true } : { fam: FONT_STACKS.royal, scale: 1, script: false };
  }
  if (style === "royal") return { fam: base === SANS ? SANS : FONT_STACKS.royal, scale: 1, script: false }; // keep the small sans lines readable
  return { fam: FONT_STACKS[style], scale: 1, script: false };
}

/** Makes sure the chosen fonts are decoded before text is measured (same 4 s cap as the Malayalam faces). */
async function loadCardFonts(styles: Set<FontStyle>, sample: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  const specs: string[] = [];
  const add = (family: string, weights: number[]) => weights.forEach((w) => specs.push(`${w} 40px "${family}"`));
  for (const st of styles) {
    const f = FONT_CHOICES.find((c) => c.id === st);
    if (f) { add(f.family, f.weights); if (f.script) add("Chilanka", [400]); continue; }
    if (st === "royal" || st === "script") add("Playfair Display", [500, 700, 800]);
    if (st === "script") { add("Great Vibes", [400]); add("Chilanka", [400]); }
    if (st === "sans") add("Inter", [500, 700, 800]);
    if (st === "ml-classic") add("Cormorant Garamond", [500, 600, 700]);
  }
  if (!specs.length) return;
  try { await Promise.race([Promise.all(specs.map((sp) => document.fonts.load(sp, sample || "Aa"))), new Promise((res) => setTimeout(res, 4000))]); } catch { /* system fallback */ }
}

/** Where a custom layer sits on the card (logical 1080 x 1500 px), for the studio's selection / drag / resize handles. */
export interface LayerBox { id: string; x: number; y: number; w: number; h: number }
const ELEMENT_ASPECT: Record<string, number> = { "divider-diamond": 0.08, "divider-dots": 0.05, "frame-double": 1.28, star: 1, heart: 0.92, flower: 1 };
/** Height / width of a custom layer that has no natural height (text and images measure themselves). */
export const elementAspect = (kind: string) => ELEMENT_ASPECT[kind] ?? 1;
const layerImgCache = new Map<string, Promise<HTMLImageElement | null>>();
function layerImage(src: string): Promise<HTMLImageElement | null> {
  let hit = layerImgCache.get(src);
  if (!hit) { hit = loadImage(src); layerImgCache.set(src, hit); if (layerImgCache.size > 40) layerImgCache.delete(layerImgCache.keys().next().value as string); }
  return hit;
}

/** Draws one custom layer centred on its saved spot (kept inside the card) and returns its box. */
function drawLayer(ctx: Ctx, l: CardLayer, img: HTMLImageElement | null, d: WeddingDetails): LayerBox | null {
  const W = CARD_W, H = CARD_H;
  const place = (w: number, h: number) => ({ cx: Math.min(W - w / 2, Math.max(w / 2, (l.x / 100) * W)), cy: Math.min(H - h / 2, Math.max(h / 2, (l.y / 100) * H)) });
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.05, l.opacity));
  let box: LayerBox | null = null;
  if (l.type === "text") {
    const f = fontSpec(l.font || d.fontStyle || "default", "names", SERIF);
    const fs = l.size * f.scale, boxW = (l.w / 100) * W;
    ctx.font = `${l.italic ? "italic " : ""}${f.weight ?? (l.bold ? 700 : 500)} ${fs}px ${f.fam}`;
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = l.ls && !hasMl(l.text) ? `${l.ls * fs}px` : "0px";
    const lines = wrap(ctx, l.text || " ", boxW), lineH = fs * l.lh, h = Math.max(lineH, lines.length * lineH);
    const { cx, cy } = place(boxW, h);
    ctx.fillStyle = l.color; ctx.textBaseline = "middle"; ctx.textAlign = l.align;
    const tx = l.align === "left" ? cx - boxW / 2 : l.align === "right" ? cx + boxW / 2 : cx;
    lines.forEach((ln, i) => ctx.fillText(ln, tx, cy - h / 2 + (i + 0.5) * lineH));
    box = { id: l.id, x: cx - boxW / 2, y: cy - h / 2, w: boxW, h };
  } else if (l.type === "image") {
    if (!img) { ctx.restore(); return null; }
    const w = (l.w / 100) * W, h = l.shape === "circle" ? w : w * (img.height / img.width);
    const { cx, cy } = place(w, h), x = cx - w / 2, y = cy - h / 2;
    const path = (c: Ctx, ox: number, oy: number) => { c.beginPath(); if (l.shape === "circle") c.ellipse(ox + w / 2, oy + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); else if (l.shape === "rounded") c.roundRect(ox, oy, w, h, Math.min(w, h) * 0.12); else c.rect(ox, oy, w, h); };
    const off = document.createElement("canvas"); off.width = Math.max(1, Math.round(w)); off.height = Math.max(1, Math.round(h)); // clipped copy, so a shadow follows its real (transparent) edges
    const oc = off.getContext("2d")!; oc.imageSmoothingQuality = "high";
    path(oc, 0, 0); oc.clip();
    const sc = Math.max(w / img.width, h / img.height); oc.drawImage(img, (w - img.width * sc) / 2, (h - img.height * sc) / 2, img.width * sc, img.height * sc);
    if (l.shadow) { ctx.shadowColor = "rgba(0,0,0,0.38)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8; }
    ctx.drawImage(off, x, y, w, h);
    ctx.shadowColor = "transparent";
    if (l.border > 0) { path(ctx, x, y); ctx.strokeStyle = l.borderColor; ctx.lineWidth = l.border; ctx.stroke(); }
    box = { id: l.id, x, y, w, h };
  } else {
    const w = (l.w / 100) * W, h = w * elementAspect(l.kind), { cx, cy } = place(w, h);
    ctx.translate(cx, cy); ctx.fillStyle = l.color; ctx.strokeStyle = l.color; ctx.lineCap = "round";
    const lw = Math.max(2, w * 0.006);
    const diamond = (x: number, r: number) => { ctx.beginPath(); ctx.moveTo(x, -r); ctx.lineTo(x + r, 0); ctx.lineTo(x, r); ctx.lineTo(x - r, 0); ctx.closePath(); ctx.fill(); };
    if (l.kind === "divider-diamond") {
      ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w * 0.07, 0); ctx.moveTo(w * 0.07, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
      diamond(0, w * 0.034); for (const dx of [-w * 0.1, w * 0.1]) { ctx.beginPath(); ctx.arc(dx, 0, w * 0.01, 0, Math.PI * 2); ctx.fill(); }
    } else if (l.kind === "divider-dots") {
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc((i * w) / 9.5, 0, Math.max(1.5, w * 0.014 * (1 - Math.abs(i) * 0.14)), 0, Math.PI * 2); ctx.fill(); }
    } else if (l.kind === "frame-double") {
      ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.04); ctx.stroke();
      ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.roundRect(-w / 2 + w * 0.03, -h / 2 + w * 0.03, w - w * 0.06, h - w * 0.06, w * 0.025); ctx.stroke();
    } else if (l.kind === "star") {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? w * 0.2 : w * 0.5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    } else if (l.kind === "heart") {
      ctx.beginPath(); ctx.moveTo(0, h * 0.42); ctx.bezierCurveTo(-w * 0.62, h * 0.02, -w * 0.4, -h * 0.5, 0, -h * 0.16); ctx.bezierCurveTo(w * 0.4, -h * 0.5, w * 0.62, h * 0.02, 0, h * 0.42); ctx.fill();
    } else {
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 4); ctx.beginPath(); ctx.ellipse(0, -w * 0.27, w * 0.13, w * 0.23, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.globalAlpha *= 0.9; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, w * 0.09, 0, Math.PI * 2); ctx.fill();
    }
    box = { id: l.id, x: cx - w / 2, y: cy - h / 2, w, h };
  }
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
  ctx.restore();
  return box;
}

/** The text element a clickable card zone is (each element is moved, sized and styled on its own); null for the photo. */
export function blockOfZone(id: CardZone["id"]): TextId | null {
  return id === "photo" ? null : id;
}

/** A movable text group as drawn: where it sits now (logical 1080 x 1500 px) and whether the client has positioned it. */
export interface GroupBox { key: TextId; x: number; y: number; w: number; h: number; moved: boolean }
export interface CardZone { id: "guest" | "blessing" | "title" | "names" | "parents" | "message" | "datetime" | "venue" | "verse" | "photo"; x: number; y: number; w: number; h: number; dual?: boolean }

export async function renderWeddingCard(o: { template: WeddingTemplate; details: WeddingDetails; guest?: { name: string; place: string } | null; photo?: HTMLImageElement | null; photo2?: HTMLImageElement | null; width: number; onZones?: (z: CardZone[]) => void; onGroups?: (g: GroupBox[]) => void; onLayers?: (b: LayerBox[]) => void }): Promise<HTMLCanvasElement> {
  const { template: t, details: d } = o;
  const p: Palette = { ...t.pal }; // the template's own palette: the old accent override (d.accent) is no longer applied
  const all = [d.bride, d.groom, d.brideParents, d.groomParents, d.venue, d.message, d.blessing, d.verse, o.guest?.name, o.guest?.place, o.guest ? greetingText(d, o.guest) : "", t.blessing[1], ...(d.layers ?? []).map((l) => (l.type === "text" ? l.text : ""))].join(" ");
  await loadPrintFonts(all + " അആഇ");
  await loadCardFonts(new Set<FontStyle>([d.fontStyle ?? "default", ...Object.values(d.blockFont ?? {}) as FontStyle[], ...(d.layers ?? []).flatMap((l) => (l.type === "text" && l.font ? [l.font] : []))]), all);
  const scale = o.width / CARD_W;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CARD_W * scale); canvas.height = Math.round(CARD_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = "high";
  const initial = (n: string) => (Array.from(n.trim())[0] ?? "").toUpperCase();
  const layers = d.layers ?? [];
  const layerImgs = await Promise.all(layers.map((l) => (l.type === "image" ? layerImage(l.src) : Promise.resolve(null))));
  const artImg = t.art ? await loadArt(t.art.src) : null;
  if (artImg) ctx.drawImage(artImg, 0, 0, CARD_W, CARD_H);
  else if (!drawMotif(ctx, t, p, { a: initial(d.groom), b: initial(d.bride) })) backdrop(ctx, t, p);
  if (t.art?.panel) {
    const pad = 34, x = t.art.left - pad, y = t.art.top - pad, w = CARD_W - t.art.left - t.art.right + 2 * pad, h = CARD_H - t.art.top - t.art.bottom + 2 * pad;
    ctx.save(); ctx.shadowColor = "rgba(40,20,0,0.28)"; ctx.shadowBlur = 30; ctx.fillStyle = "rgba(255,249,236,0.88)"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 34); ctx.fill(); ctx.restore();
    ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 26); ctx.stroke();
  }
  const cfg = eventConfig(d.eventType);

  const lang = d.lang;
  const badge = o.guest?.name && d.guestBadgeX != null && d.guestBadgeY != null ? { x: Math.min(100, Math.max(0, d.guestBadgeX)), y: Math.min(100, Math.max(0, d.guestBadgeY)) } : null;
  const wantMl = lang !== "en", wantEn = lang !== "ml";
  const M = MARGIN[t.motif] ?? MOTIF_LAYOUT[t.motif]?.m ?? 150;
  // Image templates carry an exact safe box; every text line is confined to it (cw wide, centred on cx).
  const sl = t.art?.left ?? M, sr = t.art?.right ?? M;
  const cw = CARD_W - sl - sr - (t.art ? 24 : 0), cx = (sl + CARD_W - sr) / 2;
  const family = t.layout === "minimal" ? SANS : SERIF;
  const title = EVENT_TITLE[d.eventType];
  const en = (s: string) => (hasMl(s) ? s : s);
  void en;

  type Block = { tw?: number; h: number; draw: (y: number, x?: number) => void; id?: ZoneId; sub?: { id: ZoneId; dy: number; h: number }[]; dual?: boolean };
  // Image templates have a hard safe box: when the full text can't fit even at a small size, low-priority lines are dropped
  // in stages (lvl 1: second-language extras, 2: message + parents, 3: blessing) instead of overflowing onto the artwork.
  const build = (k: number, lvl = 0, scaled = true): Block[] => {
    const blocks: Block[] = [];
    const text = (s: string, size: number, weight0: number, opt: { id?: ZoneId; color?: string; italic?: boolean; caps?: boolean; ls?: number; fam?: string; lh?: number; pill?: boolean } = {}) => {
      const str = s.trim();
      if (!str) return;
      // Per-element size (blockScale, applied on top of the whole-card fit) and font (blockFont, else the card's fontStyle).
      const { fam, weight: pinned, scale: fontScale, script } = fontSpec(fontOverride(d, opt.id) || d.fontStyle || "default", opt.id, opt.fam ?? family);
      const weight = pinned ?? weight0, caps = opt.caps && !script;
      const ts = (opt.id && d.textStyle?.[opt.id as TextId]) || {}; // per-element colour / alignment / letter spacing / line height
      const lsEm = ts.ls ?? opt.ls;
      const fs = size * k * (scaled ? clampScale(d.contentScale) * sizeOf(d, opt.id) : 1) * fontScale, lh = ts.lh ?? opt.lh ?? (hasMl(str) ? 1.55 : 1.25);
      ctx.font = `${opt.italic ? "italic " : ""}${weight} ${fs}px ${fam}`;
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = lsEm && !hasMl(str) ? `${lsEm * fs}px` : "0px";
      const lines = wrap(ctx, caps && !hasMl(str) ? str.toUpperCase() : str, cw);
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)); // widest line (with letter spacing): the block's real width
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
      blocks.push({
        id: opt.id, tw: opt.pill ? tw + 2 * fs * 0.9 : tw,
        h: lines.length * fs * lh + (opt.pill ? fs * 0.9 : 0),
        draw: (y, x = cx) => {
          const padY = opt.pill ? fs * 0.45 : 0;
          if (opt.pill) { // bordered pill behind the text (the greeting's "boxed" style)
            const bw = tw + 2 * fs * 0.9, bh = lines.length * fs * lh + 2 * padY;
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; ctx.fillStyle = `${p.bg1}EE`;
            ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, bh, Math.min(bh / 2, 40)); ctx.fill(); ctx.restore();
            ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, bh, Math.min(bh / 2, 40)); ctx.stroke();
          }
          ctx.font = `${opt.italic ? "italic " : ""}${weight} ${fs}px ${fam}`;
          (ctx as Ctx & { letterSpacing: string }).letterSpacing = lsEm && !hasMl(str) ? `${lsEm * fs}px` : "0px";
          const align = opt.pill ? "center" : ts.align ?? "center", tx = align === "left" ? x - tw / 2 : align === "right" ? x + tw / 2 : x; // lines align inside the block's own width
          ctx.fillStyle = ts.color ?? (opt.pill ? p.ink : opt.color ?? p.ink); ctx.textAlign = align; ctx.textBaseline = "middle";
          if (opt.id === "guest" && !opt.pill) { ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = Math.max(4, fs * 0.16); ctx.strokeStyle = `${p.bg1}CC`; lines.forEach((l, i) => ctx.strokeText(l, tx, y + padY + (i + 0.5) * fs * lh)); ctx.restore(); }
          lines.forEach((l, i) => ctx.fillText(l, tx, y + padY + (i + 0.5) * fs * lh));
          (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
        },
      });
    };
    const rule = (wid: number) => blocks.push({ h: 8 * k, draw: (y) => { ctx.fillStyle = p.accent; ctx.fillRect(cx - wid / 2, y + 3 * k, wid, 2); } });
    const both = (ml: string, enS: string, size: number, weight: number, opt: Parameters<typeof text>[3] = {}) => {
      if (wantMl && ml) text(ml, size, weight, opt);
      if (wantEn && enS) text(enS, wantMl ? size * 0.72 : size, weight, opt);
    };

    // The greeting is an ordinary block: it keeps exactly the same typography, colour and box whether it sits in the flow or has been dragged.
    if (o.guest?.name) {
      const gt = greetingText(d, o.guest);
      text(gt, 38, 700, { id: "guest", color: p.accent, italic: !hasMl(gt) && d.guestGreetingBoxed === false, pill: d.guestGreetingBoxed !== false });
    }
    const bless = d.blessing.trim();
    if (lvl >= 3) { /* no blessing line */ }
    else if (bless) text(bless, 30, 500, { id: "blessing", color: p.sub, italic: true });
    else if (lvl >= 1) text(wantEn ? t.blessing[0] : t.blessing[1], 30, 500, { id: "blessing", color: p.sub, italic: true });
    else both(t.blessing[1], t.blessing[0], 30, 500, { id: "blessing", color: p.sub, italic: true });
    if (t.layout === "minimal") rule(120);
    both(title.ml, title.en, 34, 700, { id: "title", color: p.accent, caps: true, ls: 0.16 });

    // couple + photo
    const photo = o.photo ?? null;
    const photo2 = photo && o.photo2 ? o.photo2 : null;
    const photoBlock = () => {
      if (t.layout === "polaroid") {
        const pw = 640 * k, ph = 560 * k, pad = 26 * k, cap = 120 * k;
        blocks.push({
          id: "photo", dual: !!photo2, sub: [{ id: "names", dy: ph + pad, h: cap }],
          h: ph + pad + cap + 24 * k,
          draw: (y) => {
            const x = cx - pw / 2;
            ctx.save(); ctx.translate(cx, y + (ph + pad + cap) / 2); ctx.rotate(-0.04); ctx.translate(-cx, -(y + (ph + pad + cap) / 2));
            ctx.shadowColor = "rgba(0,0,0,0.28)"; ctx.shadowBlur = 28 * k; ctx.shadowOffsetY = 12 * k; ctx.fillStyle = "#fff"; ctx.fillRect(x, y, pw, ph + pad + cap); ctx.shadowColor = "transparent";
            ctx.save(); ctx.beginPath(); ctx.rect(x + pad, y + pad, pw - 2 * pad, ph - pad); ctx.clip();
            if (photo) {
              const cover = (im: HTMLImageElement, bx: number, bw: number) => { ctx.save(); ctx.beginPath(); ctx.rect(bx, y + pad, bw, ph - pad); ctx.clip(); const sc = Math.max(bw / im.width, (ph - pad) / im.height); ctx.drawImage(im, bx + (bw - im.width * sc) / 2, y + pad + (ph - pad - im.height * sc) / 2, im.width * sc, im.height * sc); ctx.restore(); };
              if (photo2) { const gp = 10 * k, hw = (pw - 2 * pad - gp) / 2; cover(photo, x + pad, hw); cover(photo2, x + pad + hw + gp, hw); }
              else cover(photo, x + pad, pw - 2 * pad);
            }
            else { const g = ctx.createLinearGradient(x, y, x + pw, y + ph); g.addColorStop(0, p.accent2 + "88"); g.addColorStop(1, p.accent + "55"); ctx.fillStyle = g; ctx.fillRect(x + pad, y + pad, pw - 2 * pad, ph - pad); ctx.fillStyle = "#fff"; ctx.font = `700 ${120 * k}px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", cx, y + pad + (ph - pad) / 2); }
            ctx.restore();
            ctx.fillStyle = p.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `italic 700 ${50 * k}px ${SERIF}`;
            ctx.fillText((cfg.couple ? [d.groom, d.bride] : [d.groom]).filter(Boolean).join(" & ") || "Bride & Groom", cx, y + ph + pad + cap / 2 - 4 * k);
            ctx.restore();
          },
        });
        return;
      }
      if (!photo) return;
      const small = t.layout === "minimal";
      const dual = !!photo2;
      const gapP = 40 * k, ring = 24 * k;
      const baseW = Math.min((t.shape === "arch" ? 330 : small ? 300 : 340) * k, cw - 2 * ring);
      const pw = dual ? Math.min(baseW * 0.82, (cw - gapP - ring) / 2) : baseW;
      const fit = baseW / ((t.shape === "arch" ? 330 : small ? 300 : 340) * k); // < 1 when a narrow safe box squeezes the portrait
      const ph = dual ? (t.shape === "circle" ? pw : t.shape === "arch" ? pw * 1.28 : t.shape === "oval" ? pw * 1.18 : pw * 1.1) : (t.shape === "circle" ? 340 : t.shape === "arch" ? 420 : t.shape === "oval" ? 400 : small ? 380 : 340) * k * fit;
      const one = (im: HTMLImageElement, x: number, y: number) => {
        ctx.save(); shapePath(ctx, t.shape, x, y, pw, ph); ctx.clip();
        const sc = Math.max(pw / im.width, ph / im.height);
        ctx.drawImage(im, x + (pw - im.width * sc) / 2, y + (ph - im.height * sc) / 2, im.width * sc, im.height * sc);
        ctx.restore();
        ctx.strokeStyle = p.accent; ctx.lineWidth = 7 * k; shapePath(ctx, t.shape, x, y, pw, ph); ctx.stroke();
        ctx.strokeStyle = p.accent2; ctx.lineWidth = 2; shapePath(ctx, t.shape, x - 12 * k, y - 12 * k, pw + 24 * k, ph + 24 * k); ctx.stroke();
      };
      blocks.push({
        id: "photo", dual,
        h: ph + 16 * k,
        draw: (y) => {
          if (photo2) { const x0 = cx - (2 * pw + gapP) / 2; one(photo, x0, y); one(photo2, x0 + pw + gapP, y); }
          else one(photo, cx - pw / 2, y);
        },
      });
    };

    if (t.layout === "polaroid") {
      photoBlock();
    } else {
      const nm = (s: string) => (t.layout === "minimal" ? s.toUpperCase() : s);
      const groom = d.groom.trim() || (cfg.couple ? "Groom" : "Name"), bride = d.bride.trim() || "Bride";
      text(nm(groom), 104, 800, { id: "names", ls: t.layout === "minimal" ? 0.04 : 0, lh: hasMl(groom) ? 1.45 : 1.1 });
      if (cfg.couple) {
        text("&", 56, 400, { id: "names", color: p.accent, italic: true, lh: 1 });
        text(nm(bride), 104, 800, { id: "names", ls: t.layout === "minimal" ? 0.04 : 0, lh: hasMl(bride) ? 1.45 : 1.1 });
      } else if (d.bride.trim()) text(d.bride.trim(), 50, 600, { id: "names", color: p.accent, italic: true });
      photoBlock();
    }
    const sonOf = wantMl && !wantEn ? (n: string, par: string, son: boolean) => `${n}, ${par} ദമ്പതികളുടെ ${son ? "പുത്രൻ" : "പുത്രി"}` : (n: string, par: string, son: boolean) => `${n} ${son ? "S/o" : "D/o"} ${par}`;
    const host = d.groomParents.trim();
    const hostLine = host ? `${wantMl && !wantEn ? cfg.hostPrefix.ml : cfg.hostPrefix.en}${host}` : "";
    const parents = cfg.group === "wedding"
      ? [d.groomParents.trim() && sonOf(d.groom.trim() || "Groom", d.groomParents.trim(), true), d.brideParents.trim() && sonOf(d.bride.trim() || "Bride", d.brideParents.trim(), false)].filter(Boolean).join("\n")
      : hostLine;
    if (parents && lvl < 2) text(parents, 30, 500, { id: "parents", color: p.sub, fam: SANS });
    const msg = d.message.trim();
    if (lvl >= 2) { /* no message */ }
    else if (msg) text(msg, 32, 500, { id: "message", italic: true, color: p.ink });
    else if (t.layout !== "polaroid") both(cfg.message.ml, cfg.message.en, 32, 500, { id: "message", italic: true });
    if (t.layout === "minimal") rule(120);
    const dt = d.date;
    if (dt) { text(formatDate(dt, wantEn ? "en" : "ml"), 48, 800, { id: "datetime", color: p.accent === p.ink ? p.ink : p.ink }); if (lang === "both" && lvl < 1) text(formatDate(dt, "ml"), 34, 600, { id: "datetime", color: p.sub }); }
    if (d.time.trim()) text(`${lang === "ml" ? "സമയം" : lang === "both" ? "സമയം / Time" : "Time"}: ${d.time.trim()}`, 34, 600, { id: "datetime", color: p.accent, fam: SANS });
    if (d.venue.trim()) { if (lvl < 1) text(lang === "ml" ? "വേദി" : lang === "both" ? "വേദി / Venue" : "Venue", 26, 700, { id: "venue", color: p.sub, caps: true, ls: 0.18, fam: SANS }); text(d.venue.trim(), 36, 700, { id: "venue" }); }
    if (d.verse.trim()) text(d.verse.trim(), 26, 500, { id: "verse", italic: true, color: p.sub });
    return blocks;
  };

  // The botanical eucalyptus corner reaches further down, so its content starts lower.
  const topOff = (t.motif === "botanical" ? 45 : 0) + (MOTIF_LAYOUT[t.motif]?.top ?? 0);
  const botOff = MOTIF_LAYOUT[t.motif]?.bot ?? 0;
  // Image templates: the text flow is exactly the safe box. Other motifs keep their original margins.
  const top = t.art ? t.art.top : M * 0.8 + topOff, avail = t.art ? CARD_H - t.art.top - t.art.bottom : CARD_H - 2 * M * 0.8 - topOff - botOff;
  const gapOf = (kk: number) => 24 * kk;
  const total = (bs: Block[], kk: number) => bs.reduce((a, b) => a + b.h, 0) + Math.max(0, bs.length - 1) * gapOf(kk);
  // Every text element can be dragged on its own (d.blockPos, or guestBadgeX / Y for the greeting). The flow is laid out as if nothing had
  // moved, and a moved element simply isn't drawn in its slot: the other blocks never shift when one is dragged away.
  const pos = (d.blockPos ?? {}) as Record<string, { x: number; y: number } | undefined>;
  const placeOf = (id: TextId): { x: number; y: number } | null => (id === "guest" ? badge : pos[id] ?? null);
  const textKey = (b: Block): TextId | undefined => (b.id && b.id !== "photo" ? (b.id as TextId) : undefined);
  // Sizes are fitted for the whole card, so dragging a block never changes how large any text is.
  let lvlFit = 0;
  let k = 1.1, blocks = build(k, 0, false);
  if (!t.art) {
    while (total(blocks, k) > avail && k > 0.45) { k *= 0.96; blocks = build(k, 0, false); }
  } else {
    // Strict fit: shrink to a readable floor, then drop the next-least-important lines; the last stage may shrink further.
    for (let lvl = 0; lvl <= 3; lvl++) {
      k = 1.1; blocks = build(k, lvl, false);
      const floor = lvl === 3 ? 0.2 : 0.62;
      while (total(blocks, k) > avail && k > floor) { k *= 0.97; blocks = build(k, lvl, false); }
      if (total(blocks, k) <= avail) { lvlFit = lvl; break; }
      lvlFit = lvl;
    }
  }
  blocks = build(k, lvlFit, true); // sizes fitted without blockScale, then the client's per-element scale is applied on top
  const extra = Math.max(0, avail - total(blocks, k));
  const flowH = blocks.reduce((a, b) => a + b.h, 0);
  // Scaled-up blocks can outgrow the safe box: tighten the gaps (never below 4 px) before anything spills past it.
  const gap = total(blocks, k) > avail && blocks.length > 1 ? Math.max(4, (avail - flowH) / (blocks.length - 1)) : gapOf(k) + (blocks.length > 1 ? Math.min(extra / (blocks.length - 1), 46) : 0);
  const used = flowH + Math.max(0, blocks.length - 1) * gap;
  let y = top + Math.max(0, (avail - used) / 2);
  const zones: CardZone[] = [];
  const zx = t.art ? sl : M * 0.7, zw = t.art ? cw : CARD_W - 2 * M * 0.7;
  // Tight boxes: each text element's hit-box wraps its own rendered lines (plus a little padding), not the whole safe width.
  const boxes = new Map<TextId, { x0: number; x1: number; y0: number; y1: number }>();
  const rec = (id: TextId, mid: number, w: number, y0: number, h: number) => {
    const a = boxes.get(id), x0 = mid - w / 2, x1 = mid + w / 2;
    if (!a) boxes.set(id, { x0, x1, y0, y1: y0 + h }); else { a.x0 = Math.min(a.x0, x0); a.x1 = Math.max(a.x1, x1); a.y0 = Math.min(a.y0, y0); a.y1 = Math.max(a.y1, y0 + h); }
  };
  for (const b of blocks) {
    const id = textKey(b);
    if (!(id && placeOf(id))) {
      b.draw(y);
      if (id && b.tw) rec(id, cx, b.tw, y, b.h);
      else if (b.id) zones.push({ id: b.id, x: zx, y: y - 6, w: zw, h: b.h + 12, dual: b.dual });
      for (const s of b.sub ?? []) zones.push({ id: s.id, x: zx, y: y + s.dy - 6, w: zw, h: s.h + 12 });
    }
    y += b.h + gap;
  }
  const ORDER: TextId[] = ["guest", "blessing", "title", "names", "parents", "message", "datetime", "venue", "verse"];
  for (const id of ORDER) {
    const at = placeOf(id), bs = blocks.filter((b) => textKey(b) === id);
    if (!at || !bs.length) continue;
    const gg = 14 * k, H = bs.reduce((a, b) => a + b.h, 0) + (bs.length - 1) * gg, Wd = Math.max(...bs.map((b) => b.tw ?? 200));
    const xc = Math.min(CARD_W - Wd / 2 - 10, Math.max(Wd / 2 + 10, (at.x / 100) * CARD_W)), yc = Math.min(CARD_H - H / 2 - 10, Math.max(H / 2 + 10, (at.y / 100) * CARD_H));
    let yy = yc - H / 2;
    for (const b of bs) { b.draw(yy, xc); rec(id, xc, b.tw ?? Wd, yy, b.h); yy += b.h + gg; }
  }
  const groups: GroupBox[] = [];
  const padX = 14, padY = Math.max(1, Math.min(6, gap / 2));
  for (const id of ORDER) {
    const a = boxes.get(id);
    if (!a) continue;
    const zone = { id, x: a.x0 - padX, y: a.y0 - padY, w: a.x1 - a.x0 + 2 * padX, h: a.y1 - a.y0 + 2 * padY };
    zones.push(zone); groups.push({ key: id, x: zone.x, y: zone.y, w: zone.w, h: zone.h, moved: !!placeOf(id) });
  }
  // Custom layers (text boxes, images, decorations) sit on top of everything, in stacking order.
  const layerBoxes: LayerBox[] = [];
  layers.forEach((l, i) => { const bx = drawLayer(ctx, l, layerImgs[i], d); if (bx) layerBoxes.push(bx); });
  o.onZones?.(zones);
  o.onGroups?.(groups);
  o.onLayers?.(layerBoxes);
  return canvas;
}

const artCache = new Map<string, Promise<HTMLImageElement | null>>();
/** Same-origin template artwork (public/templates), cached so thumbnails, preview and guest cards share one decode. */
function loadArt(src: string): Promise<HTMLImageElement | null> {
  let hit = artCache.get(src);
  if (!hit) { hit = loadImage(src).then((im) => { if (!im) artCache.delete(src); return im; }); artCache.set(src, hit); }
  return hit;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/** Downscales an overlay image (logo, QR code, portrait) to <= `max` px; PNG / WebP / GIF keep their transparency, anything else becomes JPEG. */
export async function layerImageToDataUrl(file: Blob, max = 900): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return /png|webp|gif/.test(file.type) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9);
  } catch { return null; }
}

/** Downscales an uploaded image to a <= 1000 px JPEG data URL so it can be stored and drawn quickly. */
export async function photoToDataUrl(file: Blob, max = 1000): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } catch { return null; }
}

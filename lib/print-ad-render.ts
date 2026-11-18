/**
 * Client-only canvas renderer for the Print-Ready Ad Generator. Every word is typeset by the browser (real Malayalam shaping),
 * so the printed text is exactly what was typed or generated. The same function draws the on-screen preview (low dpi) and the
 * final 300 dpi PNG, so what you see is what gets printed.
 */
import type { MemorialFrame, PhotoShape, PrintAdCopy, PrintTemplateId } from "./print-ad";

const SERIF = '"Noto Serif Malayalam", "Noto Serif", Georgia, serif';
const SANS = '"Noto Sans Malayalam", "Noto Sans", Inter, system-ui, sans-serif';
const MAX_SIDE = 7000; // keeps huge ads inside canvas limits; the dpi is reduced only if needed

export interface RenderOpts {
  copy: PrintAdCopy;
  template: PrintTemplateId;
  widthCm: number;
  heightCm: number;
  dpi: number;
  frame?: MemorialFrame;
  photo?: HTMLImageElement | null;
  photoShape?: PhotoShape;
  /** Colour ads use a deep red for the header / badge; black & white ads stay pure black. */
  color?: boolean;
}

export async function loadPrintFonts(sample: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  const specs = ['800 40px "Noto Serif Malayalam"', '700 40px "Noto Serif Malayalam"', '600 40px "Noto Serif Malayalam"', '700 40px "Noto Sans Malayalam"', '500 40px "Noto Sans Malayalam"', '400 40px "Noto Sans Malayalam"'];
  try {
    // never let a slow font download block the export: fall back to system fonts after 4 s
    await Promise.race([Promise.all(specs.map((s) => document.fonts.load(s, sample || "അആഇ"))).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 4000))]);
  } catch { /* system fallback */ }
}

type Ctx = CanvasRenderingContext2D;
const hasMl = (t: string) => /[ഀ-ൿ]/.test(t);

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  const push = (w: string) => {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width <= maxW) { line = t; return; }
    if (line) { out.push(line); line = ""; }
    if (ctx.measureText(w).width <= maxW) { line = w; return; }
    for (const ch of Array.from(w)) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ""; }
      line += ch;
    }
  };
  text.split(/\s+/).filter(Boolean).forEach(push);
  if (line) out.push(line);
  return out;
}

/** Smallest body type we will print: ~6.5 pt. Text that cannot fit at this size is reported as overflow instead of being shrunk further. */
export const MIN_BODY_PT = 6.5;
/** Smallest body-type multiplier (of the 5%-of-width base) used by any template, to convert the minimum point size into a scale. */
const MIN_MUL: Record<PrintTemplateId, number> = { reverse: 0.85, double: 0.82, memorial: 0.8 };

export async function renderPrintAd(o: RenderOpts): Promise<{ canvas: HTMLCanvasElement; overflow: boolean; trimmed: string[]; dpi: number }> {
  const all = [o.copy.topBadge, o.copy.headline, o.copy.subheadline, ...o.copy.bulletPoints, o.copy.bodyParagraph, o.copy.footerBox].join(" ");
  await loadPrintFonts(all);

  let dpi = o.dpi;
  const pw = (cm: number, d: number) => Math.max(40, Math.round((cm / 2.54) * d));
  while (Math.max(pw(o.widthCm, dpi), pw(o.heightCm, dpi)) > MAX_SIDE && dpi > 60) dpi = Math.floor(dpi * 0.9);
  const W = pw(o.widthCm, dpi), H = pw(o.heightCm, dpi);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const ink = "#0a0a0a";
  const accent = o.color ? "#9f1239" : "#000000";
  let c = o.copy;
  const ml = hasMl(all);
  const LH = ml ? 1.5 : 1.28;

  const paint = (k: number, draw: boolean, extra: number): number => {
    let y = 0;
    const text = (s: string, x: number, w: number, size: number, weight: number, align: CanvasTextAlign, opt: { family?: string; color?: string; italic?: boolean; caps?: boolean; ls?: number; lh?: number } = {}) => {
      if (!s.trim()) return 0;
      const lh = opt.lh ?? LH;
      ctx.font = `${opt.italic ? "italic " : ""}${weight} ${size}px ${opt.family ?? SERIF}`;
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = opt.ls && !hasMl(s) ? `${opt.ls * size}px` : "0px";
      const body = opt.caps && !hasMl(s) ? s.toUpperCase() : s;
      const lines = body.split("\n").flatMap((p) => wrap(ctx, p, w));
      if (draw) {
        ctx.fillStyle = opt.color ?? ink; ctx.textAlign = align; ctx.textBaseline = "middle";
        const tx = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
        lines.forEach((l, i) => ctx.fillText(l, tx, y + (i + 0.5) * lh * size));
      }
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
      const h = lines.length * lh * size;
      y += h;
      return h;
    };
    const rule = (x: number, w: number, th: number) => { if (draw) { ctx.fillStyle = ink; ctx.fillRect(x, y, w, th); } y += th; };
    const gap = (g: number) => { y += g; };
    const bullet = (items: string[], x: number, w: number, size: number, shape: "square" | "dot", cols: 1 | 2) => {
      const colW = cols === 2 ? (w - size) / 2 : w;
      const ind = size * 1.15;
      const place = items.map((it) => { ctx.font = `600 ${size}px ${SANS}`; return wrap(ctx, it, colW - ind); });
      const rowH = (ls: string[][]) => Math.max(...ls.map((l) => l.length)) * LH * size + size * 0.28;
      const rows: string[][][] = [];
      for (let i = 0; i < place.length; i += cols) rows.push(place.slice(i, i + cols));
      for (const r of rows) {
        const rh = rowH(r);
        if (draw) r.forEach((lines, ci) => {
          const bx = x + ci * (colW + size);
          ctx.fillStyle = ink;
          const my = y + LH * size * 0.5;
          if (shape === "square") ctx.fillRect(bx + size * 0.12, my - size * 0.2, size * 0.4, size * 0.4);
          else { ctx.beginPath(); ctx.arc(bx + size * 0.3, my, size * 0.2, 0, Math.PI * 2); ctx.fill(); }
          ctx.font = `600 ${size}px ${SANS}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          lines.forEach((l, i) => ctx.fillText(l, bx + ind, y + (i + 0.5) * LH * size));
        });
        y += rh;
      }
    };
    const frameRect = (inset: number, th: number, color = ink) => { if (draw) { ctx.strokeStyle = color; ctx.lineWidth = th; ctx.strokeRect(inset + th / 2, inset + th / 2, W - 2 * inset - th, H - 2 * inset - th); } };
    const footer = (x: number, w: number, size: number, style: "box" | "reverse" | "callout" | "rule") => {
      if (!c.footerBox.trim()) return;
      const padd = size * 0.7;
      ctx.font = `700 ${size}px ${SANS}`;
      const lines = c.footerBox.split("\n").flatMap((p) => wrap(ctx, p, w - 2 * padd));
      const h = lines.length * LH * size + 2 * padd * (style === "rule" ? 0.6 : 1);
      y += extra;
      if (draw) {
        if (style === "reverse") { ctx.fillStyle = accent; ctx.fillRect(x, y, w, h); }
        else if (style === "callout") { ctx.fillStyle = o.color ? "#fde8ec" : "#e6e6e6"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, W * 0.004); ctx.strokeRect(x, y, w, h); }
        else if (style === "box") { ctx.strokeStyle = ink; ctx.lineWidth = Math.max(3, W * 0.007); ctx.strokeRect(x, y, w, h); }
        else { ctx.fillStyle = ink; ctx.fillRect(x, y, w, Math.max(2, W * 0.004)); }
        ctx.fillStyle = style === "reverse" ? "#fff" : ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const off = style === "rule" ? padd * 0.6 : padd;
        lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + off + (i + 0.5) * LH * size));
      }
      y += h;
    };

    if (draw) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }
    const base = W * 0.05 * k; // body size

    if (o.template === "reverse") {
      const bw = Math.max(4, W * 0.014);
      frameRect(0, bw);
      const x0 = bw, iw = W - 2 * bw, pad = W * 0.045;
      y = bw;
      const hy0 = y;
      const hp = W * 0.035;
      // header height measured first
      const t0 = y; y += hp;
      if (draw) { ctx.fillStyle = accent; ctx.fillRect(x0, hy0, iw, 0); } // placeholder, real fill below once height is known
      const badgeH = text(c.topBadge, x0 + pad, iw - 2 * pad, base * 0.62, 700, "center", { family: SANS, color: "#fff", caps: true, ls: 0.18 });
      if (badgeH) gap(base * 0.15);
      text(c.headline, x0 + pad, iw - 2 * pad, base * 1.75, 800, "center", { color: "#fff", lh: ml ? 1.4 : 1.12 });
      gap(hp);
      const hh = y - t0;
      if (draw) { // paint the strip behind the text by re-drawing in order: fill, then text again
        ctx.fillStyle = accent; ctx.fillRect(x0, t0, iw, hh);
        y = t0 + hp;
        text(c.topBadge, x0 + pad, iw - 2 * pad, base * 0.62, 700, "center", { family: SANS, color: "#fff", caps: true, ls: 0.18 });
        if (c.topBadge.trim()) gap(base * 0.15);
        text(c.headline, x0 + pad, iw - 2 * pad, base * 1.75, 800, "center", { color: "#fff", lh: ml ? 1.4 : 1.12 });
        gap(hp);
      }
      gap(pad * 0.6);
      if (c.subheadline.trim()) { text(c.subheadline, x0 + pad, iw - 2 * pad, base * 1.1, 800, "center"); gap(pad * 0.4); }
      if (c.bulletPoints.length) { bullet(c.bulletPoints, x0 + pad, iw - 2 * pad, base * 0.92, "square", 1); gap(pad * 0.3); }
      if (c.bodyParagraph.trim()) text(c.bodyParagraph, x0 + pad, iw - 2 * pad, base * 0.85, 500, "left", { family: SANS });
      gap(pad * 0.6);
      footer(x0 + pad, iw - 2 * pad, base * 0.95, "box");
      gap(pad * 0.9 + bw);
      return y;
    }

    if (o.template === "double") {
      const t1 = Math.max(4, W * 0.012), t2 = Math.max(2, W * 0.004);
      frameRect(W * 0.02, t1); frameRect(W * 0.02 + t1 + W * 0.012, t2);
      const pad = W * 0.1, x0 = pad, cw = W - 2 * pad;
      y = pad * 0.85;
      if (c.topBadge.trim()) {
        ctx.font = `700 ${base * 0.62}px ${SANS}`;
        const bh = text(c.topBadge, x0, cw, base * 0.62, 700, "center", { family: SANS, caps: true, ls: 0.22 });
        if (draw && bh) { const my = y - bh / 2; const tw = Math.min(cw, ctx.measureText((hasMl(c.topBadge) ? c.topBadge : c.topBadge.toUpperCase())).width + base * 0.62 * 0.22 * c.topBadge.length) ; const lx = x0 + cw / 2 - tw / 2 - base * 0.5; const rx = x0 + cw / 2 + tw / 2 + base * 0.5; ctx.fillStyle = ink; ctx.fillRect(x0, my, Math.max(0, lx - x0), t2); ctx.fillRect(rx, my, Math.max(0, x0 + cw - rx), t2); }
        gap(base * 0.3);
      }
      text(c.headline, x0, cw, base * 1.9, 800, "center", { lh: ml ? 1.4 : 1.12 });
      gap(base * 0.25);
      if (c.subheadline.trim()) { text(c.subheadline, x0, cw, base * 0.95, 600, "center", { italic: true }); gap(base * 0.3); }
      // ornament rule
      gap(base * 0.1);
      if (draw) { ctx.fillStyle = ink; ctx.fillRect(x0, y, cw, t2); ctx.save(); ctx.translate(x0 + cw / 2, y + t2 / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-base * 0.16, -base * 0.16, base * 0.32, base * 0.32); ctx.restore(); }
      gap(base * 0.5);
      if (c.bulletPoints.length) { bullet(c.bulletPoints, x0, cw, base * 0.88, "dot", c.bulletPoints.length >= 4 && cw > base * 14 ? 2 : 1); gap(base * 0.3); }
      if (c.bodyParagraph.trim()) text(c.bodyParagraph, x0, cw, base * 0.82, 500, "center", { family: SANS });
      gap(base * 0.6);
      footer(x0, cw, base * 0.92, "callout");
      gap(pad * 0.85);
      return y;
    }

    // memorial
    const fr = o.frame ?? "traditional";
    let pad = W * 0.09;
    if (fr === "traditional") {
      const t1 = Math.max(4, W * 0.013), t2 = Math.max(2, W * 0.004);
      frameRect(W * 0.02, t1); frameRect(W * 0.02 + t1 + W * 0.012, t2);
      if (draw) { ctx.fillStyle = ink; const s = W * 0.035; for (const [cx, cy] of [[W * 0.02, W * 0.02], [W - W * 0.02 - s, W * 0.02], [W * 0.02, H - W * 0.02 - s], [W - W * 0.02 - s, H - W * 0.02 - s]]) ctx.fillRect(cx, cy, s, s); }
    } else if (fr === "christian") { frameRect(W * 0.025, Math.max(5, W * 0.016)); pad = W * 0.1; }
    else { frameRect(W * 0.025, Math.max(2, W * 0.004)); pad = W * 0.09; }
    const x0 = pad, cw = W - 2 * pad;
    y = pad * 0.8;
    if (fr === "christian") {
      const cs = base * 1.5;
      if (draw) { ctx.fillStyle = ink; ctx.fillRect(W / 2 - cs * 0.07, y, cs * 0.14, cs); ctx.fillRect(W / 2 - cs * 0.3, y + cs * 0.25, cs * 0.6, cs * 0.14); }
      y += cs + base * 0.35;
    }
    text(c.topBadge, x0, cw, base * 1.45, 800, "center", { lh: ml ? 1.4 : 1.15 });
    gap(base * 0.3);
    if (o.photo) {
      const shape = o.photoShape ?? "circle";
      const pwid = Math.min(cw * 0.55, base * 7.5), phei = shape === "circle" ? pwid : pwid * 1.25;
      const px = W / 2 - pwid / 2;
      if (draw) {
        ctx.save();
        ctx.beginPath();
        if (shape === "circle") ctx.ellipse(W / 2, y + phei / 2, pwid / 2, phei / 2, 0, 0, Math.PI * 2); else ctx.rect(px, y, pwid, phei);
        ctx.clip();
        const im = o.photo, sc = Math.max(pwid / im.width, phei / im.height);
        ctx.drawImage(im, px + (pwid - im.width * sc) / 2, y + (phei - im.height * sc) / 2, im.width * sc, im.height * sc);
        ctx.restore();
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(3, W * 0.007);
        ctx.beginPath();
        if (shape === "circle") ctx.ellipse(W / 2, y + phei / 2, pwid / 2, phei / 2, 0, 0, Math.PI * 2); else ctx.rect(px, y, pwid, phei);
        ctx.stroke();
      }
      y += phei + base * 0.45;
    }
    text(c.headline, x0, cw, base * 1.55, 800, "center", { lh: ml ? 1.4 : 1.15 });
    gap(base * 0.12);
    if (c.subheadline.trim()) { text(c.subheadline, x0, cw, base * 0.9, 600, "center", { family: SANS }); gap(base * 0.3); }
    rule(x0 + cw * 0.3, cw * 0.4, Math.max(2, W * 0.004));
    gap(base * 0.4);
    if (c.bulletPoints.length) { bullet(c.bulletPoints, x0, cw, base * 0.82, "dot", 1); gap(base * 0.25); }
    if (c.bodyParagraph.trim()) text(c.bodyParagraph, x0, cw, base * 0.8, 500, "center", { family: SANS, italic: true });
    gap(base * 0.5);
    footer(x0, cw, base * 0.88, fr === "minimal" ? "rule" : "box");
    gap(pad * 0.8);
    return y;
  };

  // Largest type scale that fits the box, but never below the legible print minimum (~6.5 pt body).
  const minBodyPx = (MIN_BODY_PT / 72) * dpi;
  const kMin = minBodyPx / (0.05 * W * MIN_MUL[o.template]);
  let k = Math.max(1.7, kMin);
  let used = paint(k, false, 0);
  while (used > H && k > kMin) { k = Math.max(kMin, k * 0.95); used = paint(k, false, 0); }
  let overflow = false;
  const trimmed: string[] = [];
  if (used > H) {
    // Even the minimum size cannot hold it: report it, and leave out lower-priority text so the footer / contact box is never pushed off.
    overflow = true;
    if (c.bodyParagraph.trim()) { c = { ...c, bodyParagraph: "" }; trimmed.push("body paragraph"); used = paint(k, false, 0); }
    let dropped = 0;
    while (used > H && c.bulletPoints.length > 0) { c = { ...c, bulletPoints: c.bulletPoints.slice(0, -1) }; dropped++; used = paint(k, false, 0); }
    if (dropped) trimmed.push(`${dropped} bullet point${dropped > 1 ? "s" : ""}`);
  }
  paint(k, true, Math.max(0, H - used));
  return { canvas, overflow, trimmed, dpi };
}

// ── PNG with a 300 dpi tag (pHYs chunk) ──
function crc32(buf: Uint8Array) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function canvasToPng(canvas: HTMLCanvasElement, dpi: number): Promise<Blob> {
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't export the image."))), "image/png"));
  const src = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21); // length(4) + "pHYs"(4) + 9 data + crc(4)
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const at = 33; // 8 signature + 25 IHDR chunk
  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, at)); out.set(chunk, at); out.set(src.subarray(at), at + chunk.length);
  return new Blob([out], { type: "image/png" });
}

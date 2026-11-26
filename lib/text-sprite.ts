import { graphemes, type AnimSprite, type RevealLine } from "@/lib/text-anim";

export type TextSprite = AnimSprite & { w1080: number; h1080: number; canvas: HTMLCanvasElement };

/** Relative luminance-ish brightness (0-255) of a #rrggbb colour; 255 for anything else. */
export const brightness = (hex: string) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return 255; const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };

/**
 * A wrapped, centred text overlay as pixels: a pill layer (`bg`), a text layer (`fg`) and the two together (`canvas`), plus exact per-grapheme / per-word geometry for the
 * reveal animations. `k` = frame width / 1080; `px` is the font size already in frame pixels; `padScale` scales the pill padding (1 = the footer quote's 40 px text).
 * Fonts must already be loaded.
 */
export function buildTextSprite(o: { text: string; fam: string; weight: number; italic?: boolean; px: number; k: number; padScale: number; color: string; fill: string | null; border?: string | null; shadow?: boolean; maxLines?: number }): TextSprite | null {
  const text = o.text.trim();
  if (!text) return null;
  const { k, px } = o, font = `${o.italic ? "italic " : ""}${o.weight} ${px}px ${o.fam}`;
  const c = document.createElement("canvas"), cx = c.getContext("2d")!;
  cx.font = font;
  const maxW = 880 * k, padX = 34 * k * o.padScale, padY = 22 * k * o.padScale, lh = px * 1.38, lines: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (line && cx.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  const shown = lines.slice(0, o.maxLines ?? 4), textW = Math.min(maxW, Math.max(...shown.map((l) => cx.measureText(l).width)));
  const m = 12 * k, w = Math.ceil(textW + padX * 2 + m * 2), h = Math.ceil(shown.length * lh + padY * 2 + m * 2);
  const mk = () => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; };
  const bg = mk(), fg = mk(), whole = mk();
  const gb = bg.getContext("2d")!;
  if (o.fill) {
    gb.fillStyle = o.fill; gb.beginPath(); gb.roundRect(m, m, w - m * 2, h - m * 2, Math.min(h / 2, 36 * k)); gb.fill();
    if (o.border) { gb.strokeStyle = o.border; gb.lineWidth = Math.max(2, 3 * k); gb.stroke(); }
  }
  const gf = fg.getContext("2d")!; gf.font = font; gf.textAlign = "center"; gf.textBaseline = "middle";
  gf.fillStyle = o.color;
  if (o.shadow !== false) { gf.shadowColor = "rgba(0,0,0,0.7)"; gf.shadowBlur = 8 * k; gf.shadowOffsetY = 2 * k; }
  const reveal: RevealLine[] = [];
  shown.forEach((l, i) => {
    const yc = m + padY + lh * (i + 0.5);
    gf.fillText(l, w / 2, yc);
    // Exact reveal geometry: right edge after each grapheme cluster, and each word's span, measured in this font.
    const gs = graphemes(l), lw = cx.measureText(l).width, left = (w - lw) / 2;
    let acc = "";
    const g = gs.map((ch) => { acc += ch; return left + cx.measureText(acc).width; });
    const words: RevealLine["words"] = []; let gi = 0, pre = "";
    for (const part of l.split(/(\s+)/)) {
      const n = graphemes(part).length;
      if (part && !/^\s+$/.test(part)) words.push({ x0: left + cx.measureText(pre).width, x1: left + cx.measureText(pre + part).width, first: gi, last: gi + n - 1 });
      pre += part; gi += n;
    }
    reveal.push({ y0: yc - lh / 2, y1: yc + lh / 2, g, words });
  });
  const gw = whole.getContext("2d")!; gw.drawImage(bg, 0, 0); gw.drawImage(fg, 0, 0);
  return { canvas: whole, bg, fg, reveal, w1080: w / k, h1080: h / k };
}

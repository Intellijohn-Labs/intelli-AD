/**
 * Client-only: lays our exact notice wording (crisp Malayalam/English type) over the text-free artwork from the image
 * model, so the printed words are always correct. Safe zones: top ~15% for the header, bottom ~40% for the details.
 */
import { aspectRatio, POSTER_HEADERS, type PosterStyleId } from "./obituary-art";

const SERIF = '"Noto Serif Malayalam", "Noto Serif", Georgia, serif';
const SANS = '"Noto Sans Malayalam", "Noto Sans", Inter, system-ui, sans-serif';
const INK = "#1c140a";

async function loadFonts(sample: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  const specs = [`800 48px "Noto Serif Malayalam"`, `700 48px "Noto Serif Malayalam"`, `600 48px "Noto Serif Malayalam"`, `700 48px "Noto Sans Malayalam"`, `500 48px "Noto Sans Malayalam"`];
  try {
    await Promise.all(specs.map((s) => document.fonts.load(s, sample || "അആഇ")));
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Couldn't read the generated artwork."));
    i.src = src;
  });
}

type Ctx = CanvasRenderingContext2D;

/** Word-wraps one paragraph to maxW; a single over-long word is split by character. */
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

export interface ComposeInput {
  /** Text-free artwork as a data: URL. */
  artworkUrl: string;
  styleId: PosterStyleId;
  /** Deceased's name, printed large. */
  name: string;
  /** Remaining notice wording, one paragraph per entry. */
  lines: string[];
  /** Gemini aspect label, e.g. "4:5". */
  aspect: string;
  /** Output width in px (default 1200). */
  width?: number;
}

/** Returns the finished poster as PNG base64 (no data: prefix). */
export async function composePoster(inp: ComposeInput): Promise<string> {
  const W = inp.width ?? 1200;
  const H = Math.round(W / aspectRatio(inp.aspect));
  const header = POSTER_HEADERS[inp.styleId];
  await loadFonts([header, inp.name, ...inp.lines].join(" "));
  const art = await loadImage(inp.artworkUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Artwork: cover-fit to the canvas.
  const k = Math.max(W / art.naturalWidth, H / art.naturalHeight);
  const aw = art.naturalWidth * k, ah = art.naturalHeight * k;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(art, (W - aw) / 2, (H - ah) / 2, aw, ah);

  // Soft parchment wash behind the text zones so type stays readable even if the artwork drifts into them.
  const wash = (y0: number, y1: number) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, "rgba(250,244,230,0)");
    g.addColorStop(0.3, "rgba(250,244,230,0.78)");
    g.addColorStop(0.85, "rgba(250,244,230,0.78)");
    g.addColorStop(1, "rgba(250,244,230,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
  };
  wash(H * 0.58, H);

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Header: top safe zone (~15% of height), auto-shrunk to fit one line.
  const zoneW = W * 0.8;
  let hs = W * 0.075;
  ctx.font = `800 ${hs}px ${SERIF}`;
  while (ctx.measureText(header).width > zoneW && hs > 20) { hs -= 2; ctx.font = `800 ${hs}px ${SERIF}`; }
  ctx.fillText(header, W / 2, H * 0.015 + (H * 0.12) / 2 + hs * 0.35);

  // Details: bottom safe zone, below the portrait. Shrink type until everything fits.
  const top = H * 0.62, bottom = H * 0.965, maxH = bottom - top;
  const name = inp.name.trim();
  let scale = 1;
  let layout: { nameLines: string[]; body: string[][]; ns: number; bs: number } | null = null;
  for (; scale > 0.35; scale -= 0.04) {
    const ns = W * 0.058 * scale, bs = W * 0.031 * scale;
    ctx.font = `800 ${ns}px ${SERIF}`;
    const nameLines = name ? wrap(ctx, name, zoneW) : [];
    ctx.font = `600 ${bs}px ${SANS}`;
    const body = inp.lines.map((l) => wrap(ctx, l, zoneW));
    const h = nameLines.length * ns * 1.3 + (nameLines.length ? ns * 0.35 : 0) + body.reduce((s, b) => s + b.length * bs * 1.45 + bs * 0.45, 0);
    layout = { nameLines, body, ns, bs };
    if (h <= maxH) break;
  }
  if (layout) {
    const { nameLines, body, ns, bs } = layout;
    let y = top;
    ctx.font = `800 ${ns}px ${SERIF}`;
    for (const l of nameLines) { y += ns * 1.15; ctx.fillText(l, W / 2, y); y += ns * 0.15; }
    if (nameLines.length) y += ns * 0.35;
    ctx.font = `600 ${bs}px ${SANS}`;
    for (const para of body) {
      for (const l of para) { y += bs * 1.2; ctx.fillText(l, W / 2, y); y += bs * 0.25; }
      y += bs * 0.45;
    }
  }
  return canvas.toDataURL("image/png").split(",")[1];
}

/**
 * Client-only: lays our exact notice wording (crisp Malayalam/English type) over the text-free artwork from the image
 * model, so the printed words are always correct. Safe zones: top ~18% for the title, bottom ~42% for the details.
 * Styles follow Kerala newspaper memorial layouts; supports one person or a joint (two-person) memorial.
 */
import { aspectRatio, posterHeader, type PosterPerson, type PosterStyleId } from "./obituary-art";

const SERIF = '"Noto Serif Malayalam", "Noto Serif", Georgia, serif';
const SANS = '"Noto Sans Malayalam", "Noto Sans", Inter, system-ui, sans-serif';

async function loadFonts(sample: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  const specs = [`800 48px "Noto Serif Malayalam"`, `700 48px "Noto Serif Malayalam"`, `600 48px "Noto Serif Malayalam"`, `700 48px "Noto Sans Malayalam"`, `600 48px "Noto Sans Malayalam"`, `500 48px "Noto Sans Malayalam"`];
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

/**
 * Cleans the notice lines for the poster: drops lines that repeat a title, and removes the person's name from the
 * line that starts with it (the name is printed large). For two people, the name lines are dropped entirely
 * (they are shown as columns).
 */
export function tidyLines(names: string[], lines: string[]): string[] {
  const headers = new Set(["ആദരാഞ്ജലികൾ", "വേദനയോടെ ഓർക്കുന്നു", "കണ്ണീർപ്പൂക്കൾ", "ചരമവാർഷികം", "സ്മരണാഞ്ജലി"]);
  const ns = names.map((n) => n.trim()).filter(Boolean);
  const joint = ns.length > 1;
  let stripped = false;
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !headers.has(l.replace(/[.\s]+$/, "")))
    .filter((l) => !(joint && ns.some((n) => l.startsWith(n))))
    .map((l) => {
      const name = ns[0];
      if (joint || stripped || !name || !l.startsWith(name)) return l;
      stripped = true;
      let r = l.slice(name.length).replace(/^[\s,.:;–-]+/, "");
      const m = r.match(/^\(([^)]*)\)\s*,?\s*(.*)$/);
      if (m) r = [m[1], m[2]].filter(Boolean).join(", ");
      return r || l;
    })
    .filter(Boolean);
}

export interface ComposeInput {
  /** Text-free artwork as a data: URL. */
  artworkUrl: string;
  styleId: PosterStyleId;
  category: "obituary" | "remembrance";
  /** One person, or two for a joint memorial (left, right). */
  people: PosterPerson[];
  /** Remaining notice wording, one paragraph per entry. */
  lines: string[];
  /** Gemini aspect label, e.g. "4:5". */
  aspect: string;
  /** Output width in px (default 1200). */
  width?: number;
}

type Block = { h: number; draw: (y: number) => void };

/** Returns the finished poster as PNG base64 (no data: prefix). */
export async function composePoster(inp: ComposeInput): Promise<string> {
  const W = inp.width ?? 1200;
  const H = Math.round(W / aspectRatio(inp.aspect));
  const header = posterHeader(inp.styleId, inp.category);
  const people = inp.people.filter((p) => p.name.trim());
  const joint = people.length > 1;
  const lines = tidyLines(people.map((p) => p.name), inp.lines);
  await loadFonts([header, ...people.flatMap((p) => [p.name, p.dates ?? ""]), ...lines].join(" "));
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

  const dark = inp.styleId === "classic"; // Style 1: dark footer band with white lettering
  const INK = dark ? "#f7f2e8" : "#1c140a";
  const HEAD_INK = "#1c140a";

  const wash = (y0: number, y1: number, stops: [number, number][]) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [at, a] of stops) g.addColorStop(at, `rgba(250,244,230,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, y1 - y0);
  };
  wash(0, H * 0.19, [[0, 0.9], [0.75, 0.9], [1, 0]]); // header zone
  const bandTop = H * 0.52;
  if (dark) {
    // The footer band is drawn here (not by the model), so the white lettering always sits on solid dark.
    ctx.fillStyle = "#14100b";
    ctx.fillRect(0, bandTop, W, H - bandTop);
    ctx.fillStyle = "#b99a55";
    ctx.fillRect(0, bandTop, W, Math.max(3, H * 0.003));
  } else {
    wash(H * 0.5, H, [[0, 0], [0.18, 0.92], [0.9, 0.92], [1, 0.4]]); // details zone
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const zoneW = W * 0.8;

  // Title (top safe zone), auto-shrunk to one line. Style 2 puts it in a bordered badge.
  let hs = W * 0.072;
  const hMax = inp.styleId === "honored" ? zoneW * 0.8 : zoneW;
  ctx.font = `800 ${hs}px ${SERIF}`;
  while (ctx.measureText(header).width > hMax && hs > 20) { hs -= 2; ctx.font = `800 ${hs}px ${SERIF}`; }
  const hy = H * 0.015 + (H * 0.12) / 2;
  if (inp.styleId === "honored") {
    const tw = ctx.measureText(header).width;
    const bw = tw + hs * 1.8, bh = hs * 1.9, bx = (W - bw) / 2, by = hy - bh / 2;
    ctx.fillStyle = "#fbf6ea";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = HEAD_INK;
    ctx.lineWidth = Math.max(3, hs * 0.07);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.lineWidth = Math.max(1.5, hs * 0.03);
    ctx.strokeRect(bx + hs * 0.14, by + hs * 0.14, bw - hs * 0.28, bh - hs * 0.28);
  }
  ctx.fillStyle = HEAD_INK;
  ctx.font = `800 ${hs}px ${SERIF}`;
  ctx.fillText(header, W / 2, hy + hs * 0.35);

  // Details (bottom safe zone). Shrink the type until everything fits.
  const top = H * 0.565, bottom = H * 0.965, maxH = bottom - top;
  const centered = (txt: string[], font: string, size: number, lh: number, cx: number): Block => ({
    h: txt.length * size * lh,
    draw: (y) => {
      ctx.font = font; ctx.fillStyle = INK; ctx.textAlign = "center";
      txt.forEach((l, i) => ctx.fillText(l, cx, y + i * size * lh + size * (0.85 + (lh - 1) * 0.5)));
    },
  });
  const stack = (blocks: Block[], gap: number): Block => ({
    h: blocks.reduce((s, b) => s + b.h, 0) + gap * Math.max(0, blocks.length - 1),
    draw: (y) => { let cy = y; for (const b of blocks) { b.draw(cy); cy += b.h + gap; } },
  });
  const build = (scale: number): Block => {
    const blocks: Block[] = [];
    const ns = W * (joint ? 0.046 : 0.064) * scale, ds = W * 0.034 * scale, bs = W * (joint ? 0.038 : 0.042) * scale;
    const gap = bs * 0.45;
    if (joint) {
      const colW = W * 0.42, xs = [W * 0.27, W * 0.73];
      const cols = people.slice(0, 2).map((p, i) => {
        ctx.font = `800 ${ns}px ${SERIF}`;
        const nm = wrap(ctx, p.name, colW);
        ctx.font = `600 ${ds}px ${SANS}`;
        const dt = p.dates ? wrap(ctx, p.dates, colW) : [];
        return stack([centered(nm, `800 ${ns}px ${SERIF}`, ns, 1.2, xs[i]), ...(dt.length ? [centered(dt, `600 ${ds}px ${SANS}`, ds, 1.3, xs[i])] : [])], ds * 0.3);
      });
      blocks.push({ h: Math.max(...cols.map((c) => c.h)), draw: (y) => cols.forEach((c) => c.draw(y)) });
    } else if (people[0]) {
      ctx.font = `800 ${ns}px ${SERIF}`;
      blocks.push(centered(wrap(ctx, people[0].name, zoneW), `800 ${ns}px ${SERIF}`, ns, 1.2, W / 2));
    }
    ctx.font = `600 ${bs}px ${SANS}`;
    const bodyFont = `600 ${bs}px ${SANS}`;
    // Single person: one balanced, centred block (Style 3 uses columns only for the two people of a joint memorial).
    ctx.font = bodyFont;
    blocks.push(stack(lines.map((l) => centered(wrap(ctx, l, zoneW), bodyFont, bs, 1.45, W / 2)), gap));
    return stack(blocks, bs * 0.6);
  };

  let layout = build(1);
  for (let scale = 0.97; layout.h > maxH && scale > 0.4; scale -= 0.03) layout = build(scale);
  layout.draw(top);

  return canvas.toDataURL("image/png").split(",")[1];
}

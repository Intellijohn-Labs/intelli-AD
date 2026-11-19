/** Animated card motion (live preview + GIF export): effects are drawn over the finished still card, looping on phase 0..1. */
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { CardEffect, Palette } from "./wedding";

const TAU = Math.PI * 2;
const rng = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

type Ctx = CanvasRenderingContext2D;

function star(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

/** Draws one frame of the effect over whatever is already on `ctx` (a w x h canvas). `phase` loops seamlessly. */
export function drawEffect(ctx: Ctx, effect: CardEffect, phase: number, w: number, h: number, pal: Palette, warm: boolean) {
  if (effect === "none") return;
  ctx.save();
  if (effect === "shimmer") {
    const x = -0.5 * w + phase * 2 * w, g = ctx.createLinearGradient(x, 0, x + w * 0.5, h * 0.5);
    g.addColorStop(0, "rgba(255,236,170,0)"); g.addColorStop(0.5, "rgba(255,240,190,0.5)"); g.addColorStop(1, "rgba(255,236,170,0)");
    ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.35; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else if (effect === "petals") {
    const R = rng(21), cols = warm ? ["#F59F00", "#E8590C", "#FFD43B", "#FFE066"] : ["#F7A8BC", "#FBD0DA", "#FFFFFF", "#F28FA8"];
    for (let i = 0; i < 22; i++) {
      const sp = 1 + (i % 2), off = R(), x0 = R() * w, sz = (10 + R() * 12) * (w / 540), sway = (14 + R() * 22) * (w / 540);
      const y = ((phase * sp + off) % 1) * (h + 60) - 30, x = x0 + Math.sin(TAU * (phase * sp + off)) * sway;
      ctx.save(); ctx.translate(x, y); ctx.rotate(TAU * (phase * sp * (i % 3 ? 1 : -1)) + i); ctx.globalAlpha = 0.85; ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.6, sz, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(-sz * 0.15, -sz * 0.25, sz * 0.18, sz * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  } else {
    // twinkling sparkles + a little falling confetti
    const R = rng(33), s = w / 1080;
    for (let i = 0; i < 34; i++) {
      const x = R() * w, y = R() * h, c = 1 + (i % 3), off = R(), a = Math.pow(Math.max(0, Math.sin(Math.PI * ((phase * c + off) % 1))), 3), r = (8 + R() * 22) * s * (w > 700 ? 1.6 : 2.2);
      ctx.globalAlpha = a; ctx.fillStyle = i % 3 ? pal.accent : "#FFFFFF"; star(ctx, x, y, r);
    }
    const cols = [pal.accent, pal.accent2, "#FFFFFF", "#F28FA8", "#7FB7E9"];
    for (let i = 0; i < 26; i++) {
      const sp = 1 + (i % 2), off = R(), x0 = R() * w, y = ((phase * sp + off) % 1) * (h + 40) - 20, x = x0 + Math.sin(TAU * (phase * sp + off)) * 12 * (w / 540);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(x, y); ctx.rotate(TAU * phase * sp + i); ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-5 * (w / 540), -2.5 * (w / 540), 10 * (w / 540), 5 * (w / 540)); ctx.restore();
    }
  }
  ctx.restore();
}

/** Template families whose petals should be warm marigold colours rather than rose pink. */
export const warmPetals = (motif: string) => ["marigold", "temple", "kasavu", "nilavilakku", "gruhapravesham", "choroonu", "ribbon", "goldconfetti"].includes(motif);

export interface GifOptions { base: HTMLCanvasElement; effect: CardEffect; pal: Palette; warm: boolean; frames?: number; delayMs?: number; onProgress?: (done: number, total: number) => void }

/** Encodes the looping animation of `base` + `effect` as an animated GIF. */
export async function renderGif(o: GifOptions): Promise<Blob> {
  const { base, effect, pal, warm } = o, frames = o.frames ?? 24, w = base.width, h = base.height;
  const frame = document.createElement("canvas"); frame.width = w; frame.height = h;
  const ctx = frame.getContext("2d", { willReadFrequently: true })!;
  const enc = GIFEncoder();
  for (let i = 0; i < frames; i++) {
    ctx.clearRect(0, 0, w, h); ctx.drawImage(base, 0, 0); drawEffect(ctx, effect, i / frames, w, h, pal, warm);
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256, { format: "rgb565" });
    enc.writeFrame(applyPalette(data, palette, "rgb565"), w, h, { palette, delay: o.delayMs ?? 80, repeat: 0 });
    o.onProgress?.(i + 1, frames);
    await new Promise((r) => setTimeout(r, 0));
  }
  enc.finish();
  const bytes = enc.bytes();
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "image/gif" });
}

/**
 * Vector backdrops for the luxury invitation templates (drawn on the 1080 x 1500 logical card).
 * Each motif paints its own background and ornaments; the text flow sits inside the margins in MOTIF_LAYOUT so
 * nothing is typeset over an ornament.
 */
import type { Motif, Palette, WeddingTemplate } from "./wedding";

type Ctx = CanvasRenderingContext2D;
const W = 1080, H = 1500, TAU = Math.PI * 2;

/** Side margin (m) and extra top offset (top) of the text flow, per motif. */
export const MOTIF_LAYOUT: Partial<Record<Motif, { m: number; top: number; bot?: number }>> = {
  peacock: { m: 185, top: 40, bot: 90 }, nilavilakku: { m: 175, top: 95 }, kanchipuram: { m: 185, top: 30 }, cathedral: { m: 170, top: 95, bot: 60 }, victorian: { m: 170, top: 20 },
  betrothal: { m: 170, top: 85 }, mughal: { m: 185, top: 110, bot: 30 }, sapphire: { m: 170, top: 20 }, walima: { m: 175, top: 30 }, emeraldfoil: { m: 170, top: 20 },
  marble: { m: 175, top: 40 }, burgundy: { m: 165, top: 125 }, rosegold: { m: 160, top: 90 }, starlight: { m: 160, top: 20 },
  goldconfetti: { m: 160, top: 20 }, pastelballoon: { m: 185, top: 90, bot: 90 }, rosegoldbday: { m: 175, top: 30 },
  gruhapravesham: { m: 170, top: 90, bot: 150 }, emeraldhome: { m: 170, top: 95 }, christianhome: { m: 175, top: 95 },
  choroonu: { m: 175, top: 95, bot: 90 }, baptism: { m: 170, top: 100, bot: 100 }, babyshower: { m: 180, top: 30 }, aqiqah: { m: 170, top: 95, bot: 30 },
  ribbon: { m: 165, top: 125 }, anniversary: { m: 165, top: 105 },
};

const rng = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
function mix(hex: string, other: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(other);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function kit(ctx: Ctx, p: Palette) {
  const foil = () => { const f = ctx.createLinearGradient(0, 0, W, H); f.addColorStop(0, p.accent); f.addColorStop(0.5, mix(p.accent, "#ffffff", 0.55)); f.addColorStop(1, p.accent); return f; };
  const frame = (inset: number, lw: number, style: string | CanvasGradient) => { ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset); };
  const dot = (x: number, y: number, r: number, fill: string | CanvasGradient) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const diamond = (x: number, y: number, r: number, fill: string | CanvasGradient) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); };
  const star4 = (x: number, y: number, r: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
  const leaf = (x: number, y: number, len: number, wid: number, rot: number, fill: string) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len / 2, -wid, len, 0); ctx.quadraticCurveTo(len / 2, wid, 0, 0); ctx.fill(); ctx.restore(); };
  const flower = (cx: number, cy: number, n: number, len: number, wid: number, fill: string, centre: string, rot = 0) => { for (let i = 0; i < n; i++) leaf(cx, cy, len, wid, rot + (i * TAU) / n, fill); dot(cx, cy, len * 0.18, centre); };
  const bg = (a = p.bg1, b = p.bg2) => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const glow = (x: number, y: number, r: number, c: string, a = 0.5) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, "0")); g.addColorStop(1, c + "00"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const notched = (inset: number, c: number, lw: number, style: string | CanvasGradient) => { ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(inset + c, inset); ctx.lineTo(W - inset - c, inset); ctx.lineTo(W - inset, inset + c); ctx.lineTo(W - inset, H - inset - c); ctx.lineTo(W - inset - c, H - inset); ctx.lineTo(inset + c, H - inset); ctx.lineTo(inset, H - inset - c); ctx.lineTo(inset, inset + c); ctx.closePath(); ctx.stroke(); };
  const lotus = (cx: number, cy: number, s: number, fill: string, line: string) => { for (const [n, k, rot] of [[12, 1, 0], [10, 0.74, 0.15], [8, 0.5, 0.3]] as const) for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + (i * TAU) / n); ctx.strokeStyle = line; ctx.lineWidth = 2.5; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * k * 0.34, -s * k * 0.5, 0, -s * k); ctx.quadraticCurveTo(-s * k * 0.34, -s * k * 0.5, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore(); } dot(cx, cy, s * 0.07, line); };
  const lamp = (cx: number, cy: number, s: number) => { const brass = ctx.createLinearGradient(cx - s, 0, cx + s, 0); brass.addColorStop(0, "#8A5A12"); brass.addColorStop(0.5, "#F5D77A"); brass.addColorStop(1, "#8A5A12"); ctx.fillStyle = brass; ctx.beginPath(); ctx.moveTo(cx - s * 0.55, cy + s); ctx.lineTo(cx + s * 0.55, cy + s); ctx.lineTo(cx + s * 0.28, cy + s * 0.62); ctx.lineTo(cx - s * 0.28, cy + s * 0.62); ctx.closePath(); ctx.fill(); ctx.fillRect(cx - s * 0.09, cy + s * 0.05, s * 0.18, s * 0.6); ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.02, s * 0.62, s * 0.16, 0, 0, TAU); ctx.fill(); for (const k of [-0.5, 0, 0.5]) { glow(cx + k * s * 0.9, cy - s * 0.42, s * 0.5, "#FFD166", 0.55); ctx.fillStyle = "#FFE08A"; ctx.beginPath(); ctx.ellipse(cx + k * s * 0.9, cy - s * 0.22, s * 0.08, s * 0.22, 0, 0, TAU); ctx.fill(); } };
  const laurel = (cx: number, cy: number, r: number, a0: number, a1: number, fill: string, n = 9) => { for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; leaf(x, y, r * 0.26, r * 0.1, a + Math.PI / 2 - 0.5, fill); leaf(x, y, r * 0.26, r * 0.1, a - Math.PI / 2 + 0.5, fill); } };
  const confetti = (n: number, seed: number, cols: string[], zone: (x: number, y: number) => boolean) => { const R = rng(seed); for (let i = 0; i < n * 3 && n > 0; i++) { const x = R() * W, y = R() * H; if (!zone(x, y)) continue; n--; ctx.save(); ctx.translate(x, y); ctx.rotate(R() * TAU); ctx.fillStyle = cols[i % cols.length]; if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, 5 + R() * 5, 0, TAU); ctx.fill(); } else ctx.fillRect(-4 - R() * 6, -2, 10 + R() * 10, 5 + R() * 3); ctx.restore(); } };
  return { foil, frame, dot, diamond, star4, leaf, flower, bg, glow, notched, lotus, lamp, laurel, confetti };
}


/** Paints the template background and ornaments. Returns false for the ten original motifs (handled by the base renderer). */
export function drawMotif(ctx: Ctx, t: WeddingTemplate, p: Palette, ini: { a: string; b: string }): boolean {
  const k = kit(ctx, p);
  const { foil, frame, dot, diamond, star4, leaf, flower, bg, glow, notched, lotus, lamp, laurel, confetti } = k;
  const R = rng(11);
  switch (t.motif as string) {
    case "peacock": {
      bg(); frame(46, 10, foil()); frame(72, 3, p.accent2);
      for (const [x, y, sx, sy] of [[150, 150, 1, 1], [W - 150, 150, -1, 1], [150, H - 150, 1, -1], [W - 150, H - 150, -1, -1]] as const) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
        for (let i = 0; i < 7; i++) { ctx.strokeStyle = i % 2 ? "#2DD4BF" : p.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(70 + i * 6, 40 - i * 8, 120, 120 - i * 14); ctx.stroke(); }
        for (const [rx, ry, c] of [[46, 62, "#0F766E"], [34, 48, p.accent], [22, 32, "#1E3A8A"], [11, 16, "#2DD4BF"]] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(36, 40, rx, ry, 0.7, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      lotus(W / 2, H - 140, 92, mix(p.bg1, p.accent, 0.18), p.accent);
      for (let i = 0; i < 17; i++) { const a = Math.PI + (i / 16) * Math.PI; dot(W / 2 + Math.cos(a) * 118, H - 140 + Math.sin(a) * 118, 4, p.accent2); }
      return true;
    }
    case "nilavilakku": {
      bg(); const zari = foil();
      ctx.fillStyle = zari; ctx.fillRect(30, 30, W - 60, 36); ctx.fillRect(30, H - 66, W - 60, 36); ctx.fillRect(30, 30, 36, H - 60); ctx.fillRect(W - 66, 30, 36, H - 60);
      ctx.strokeStyle = p.accent2; ctx.lineWidth = 3; ctx.strokeRect(76, 76, W - 152, H - 152); ctx.strokeRect(86, 86, W - 172, H - 172);
      for (let x = 60; x < W - 40; x += 30) { diamond(x, 48, 7, p.accent2); diamond(x, H - 48, 7, p.accent2); }
      for (let y = 90; y < H - 70; y += 30) { diamond(48, y, 7, p.accent2); diamond(W - 48, y, 7, p.accent2); }
      lamp(W / 2, 128, 70);
      for (const sd of [0, 1]) for (let i = 0; i < 20; i++) { const y = 230 + i * 56, x = (sd ? W - 112 : 112) + Math.sin(i * 0.9) * 10; leaf(x, y, 26, 8, sd ? 2.4 : 0.7, "#5B8C5A"); dot(x, y, 9, "#FFFFFF"); dot(x, y, 3.5, "#FDE68A"); }
      return true;
    }
    case "kanchipuram": {
      bg(); ctx.globalAlpha = 0.14; for (let y = 20; y < H; y += 54) for (let x = (y / 54) % 2 ? 0 : 27; x < W; x += 54) diamond(x, y, 12, p.accent); ctx.globalAlpha = 1;
      frame(36, 24, foil()); frame(70, 3, p.accent2);
      ctx.fillStyle = foil(); for (let x = 96; x < W - 96; x += 36) { for (const [y, d] of [[96, 1], [H - 96, -1]] as const) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y + 26 * d); ctx.lineTo(x + 36, y); ctx.closePath(); ctx.fill(); } }
      for (let y = 140; y < H - 130; y += 36) { diamond(92, y, 8, p.accent); diamond(W - 92, y, 8, p.accent); }
      for (const [x, y, sx, sy] of [[130, 140, 1, 1], [W - 130, 140, -1, 1], [130, H - 140, 1, -1], [W - 130, H - 140, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.fillStyle = p.accent; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(60, -30, 80, 40, 30, 70); ctx.bezierCurveTo(10, 40, 40, 20, 20, 10); ctx.closePath(); ctx.fill(); dot(32, 42, 7, p.bg1); ctx.restore(); }
      return true;
    }
    case "cathedral": {
      bg(); frame(50, 3, foil()); frame(68, 1.5, p.accent2);
      glow(W / 2, 150, 180, "#F5E6B0", 0.5);
      ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(W / 2 - 12, 96, 28, 120); ctx.fillRect(W / 2 - 42, 132, 88, 26);
      ctx.fillStyle = foil(); ctx.fillRect(W / 2 - 14, 92, 28, 120); ctx.fillRect(W / 2 - 44, 128, 88, 26); for (const [x, y] of [[W / 2, 92], [W / 2, 212], [W / 2 - 44, 141], [W / 2 + 44, 141]]) diamond(x, y, 12, p.accent);
      for (const [x, y, s] of [[130, H - 120, 1], [W - 130, H - 120, -1]] as const) { for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate(-1.57 + (i - 2.5) * 0.42 * s); ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = p.accent2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -50, 0, -96); ctx.quadraticCurveTo(-26, -50, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore(); } for (let i = 0; i < 4; i++) dot(x + (i - 1.5) * 9, y - 74 + Math.abs(i - 1.5) * 6, 3.5, p.accent); }
      for (const sd of [0, 1]) laurel(sd ? W - 150 : 150, 760, 330, sd ? -0.55 : Math.PI + 0.55, sd ? 0.55 : Math.PI - 0.55, "#9AA66A", 12);
      return true;
    }
    case "victorian": {
      bg(); ctx.strokeStyle = p.accent; ctx.lineWidth = 3;
      for (let x = 60; x < W - 40; x += 44) { for (const [y, a0] of [[44, Math.PI], [H - 44, 0]] as const) { ctx.beginPath(); ctx.arc(x + 22, y, 22, a0, a0 + Math.PI); ctx.stroke(); } }
      for (let y = 60; y < H - 40; y += 44) { for (const [x, a0] of [[44, Math.PI / 2], [W - 44, -Math.PI / 2]] as const) { ctx.beginPath(); ctx.arc(x, y + 22, 22, a0, a0 + Math.PI); ctx.stroke(); } }
      frame(94, 1.5, p.accent2); ctx.setLineDash([2, 10]); frame(110, 3, p.accent); ctx.setLineDash([]);
      for (const [x, y, sx, sy] of [[130, 130, 1, 1], [W - 130, 130, -1, 1], [130, H - 130, 1, -1], [W - 130, H - 130, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); for (let a = 0; a < 11; a += 0.2) ctx.lineTo(Math.cos(a) * a * 4, Math.sin(a) * a * 4); ctx.stroke(); dot(0, 0, 5, p.accent2); ctx.restore(); }
      flower(W / 2, 148, 8, 34, 14, p.accent2, p.accent); return true;
    }
    case "betrothal": {
      bg(); frame(54, 2.5, foil()); frame(72, 1, p.accent2);
      ctx.strokeStyle = foil(); ctx.lineWidth = 7; for (const dx of [-22, 22]) { ctx.beginPath(); ctx.arc(W / 2 + dx, 138, 36, 0, TAU); ctx.stroke(); }
      diamond(W / 2, 90, 14, p.accent); glow(W / 2, 90, 50, "#FFFFFF", 0.5);
      for (const sd of [-1, 1]) laurel(W / 2 + sd * 170, 150, 70, sd < 0 ? 0.3 : Math.PI + 0.3 - 0.6 + 0.6, sd < 0 ? -0.9 : Math.PI + 0.9, p.accent2, 5);
      for (const [x, y] of [[110, 110], [W - 110, 110], [110, H - 110], [W - 110, H - 110]]) star4(x, y, 18, p.accent); return true;
    }
    case "mughal": {
      bg(); const g = ctx.createRadialGradient(W / 2, 200, 40, W / 2, 200, 700); g.addColorStop(0, "#14625E"); g.addColorStop(1, p.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      frame(44, 6, foil()); frame(66, 1.8, p.accent2);
      ctx.fillStyle = foil(); ctx.beginPath(); ctx.ellipse(W / 2, 170, 70, 62, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(W / 2 - 70, 168, 140, 12); ctx.fillRect(W / 2 - 3, 88, 6, 24); dot(W / 2, 84, 7, p.accent2);
      for (const x of [140, W - 140]) { ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 66); ctx.lineTo(x, 190); ctx.stroke(); glow(x, 250, 80, "#FFD166", 0.6); ctx.fillStyle = foil(); ctx.beginPath(); ctx.moveTo(x - 10, 190); ctx.lineTo(x + 10, 190); ctx.lineTo(x + 34, 250); ctx.lineTo(x + 10, 322); ctx.lineTo(x - 10, 322); ctx.lineTo(x - 34, 250); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#FFE9A8"; ctx.beginPath(); ctx.ellipse(x, 252, 12, 40, 0, 0, TAU); ctx.fill(); }
      for (let x = 120; x <= W - 120; x += 80) { star4(x, H - 110, 20, p.accent); star4(x + 40, H - 110, 8, p.accent2); } return true;
    }
    case "sapphire": {
      bg(); const g = ctx.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H * 0.4, 950); g.addColorStop(0, "#16307A"); g.addColorStop(1, p.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = p.accent + "99"; ctx.lineWidth = 2; for (let x = 60; x <= W - 60; x += 36) for (const y of [60, H - 60]) { ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.stroke(); } for (let y = 96; y <= H - 96; y += 36) for (const x of [60, W - 60]) { ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.stroke(); }
      frame(104, 3, foil()); frame(118, 1, p.accent2);
      for (const [x, y] of [[104, 104], [W - 104, 104], [104, H - 104], [W - 104, H - 104]]) { star4(x, y, 34, p.accent); star4(x, y, 14, p.accent2); } return true;
    }
    case "walima": {
      bg(); frame(54, 3, p.accent); frame(70, 1, p.accent2);
      for (const y of [112, H - 112]) for (let x = 120; x < W - 100; x += 56) { leaf(x, y, 40, 11, y < 200 ? 0.5 : -0.5, x % 112 ? "#5E9E7F" : "#2F8A66"); dot(x + 24, y + (y < 200 ? 20 : -20), 4, p.accent2); }
      for (const [x, y, sx, sy] of [[96, 96, 1, 1], [W - 96, 96, -1, 1], [96, H - 96, 1, -1], [W - 96, H - 96, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); for (let i = 0; i < 4; i++) leaf(0, 0, 90, 20, 0.25 + i * 0.3, i % 2 ? "#2F8A66" : "#5E9E7F"); flower(18, 18, 5, 26, 10, "#FFFFFF", p.accent2); ctx.restore(); }
      ctx.strokeStyle = p.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(W / 2, 150, 20, 0.6, TAU - 0.6); ctx.stroke(); star4(W / 2 + 16, 146, 8, p.accent2); return true;
    }
    case "emeraldfoil": {
      bg(); const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, 900); g.addColorStop(0, "#0B5C45"); g.addColorStop(1, p.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 80; i++) dot(R() * W, R() * H, 1 + R() * 2, `rgba(243,222,149,${0.12 + R() * 0.25})`);
      notched(48, 64, 6, foil()); notched(70, 50, 2, p.accent2); notched(86, 40, 1, p.accent);
      for (const [x, y] of [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]]) { diamond(x, y, 20, foil()); } return true;
    }
    case "marble": {
      bg(); const Rm = rng(5); ctx.lineCap = "round";
      for (let i = 0; i < 16; i++) { ctx.strokeStyle = i % 4 === 0 ? p.accent + "66" : "rgba(120,120,135,0.22)"; ctx.lineWidth = i % 4 === 0 ? 2.5 : 1.4; ctx.beginPath(); let x = Rm() * W, y = Rm() * H; ctx.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Rm() - 0.35) * 200; y += (Rm() - 0.2) * 150; ctx.lineTo(x, y); } ctx.stroke(); }
      frame(58, 2.5, foil());
      for (const [x, y, sx, sy] of [[110, 120, 1, 1], [W - 110, H - 120, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); for (let i = 0; i < 4; i++) leaf(0, 0, 130, 24, 0.2 + i * 0.38, "#9DB8A0"); for (const [px, py, r] of [[40, 40, 60], [100, 20, 44], [20, 100, 44], [78, 84, 36]] as const) { glow(px, py, r * 1.3, "#F4A8BA", 0.7); flower(px, py, 8, r * 0.55, r * 0.26, "#F8C5D0", "#F6A5B8", px); } ctx.restore(); }
      return true;
    }
    case "burgundy": {
      bg(); frame(50, 5, foil()); frame(70, 1.5, p.accent2); for (const [x, y] of [[50, 50], [W - 50, 50], [50, H - 50], [W - 50, H - 50]]) star4(x, y, 24, p.accent);
      ctx.strokeStyle = foil(); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, 150, 64, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W / 2, 150, 54, 0, TAU); ctx.stroke();
      laurel(W / 2, 150, 78, Math.PI * 0.55, Math.PI * 1.4, p.accent, 8); laurel(W / 2, 150, 78, Math.PI * 0.45, -Math.PI * 0.4, p.accent, 8);
      ctx.fillStyle = p.accent; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = '700 48px "Noto Serif", Georgia, serif'; ctx.fillText(`${ini.a}${ini.b ? " & " + ini.b : ""}`, W / 2, 152); return true;
    }
    case "rosegold": {
      bg(); const sh = ctx.createLinearGradient(0, 0, W, H); sh.addColorStop(0, "rgba(255,255,255,0.5)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(201,138,126,0.12)"); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = foil(); ctx.lineWidth = 8; for (const dx of [-34, 34]) { ctx.beginPath(); ctx.arc(W / 2 + dx, 142, 56, 0, TAU); ctx.stroke(); } diamond(W / 2 + 34, 82, 13, "#FFFFFF"); glow(W / 2 + 34, 82, 40, "#FFFFFF", 0.7);
      for (const y of [64, H - 64]) { ctx.fillStyle = foil(); ctx.fillRect(100, y, W - 200, 3); } for (const [x, y] of [[100, 64], [W - 100, 64], [100, H - 64], [W - 100, H - 64]]) dot(x, y, 8, p.accent);
      for (let i = 0; i < 16; i++) star4(R() * W, R() * H, 6 + R() * 8, p.accent2 + "99"); return true;
    }
    case "starlight": {
      bg(); glow(W / 2, 420, 700, "#3A3A48", 0.5); frame(58, 3, foil()); frame(78, 1, p.accent2);
      for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H; if (x > 140 && x < W - 140 && y > 140 && y < H - 140) continue; star4(x, y, 4 + R() * 12, i % 3 ? p.accent : "#FFFFFF"); }
      for (let i = 0; i < 60; i++) dot(R() * W, R() * H, 1 + R() * 2, "rgba(255,240,200,0.4)"); return true;
    }
    case "goldconfetti": {
      bg(); glow(W / 2, 300, 600, "#22305F", 0.7); frame(56, 4, foil()); frame(74, 1.5, p.accent2);
      confetti(110, 3, [p.accent, p.accent2, "#FFFFFF", "#E7B5C7", "#7FB7E9"], (x, y) => x < 170 || x > W - 170 || y < 170 || y > H - 170);
      star4(W / 2, 128, 22, p.accent); return true;
    }
    case "pastelballoon": {
      bg(); const cl = (x: number, y: number, s: number) => { ctx.fillStyle = "rgba(255,255,255,0.95)"; for (const [dx, dy, r] of [[0, 0, 60], [70, -20, 76], [150, 0, 60], [75, 18, 62]] as const) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); } };
      cl(-30, H - 60, 1.3); cl(W - 190, H - 40, 1.4); cl(330, H - 20, 1.1);
      const cols = ["#FF9AA2", "#FFDAC1", "#FFF3A8", "#B5EAD7", "#A5D8FF", "#CDB4F6"];
      for (const [x, y, c, sx] of [[110, 150, 0, 1], [190, 100, 2, 1], [70, 280, 4, 1], [W - 110, 150, 5, -1], [W - 190, 100, 1, -1], [W - 70, 280, 3, -1]] as const) { ctx.strokeStyle = "#B9A9C9"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 52); ctx.quadraticCurveTo(x + 22 * sx, y + 110, x - 8 * sx, y + 190); ctx.stroke(); ctx.fillStyle = cols[c]; ctx.beginPath(); ctx.ellipse(x, y, 44, 54, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(x - 14, y - 18, 10, 16, 0.4, 0, TAU); ctx.fill(); ctx.fillStyle = cols[c]; ctx.beginPath(); ctx.moveTo(x, y + 52); ctx.lineTo(x - 7, y + 64); ctx.lineTo(x + 7, y + 64); ctx.fill(); }
      for (let i = 0; i < 24; i++) star4(R() * W, 80 + R() * (H - 300), 5 + R() * 7, i % 2 ? "#FFE08A" : "#FFFFFF"); return true;
    }
    case "rosegoldbday": {
      bg(); frame(54, 2.5, foil()); frame(72, 1, p.accent2);
      for (const [x, y, sx, sy] of [[120, 130, 1, 1], [W - 120, 130, -1, 1], [120, H - 130, 1, -1], [W - 120, H - 130, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); for (let i = 0; i < 3; i++) leaf(0, 0, 120, 20, 0.15 + i * 0.5, "#B7C9B0"); flower(30, 30, 9, 44, 18, "#F4C2C2", "#C98A7E"); flower(92, 18, 7, 28, 12, "#F9D5D3", "#C98A7E"); flower(18, 92, 7, 28, 12, "#F9D5D3", "#C98A7E"); ctx.restore(); }
      for (let i = 0; i < 34; i++) { const x = R() * W, y = R() * H; if (x > 200 && x < W - 200 && y > 200 && y < H - 200) continue; star4(x, y, 5 + R() * 10, i % 2 ? p.accent : "#FFFFFF"); } return true;
    }
    case "gruhapravesham": {
      bg(); const zari = foil(); frame(40, 16, zari); frame(66, 3, p.accent2);
      ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(90, 96); ctx.quadraticCurveTo(W / 2, 170, W - 90, 96); ctx.stroke();
      for (let i = 0; i <= 14; i++) { const f = i / 14, x = 90 + f * (W - 180), y = 96 + Math.sin(f * Math.PI) * 37; leaf(x, y, 62, 14, Math.PI / 2 - 0.25 + (i % 2) * 0.5, i % 2 ? "#2F8A3E" : "#4FA35B"); if (i % 2 === 0) dot(x, y + 4, 8, "#F59F00"); }
      lamp(W / 2, H - 170, 64); for (const x of [W / 2 - 140, W / 2 + 140]) { flower(x, H - 110, 8, 26, 11, "#FFD43B", "#E8590C"); } return true;
    }
    case "emeraldhome": {
      bg(); frame(50, 5, foil()); frame(70, 1.5, p.accent2);
      ctx.strokeStyle = foil(); ctx.fillStyle = "rgba(0,0,0,0)"; ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(W / 2 - 62, 168); ctx.lineTo(W / 2 - 62, 118); ctx.lineTo(W / 2, 74); ctx.lineTo(W / 2 + 62, 118); ctx.lineTo(W / 2 + 62, 168); ctx.closePath(); ctx.stroke(); ctx.strokeRect(W / 2 - 16, 126, 32, 42);
      dot(W / 2 + 8, 150, 3.5, p.accent); ctx.lineJoin = "miter";
      for (const [x, y, sx, sy] of [[110, 110, 1, 1], [W - 110, 110, -1, 1], [110, H - 110, 1, -1], [W - 110, H - 110, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.strokeStyle = p.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(0, 0); ctx.lineTo(60, 0); ctx.stroke(); diamond(14, 14, 7, p.accent2); ctx.restore(); } return true;
    }
    case "christianhome": {
      bg(); frame(54, 2.5, foil()); frame(72, 1, p.accent2);
      ctx.strokeStyle = foil(); ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(W / 2 - 58, 168); ctx.lineTo(W / 2 - 58, 120); ctx.lineTo(W / 2, 84); ctx.lineTo(W / 2 + 58, 120); ctx.lineTo(W / 2 + 58, 168); ctx.closePath(); ctx.stroke(); ctx.lineJoin = "miter";
      ctx.fillStyle = foil(); ctx.fillRect(W / 2 - 3, 52, 6, 36); ctx.fillRect(W / 2 - 14, 62, 28, 6);
      for (const sd of [0, 1]) laurel(sd ? W - 130 : 130, 800, 330, sd ? -0.5 : Math.PI + 0.5, sd ? 0.5 : Math.PI - 0.5, "#8FA06A", 12); return true;
    }
    case "choroonu": {
      bg(); frame(40, 18, foil()); frame(70, 3, p.accent2);
      ctx.strokeStyle = foil(); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, 98, 56, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.fillStyle = mix(p.bg1, p.accent, 0.35); ctx.beginPath(); ctx.arc(W / 2, 98, 52, 0.15 * Math.PI, 0.85 * Math.PI); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2; for (const dx of [-60, 60]) { ctx.beginPath(); ctx.moveTo(W / 2 + dx, 92); ctx.lineTo(W / 2 + dx * 0.5, 76); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(W / 2 - 60, 92); ctx.lineTo(W / 2 - 30, 68); ctx.lineTo(W / 2 + 30, 68); ctx.lineTo(W / 2 + 60, 92); ctx.stroke();
      for (const x of [220, W / 2, W - 220]) lotus(x, H - 120, x === W / 2 ? 78 : 56, "#F8C1D4", "#C2185B"); for (let x = 120; x < W - 100; x += 34) diamond(x, H - 60, 6, p.accent2); return true;
    }
    case "baptism": {
      bg(); glow(W / 2, 160, 320, "#FFF6C8", 0.7); frame(56, 2.5, foil());
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; ctx.strokeStyle = "rgba(230,200,120,0.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 90, 150 + Math.sin(a) * 60); ctx.lineTo(W / 2 + Math.cos(a) * 230, 150 + Math.sin(a) * 150); ctx.stroke(); }
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = p.accent2; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(W / 2, 150); ctx.bezierCurveTo(W / 2 - 40, 90, W / 2 - 110, 90, W / 2 - 150, 120); ctx.bezierCurveTo(W / 2 - 110, 120, W / 2 - 80, 140, W / 2 - 40, 158); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W / 2, 150); ctx.bezierCurveTo(W / 2 + 40, 90, W / 2 + 110, 90, W / 2 + 150, 120); ctx.bezierCurveTo(W / 2 + 110, 120, W / 2 + 80, 140, W / 2 + 40, 158); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W / 2, 156, 40, 22, 0, 0, TAU); ctx.fill(); ctx.stroke(); dot(W / 2 - 28, 142, 14, "#FFFFFF"); ctx.strokeStyle = p.accent2; ctx.beginPath(); ctx.arc(W / 2 - 28, 142, 14, 0, TAU); ctx.stroke(); ctx.fillStyle = "#F4B942"; ctx.beginPath(); ctx.moveTo(W / 2 - 42, 142); ctx.lineTo(W / 2 - 58, 146); ctx.lineTo(W / 2 - 42, 150); ctx.fill();
      for (const [x, y, s] of [[170, H - 120, 1], [W - 250, H - 90, 1.1]] as const) { ctx.fillStyle = "rgba(255,255,255,0.95)"; for (const [dx, r] of [[0, 46], [50, 58], [110, 44]] as const) { ctx.beginPath(); ctx.arc(x + dx * s, y, r * s, 0, TAU); ctx.fill(); } } return true;
    }
    case "babyshower": {
      bg(); frame(56, 2, foil()); frame(72, 0.8, p.accent2);
      for (const [x, y, sx, sy] of [[130, 130, 1, 1], [W - 130, 130, -1, 1], [130, H - 130, 1, -1], [W - 130, H - 130, -1, -1]] as const) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); for (let i = 0; i < 4; i++) leaf(0, 0, 110, 18, 0.2 + i * 0.4, "#C5D8B8"); flower(34, 34, 8, 40, 17, "#FBC9D4", "#E8A33D"); flower(96, 22, 6, 26, 11, "#FFE2B8", "#E8A33D"); flower(22, 96, 6, 26, 11, "#D9E7FF", "#E8A33D"); ctx.restore(); }
      for (let i = 0; i < 20; i++) { const x = R() * W, y = R() * H; if (x > 210 && x < W - 210 && y > 210 && y < H - 210) continue; dot(x, y, 3 + R() * 4, i % 2 ? "#F4C2C2" : "#FFE08A"); } return true;
    }
    case "aqiqah": {
      bg(); glow(W / 2, 180, 380, "#2A8A6A", 0.4); frame(46, 6, foil()); frame(68, 1.8, p.accent2);
      ctx.fillStyle = foil(); ctx.beginPath(); ctx.arc(W / 2 - 14, 130, 52, 0, TAU); ctx.fill(); ctx.fillStyle = p.bg1; ctx.beginPath(); ctx.arc(W / 2 + 6, 122, 46, 0, TAU); ctx.fill(); star4(W / 2 + 56, 112, 22, p.accent2);
      for (let x = 120; x <= W - 120; x += 80) { star4(x, H - 110, 18, p.accent); diamond(x + 40, H - 110, 7, p.accent2); } return true;
    }
    case "ribbon": {
      bg(); glow(W / 2, 200, 650, "#4A3A12", 0.55); frame(50, 8, foil()); frame(74, 2, p.accent2);
      ctx.fillStyle = "#B3122B"; ctx.beginPath(); ctx.moveTo(40, 110); ctx.quadraticCurveTo(W / 4, 80, W / 2 - 30, 112); ctx.lineTo(W / 2 - 40, 150); ctx.quadraticCurveTo(W / 4, 118, 40, 150); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(W - 40, 110); ctx.quadraticCurveTo(W * 0.75, 80, W / 2 + 30, 112); ctx.lineTo(W / 2 + 40, 150); ctx.quadraticCurveTo(W * 0.75, 118, W - 40, 150); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = foil(); ctx.lineWidth = 5; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(W / 2 + sd * 16, 190, 14, 24, sd * 0.5, 0, TAU); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(W / 2 - 40, 150); ctx.lineTo(W / 2 + 16, 232); ctx.moveTo(W / 2 + 40, 150); ctx.lineTo(W / 2 - 16, 232); ctx.stroke();
      for (let i = 0; i < 26; i++) star4(R() * W, R() * H, 4 + R() * 8, p.accent + "AA"); return true;
    }
    case "anniversary": {
      bg(); frame(52, 5, foil()); frame(72, 1.5, p.accent2); for (const [x, y] of [[52, 52], [W - 52, 52], [52, H - 52], [W - 52, H - 52]]) { ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(x - 7, y, 9, 0, TAU); ctx.arc(x + 7, y, 9, 0, TAU); ctx.fill(); diamond(x, y + 8, 12, p.accent); }
      ctx.strokeStyle = foil(); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, 150, 62, 0, TAU); ctx.stroke(); laurel(W / 2, 150, 76, Math.PI * 0.55, Math.PI * 1.4, p.accent, 8); laurel(W / 2, 150, 76, Math.PI * 0.45, -Math.PI * 0.4, p.accent, 8);
      ctx.fillStyle = p.accent; ctx.beginPath(); ctx.moveTo(W / 2, 176); ctx.bezierCurveTo(W / 2 - 54, 138, W / 2 - 34, 100, W / 2, 128); ctx.bezierCurveTo(W / 2 + 34, 100, W / 2 + 54, 138, W / 2, 176); ctx.fill(); return true;
    }
    default: return false;
  }
}

/**
 * Client-only canvas renderer for the wedding card studio. One flow layout (blessing, title, names, photo, parents,
 * message, date, venue) is typeset over ten themed backgrounds, so the card is identical in the studio, on the guest's
 * invite page and in the downloadable personalised PNG. Logical size is 1080 x 1500; `width` scales it.
 */
import { loadPrintFonts } from "./print-ad-render";
import { EVENT_TITLE, formatDate, type PhotoShape, type WeddingDetails, type WeddingTemplate, type Palette } from "./wedding";

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
const HEX = /^#[0-9a-fA-F]{6}$/;

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
export interface CardZone { id: "blessing" | "title" | "names" | "parents" | "message" | "datetime" | "venue" | "verse" | "photo"; x: number; y: number; w: number; h: number; dual?: boolean }

export async function renderWeddingCard(o: { template: WeddingTemplate; details: WeddingDetails; guest?: { name: string; place: string } | null; photo?: HTMLImageElement | null; photo2?: HTMLImageElement | null; width: number; onZones?: (z: CardZone[]) => void }): Promise<HTMLCanvasElement> {
  const { template: t, details: d } = o;
  const p: Palette = { ...t.pal, ...(HEX.test(d.accent) ? { accent: d.accent } : {}) };
  const all = [d.bride, d.groom, d.brideParents, d.groomParents, d.venue, d.message, d.blessing, d.verse, o.guest?.name, o.guest?.place, t.blessing[1]].join(" ");
  await loadPrintFonts(all + " അആഇ");
  const scale = o.width / CARD_W;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CARD_W * scale); canvas.height = Math.round(CARD_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = "high";
  backdrop(ctx, t, p);

  const lang = d.lang;
  const wantMl = lang !== "en", wantEn = lang !== "ml";
  const M = MARGIN[t.motif] ?? 150;
  const cw = CARD_W - 2 * M;
  const family = t.layout === "minimal" ? SANS : SERIF;
  const title = EVENT_TITLE[d.eventType];
  const en = (s: string) => (hasMl(s) ? s : s);
  void en;

  type Block = { h: number; draw: (y: number) => void; id?: ZoneId; sub?: { id: ZoneId; dy: number; h: number }[]; dual?: boolean };
  const build = (k: number): Block[] => {
    const blocks: Block[] = [];
    const text = (s: string, size: number, weight: number, opt: { id?: ZoneId; color?: string; italic?: boolean; caps?: boolean; ls?: number; fam?: string; lh?: number } = {}) => {
      const str = s.trim();
      if (!str) return;
      const fs = size * k, lh = opt.lh ?? (hasMl(str) ? 1.55 : 1.25);
      ctx.font = `${opt.italic ? "italic " : ""}${weight} ${fs}px ${opt.fam ?? family}`;
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = opt.ls && !hasMl(str) ? `${opt.ls * fs}px` : "0px";
      const lines = wrap(ctx, opt.caps && !hasMl(str) ? str.toUpperCase() : str, cw);
      (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
      blocks.push({
        id: opt.id,
        h: lines.length * fs * lh,
        draw: (y) => {
          ctx.font = `${opt.italic ? "italic " : ""}${weight} ${fs}px ${opt.fam ?? family}`;
          (ctx as Ctx & { letterSpacing: string }).letterSpacing = opt.ls && !hasMl(str) ? `${opt.ls * fs}px` : "0px";
          ctx.fillStyle = opt.color ?? p.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          lines.forEach((l, i) => ctx.fillText(l, CARD_W / 2, y + (i + 0.5) * fs * lh));
          (ctx as Ctx & { letterSpacing: string }).letterSpacing = "0px";
        },
      });
    };
    const rule = (wid: number) => blocks.push({ h: 8 * k, draw: (y) => { ctx.fillStyle = p.accent; ctx.fillRect(CARD_W / 2 - wid / 2, y + 3 * k, wid, 2); } });
    const both = (ml: string, enS: string, size: number, weight: number, opt: Parameters<typeof text>[3] = {}) => {
      if (wantMl && ml) text(ml, size, weight, opt);
      if (wantEn && enS) text(enS, wantMl ? size * 0.72 : size, weight, opt);
    };

    if (o.guest?.name) {
      const g = o.guest;
      text(wantMl && !wantEn ? `പ്രിയപ്പെട്ട ${g.name},` : `Dear ${g.name},`, 38, 700, { color: p.accent, italic: !hasMl(g.name) });
      if (g.place) text(g.place, 28, 500, { color: p.sub, fam: SANS });
    }
    const bless = d.blessing.trim();
    if (bless) text(bless, 30, 500, { id: "blessing", color: p.sub, italic: true });
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
            const x = CARD_W / 2 - pw / 2;
            ctx.save(); ctx.translate(CARD_W / 2, y + (ph + pad + cap) / 2); ctx.rotate(-0.04); ctx.translate(-CARD_W / 2, -(y + (ph + pad + cap) / 2));
            ctx.shadowColor = "rgba(0,0,0,0.28)"; ctx.shadowBlur = 28 * k; ctx.shadowOffsetY = 12 * k; ctx.fillStyle = "#fff"; ctx.fillRect(x, y, pw, ph + pad + cap); ctx.shadowColor = "transparent";
            ctx.save(); ctx.beginPath(); ctx.rect(x + pad, y + pad, pw - 2 * pad, ph - pad); ctx.clip();
            if (photo) {
              const cover = (im: HTMLImageElement, bx: number, bw: number) => { ctx.save(); ctx.beginPath(); ctx.rect(bx, y + pad, bw, ph - pad); ctx.clip(); const sc = Math.max(bw / im.width, (ph - pad) / im.height); ctx.drawImage(im, bx + (bw - im.width * sc) / 2, y + pad + (ph - pad - im.height * sc) / 2, im.width * sc, im.height * sc); ctx.restore(); };
              if (photo2) { const gp = 10 * k, hw = (pw - 2 * pad - gp) / 2; cover(photo, x + pad, hw); cover(photo2, x + pad + hw + gp, hw); }
              else cover(photo, x + pad, pw - 2 * pad);
            }
            else { const g = ctx.createLinearGradient(x, y, x + pw, y + ph); g.addColorStop(0, p.accent2 + "88"); g.addColorStop(1, p.accent + "55"); ctx.fillStyle = g; ctx.fillRect(x + pad, y + pad, pw - 2 * pad, ph - pad); ctx.fillStyle = "#fff"; ctx.font = `700 ${120 * k}px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", CARD_W / 2, y + pad + (ph - pad) / 2); }
            ctx.restore();
            ctx.fillStyle = p.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `italic 700 ${50 * k}px ${SERIF}`;
            ctx.fillText([d.groom, d.bride].filter(Boolean).join(" & ") || "Bride & Groom", CARD_W / 2, y + ph + pad + cap / 2 - 4 * k);
            ctx.restore();
          },
        });
        return;
      }
      if (!photo) return;
      const small = t.layout === "minimal";
      const dual = !!photo2;
      const gapP = 40 * k, ring = 24 * k;
      const baseW = (t.shape === "arch" ? 330 : small ? 300 : 340) * k;
      const pw = dual ? Math.min(baseW * 0.82, (cw - gapP - ring) / 2) : baseW;
      const ph = dual ? (t.shape === "circle" ? pw : t.shape === "arch" ? pw * 1.28 : t.shape === "oval" ? pw * 1.18 : pw * 1.1) : (t.shape === "circle" ? 340 : t.shape === "arch" ? 420 : t.shape === "oval" ? 400 : small ? 380 : 340) * k;
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
          if (photo2) { const x0 = CARD_W / 2 - (2 * pw + gapP) / 2; one(photo, x0, y); one(photo2, x0 + pw + gapP, y); }
          else one(photo, CARD_W / 2 - pw / 2, y);
        },
      });
    };

    if (t.layout === "polaroid") {
      photoBlock();
    } else {
      const nm = (s: string) => (t.layout === "minimal" ? s.toUpperCase() : s);
      const groom = d.groom.trim() || "Groom", bride = d.bride.trim() || "Bride";
      text(nm(groom), 104, 800, { id: "names", ls: t.layout === "minimal" ? 0.04 : 0, lh: hasMl(groom) ? 1.45 : 1.1 });
      text(wantMl && !wantEn ? "&" : "&", 56, 400, { id: "names", color: p.accent, italic: true, lh: 1 });
      text(nm(bride), 104, 800, { id: "names", ls: t.layout === "minimal" ? 0.04 : 0, lh: hasMl(bride) ? 1.45 : 1.1 });
      photoBlock();
    }
    const sonOf = wantMl && !wantEn ? (n: string, par: string, son: boolean) => `${n}, ${par} ദമ്പതികളുടെ ${son ? "പുത്രൻ" : "പുത്രി"}` : (n: string, par: string, son: boolean) => `${n} ${son ? "S/o" : "D/o"} ${par}`;
    const parents = [d.groomParents.trim() && sonOf(d.groom.trim() || "Groom", d.groomParents.trim(), true), d.brideParents.trim() && sonOf(d.bride.trim() || "Bride", d.brideParents.trim(), false)].filter(Boolean).join("\n");
    if (parents) text(parents, 30, 500, { id: "parents", color: p.sub, fam: SANS });
    const msg = d.message.trim();
    if (msg) text(msg, 32, 500, { id: "message", italic: true, color: p.ink });
    else if (t.layout !== "polaroid") both("നിങ്ങളുടെ സാന്നിധ്യവും അനുഗ്രഹവും ഉണ്ടാകണമെന്ന് സവിനയം ക്ഷണിക്കുന്നു.", "We joyfully invite you to bless us with your presence.", 32, 500, { id: "message", italic: true });
    if (t.layout === "minimal") rule(120);
    const dt = d.date;
    if (dt) { text(formatDate(dt, wantEn ? "en" : "ml"), 48, 800, { id: "datetime", color: p.accent === p.ink ? p.ink : p.ink }); if (lang === "both") text(formatDate(dt, "ml"), 34, 600, { id: "datetime", color: p.sub }); }
    if (d.time.trim()) text(`${lang === "ml" ? "സമയം" : lang === "both" ? "സമയം / Time" : "Time"}: ${d.time.trim()}`, 34, 600, { id: "datetime", color: p.accent, fam: SANS });
    if (d.venue.trim()) { text(lang === "ml" ? "വേദി" : lang === "both" ? "വേദി / Venue" : "Venue", 26, 700, { id: "venue", color: p.sub, caps: true, ls: 0.18, fam: SANS }); text(d.venue.trim(), 36, 700, { id: "venue" }); }
    if (d.verse.trim()) text(d.verse.trim(), 26, 500, { id: "verse", italic: true, color: p.sub });
    return blocks;
  };

  const top = M * 0.8, avail = CARD_H - 2 * top;
  let k = 1.1, blocks = build(k);
  const gapOf = (kk: number) => 24 * kk;
  const total = (bs: Block[], kk: number) => bs.reduce((a, b) => a + b.h, 0) + Math.max(0, bs.length - 1) * gapOf(kk);
  while (total(blocks, k) > avail && k > 0.45) { k *= 0.96; blocks = build(k); }
  const extra = Math.max(0, avail - total(blocks, k));
  const gap = gapOf(k) + (blocks.length > 1 ? Math.min(extra / (blocks.length - 1), 46) : 0);
  const used = blocks.reduce((a, b) => a + b.h, 0) + (blocks.length - 1) * gap;
  let y = top + Math.max(0, (avail - used) / 2);
  const zones: CardZone[] = [];
  const add = (id: ZoneId, y0: number, h: number, dual?: boolean) => {
    const last = zones[zones.length - 1];
    if (last && last.id === id && last.h >= 0 && y0 - (last.y + last.h) < gap * 1.5) { last.h = y0 + h - last.y; return; }
    zones.push({ id, x: M * 0.7, y: y0, w: CARD_W - 2 * M * 0.7, h, dual });
  };
  for (const b of blocks) {
    b.draw(y);
    if (b.id) add(b.id, y - 6, b.h + 12, b.dual);
    for (const s of b.sub ?? []) zones.push({ id: s.id, x: M * 0.7, y: y + s.dy - 6, w: CARD_W - 2 * M * 0.7, h: s.h + 12 });
    y += b.h + gap;
  }
  o.onZones?.(zones);
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
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

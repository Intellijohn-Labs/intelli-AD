/** Brand logo / photo placement shared by the image-card renderer, the live video preview and the MP4 exporter. Sizes are px on a 1080-wide frame and scale with the frame. */
export type LogoShape = "circle" | "rounded" | "free";
export const LOGO_SHAPES: { id: LogoShape; label: string }[] = [{ id: "circle", label: "Circle" }, { id: "rounded", label: "Rounded" }, { id: "free", label: "Original / Free" }];
export const LOGO_SIZE = { min: 40, max: 180, def: 170 };
export interface LogoSpec { x: number | null; y: number | null; size: number; shape: LogoShape }
export const isLogoShape = (v: unknown): v is LogoShape => v === "circle" || v === "rounded" || v === "free";

/** The logo's box on a W x H frame: size, and centre (the saved % position, or bottom-left when it hasn't been moved), kept inside the frame. */
export function logoBox(img: { width: number; height: number } | null, s: LogoSpec, W: number, H: number) {
  const k = W / 1080, d = Math.max(8, Math.min(LOGO_SIZE.max * 1.5, Math.max(LOGO_SIZE.min, s.size || LOGO_SIZE.def))) * k;
  const aspect = img && img.width > 0 ? img.height / img.width : 1;
  const w = s.shape === "free" ? (aspect > 1 ? d / aspect : d) : d, h = s.shape === "free" ? (aspect > 1 ? d : d * aspect) : d;
  const m = d * 0.28;
  const dx = s.x != null ? (s.x / 100) * W : m + w / 2, dy = s.y != null ? (s.y / 100) * H : H - m - h / 2;
  return { w, h, cx: Math.min(W - w / 2, Math.max(w / 2, dx)), cy: Math.min(H - h / 2, Math.max(h / 2, dy)) };
}

/** Draws the logo on `ctx` (frame pixels): circle / rounded get a white ring and shadow; "free" keeps the image's own outline (transparent PNGs stay transparent). */
export function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, s: LogoSpec, W: number, H: number) {
  const { w, h, cx, cy } = logoBox(img, s, W, H), x = cx - w / 2, y = cy - h / 2, k = W / 1080;
  const shape = (ox: number, oy: number, ww: number, hh: number, r: number) => { ctx.beginPath(); if (s.shape === "circle") ctx.ellipse(ox + ww / 2, oy + hh / 2, ww / 2, hh / 2, 0, 0, Math.PI * 2); else ctx.roundRect(ox, oy, ww, hh, r); };
  ctx.save();
  if (s.shape === "free") {
    ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 10 * k; ctx.drawImage(img, x, y, w, h);
  } else {
    const r = Math.min(w, h) * 0.16, ring = Math.max(2, 3 * k);
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 14 * k; shape(x, y, w, h, r); ctx.fillStyle = "#fff"; ctx.fill(); ctx.shadowColor = "transparent";
    shape(x + ring, y + ring, w - 2 * ring, h - 2 * ring, Math.max(0, r - ring)); ctx.clip();
    const iw = w - 2 * ring, ih = h - 2 * ring, sc = Math.max(iw / img.width, ih / img.height);
    ctx.drawImage(img, x + ring + (iw - img.width * sc) / 2, y + ring + (ih - img.height * sc) / 2, img.width * sc, img.height * sc);
  }
  ctx.restore();
}

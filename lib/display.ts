import type { CategoryId, DisplaySpec, Newspaper } from "./types";

/** Categories that are always booked as Classified Display (billed by size in cm², never per line). */
export const DISPLAY_ONLY_CATEGORIES: CategoryId[] = ["obituary", "remembrance", "tender"];
export const isDisplayOnlyCategory = (id?: CategoryId | null) => !!id && DISPLAY_ONLY_CATEGORIES.includes(id);

export type CreativeMode = "builder" | "upload";

export interface SizePreset {
  widthCm: number;
  heightCm: number;
  label: string;
}

/** Standard classified-display sizes (width × height in cm). */
export const SIZE_PRESETS: SizePreset[] = [
  { widthCm: 4, heightCm: 5, label: "Single column" },
  { widthCm: 4, heightCm: 8, label: "Single column tall" },
  { widthCm: 8, heightCm: 6, label: "Double column" },
  { widthCm: 8, heightCm: 10, label: "Double column tall" },
  { widthCm: 12, heightCm: 10, label: "Triple column" },
  { widthCm: 16, heightCm: 12, label: "Four column" },
];

export const WIDTH_LIMITS = { min: 3, max: 40 };
export const HEIGHT_LIMITS = { min: 3, max: 60 };

const half = (n: number) => Math.round(n * 2) / 2;

/** Width of the ad in cm: the explicit width when set, otherwise columns × the paper's column width. */
export function displayWidth(spec: DisplaySpec, colWidthCm: number) {
  return spec.widthCm && spec.widthCm > 0 ? spec.widthCm : half(spec.columns * colWidthCm);
}

/** Closest whole column count for a width, so legacy column-based code keeps working. */
export const columnsFor = (widthCm: number, colWidthCm: number) => Math.max(1, Math.round(widthCm / colWidthCm));

// ── Creative file analysis (aspect ratio and resolution) ──────────────────────────────────

export interface CreativeInfo {
  kind: "jpg" | "png" | "tiff" | "pdf";
  /** Pixel size (raster files). */
  widthPx?: number;
  heightPx?: number;
  /** Physical size in cm when the file declares it (PDF page size, TIFF with resolution). */
  widthCm?: number;
  heightCm?: number;
  /** Embedded dpi (TIFF) when declared. */
  declaredDpi?: number;
}

export function fileKind(name: string): CreativeInfo["kind"] | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "png") return "png";
  if (ext === "tif" || ext === "tiff") return "tiff";
  if (ext === "pdf") return "pdf";
  return null;
}

function readImage(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

/** Minimal TIFF header reader: ImageWidth, ImageLength, XResolution and ResolutionUnit. */
async function readTiff(file: File): Promise<Partial<CreativeInfo>> {
  const buf = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
  const dv = new DataView(buf);
  const le = dv.getUint16(0) === 0x4949;
  if (!le && dv.getUint16(0) !== 0x4d4d) throw new Error("not tiff");
  const u16 = (o: number) => dv.getUint16(o, le);
  const u32 = (o: number) => dv.getUint32(o, le);
  let off = u32(4);
  const n = u16(off);
  let w = 0, h = 0, xres = 0, unit = 2;
  for (let i = 0; i < n; i++) {
    const e = off + 2 + i * 12;
    if (e + 12 > buf.byteLength) break;
    const tag = u16(e), type = u16(e + 2);
    const value = type === 3 ? u16(e + 8) : u32(e + 8);
    if (tag === 256) w = value;
    else if (tag === 257) h = value;
    else if (tag === 296) unit = value;
    else if (tag === 282 && value + 8 <= buf.byteLength) xres = u32(value) / (u32(value + 4) || 1);
  }
  off = 0;
  const dpi = xres ? (unit === 3 ? xres * 2.54 : xres) : undefined;
  return { widthPx: w, heightPx: h, declaredDpi: dpi && dpi > 1 ? dpi : undefined };
}

/** First-page /MediaBox of a PDF, in cm (best effort; compressed object streams are not parsed). */
async function readPdf(file: File): Promise<Partial<CreativeInfo>> {
  const text = new TextDecoder("latin1").decode(await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer());
  const m = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/.exec(text);
  if (!m) return {};
  const wPt = Math.abs(parseFloat(m[3]) - parseFloat(m[1]));
  const hPt = Math.abs(parseFloat(m[4]) - parseFloat(m[2]));
  return { widthCm: (wPt / 72) * 2.54, heightCm: (hPt / 72) * 2.54 };
}

export async function inspectCreative(file: File): Promise<CreativeInfo | null> {
  const kind = fileKind(file.name);
  if (!kind) return null;
  try {
    if (kind === "jpg" || kind === "png") {
      const { w, h } = await readImage(file);
      return { kind, widthPx: w, heightPx: h };
    }
    if (kind === "tiff") return { kind, ...(await readTiff(file)) };
    return { kind, ...(await readPdf(file)) };
  } catch {
    return { kind };
  }
}

export interface CreativeCheck {
  level: "ok" | "warn" | "error";
  message: string;
}

/** Compares a creative against the booked size: aspect ratio first, then effective dpi at that size. */
export function checkCreative(info: CreativeInfo, widthCm: number, heightCm: number): CreativeCheck[] {
  const out: CreativeCheck[] = [];
  const target = widthCm / heightCm;
  const srcRatio = info.widthPx && info.heightPx ? info.widthPx / info.heightPx : info.widthCm && info.heightCm ? info.widthCm / info.heightCm : null;

  if (srcRatio) {
    const diff = Math.abs(srcRatio - target) / target;
    if (diff <= 0.03) out.push({ level: "ok", message: `Aspect ratio matches the ${widthCm} × ${heightCm} cm box.` });
    else if (diff <= 0.1) out.push({ level: "warn", message: `Aspect ratio is ${diff > 0 ? Math.round(diff * 100) : 0}% off the ${widthCm} × ${heightCm} cm box; edges may be trimmed.` });
    else out.push({ level: "error", message: `Aspect ratio ${srcRatio.toFixed(2)}:1 does not fit the ${widthCm} × ${heightCm} cm box (${target.toFixed(2)}:1). Resize the artwork or change the size.` });
  } else if (info.kind === "pdf") {
    out.push({ level: "warn", message: "Could not read the PDF page size. The publication will verify it at proofing." });
  }

  if (info.widthPx) {
    const dpi = info.widthPx / (widthCm / 2.54);
    if (dpi >= 280) out.push({ level: "ok", message: `Resolution is ${Math.round(dpi)} dpi at print size. Print-ready.` });
    else if (dpi >= 150) out.push({ level: "warn", message: `Only ${Math.round(dpi)} dpi at print size (300 dpi recommended). Print may look soft.` });
    else out.push({ level: "error", message: `Only ${Math.round(dpi)} dpi at print size. Too low for newsprint; upload a larger file.` });
    if (info.declaredDpi && info.declaredDpi < 150) out.push({ level: "warn", message: `File declares ${Math.round(info.declaredDpi)} dpi.` });
  } else if (info.kind === "pdf") {
    out.push({ level: "ok", message: "PDF is resolution independent. Make sure images inside it are 300 dpi." });
  }
  return out;
}

/** How tall the content would be when the ad column is `widthCm` wide, for the to-scale preview. */
export const cmToPx = (cm: number, scale: number) => cm * scale;

export const paperColWidth = (paper?: Newspaper | null) => paper?.rates.colWidthCm ?? 4;

/** Accept string for portrait pickers: every browser-readable image type, plus HEIC/HEIF from iPhones. */
export const PHOTO_ACCEPT = "image/*,.webp,.avif,.heic,.heif,.bmp,.gif,.tif,.tiff";

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|heic|heif|gif|bmp|tiff?)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

/** HEIC/HEIF is often reported with an empty or odd MIME type, so also sniff the ISO-BMFF "ftyp" brand. */
async function isHeic(file: File): Promise<boolean> {
  if (/image\/hei[cf]/i.test(file.type) || HEIC_EXT.test(file.name)) return true;
  try {
    const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const tag = String.fromCharCode(...b.slice(4, 12));
    return /^ftyp(heic|heix|heim|heis|hevc|hevx|mif1|msf1)/.test(tag);
  } catch { return false; }
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); res(i); };
    i.onerror = () => { URL.revokeObjectURL(url); rej(new Error("decode")); };
    i.src = url;
  });
}

const jpegName = (n: string) => n.replace(/\.[^.]+$/, "") + ".jpg";

/**
 * Validates a picked file and returns it as a JPEG File ready for cropper / proof / poster / upload.
 * JPEGs pass through. Other formats the browser can read are redrawn on a canvas (white background, quality 0.92).
 * HEIC/HEIF (and anything else the browser can't decode) is decoded in the browser with a WASM decoder.
 * Throws an Error whose message is friendly enough to show to the customer as is.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!isImageFile(file) && !(await isHeic(file))) {
    throw new Error("That file isn't a photo. Please choose an image (JPG, PNG, WebP, HEIC…) — PDFs, videos and other documents can't be used here.");
  }
  if (file.size > MAX_PHOTO_BYTES) throw new Error("This photo is larger than 15 MB. Please choose a smaller one.");
  if (file.type === "image/jpeg") return file;

  let img: HTMLImageElement | undefined;
  let source: Blob = file;
  if (!(await isHeic(file))) {
    try { img = await decode(file); } catch { /* try the HEIC decoder below, in case it is a mislabelled one */ }
  }
  if (!img) {
    try {
      const { heicTo } = await import("heic-to");
      source = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
      return new File([source], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() });
    } catch {
      throw new Error(/\.tiff?$/i.test(file.name) || file.type === "image/tiff"
        ? "TIFF photos can't be opened in this browser. Please save it as JPG or PNG and try again."
        : "We couldn't read this photo. It may be damaged or in an unsupported format. Please try another file or save it as JPG.");
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Photo conversion isn't supported in this browser. Please upload a JPG.");
  ctx.fillStyle = "#FFFFFF"; // transparent PNG / WebP areas would otherwise turn black in a JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
  if (!blob) throw new Error("Photo conversion failed. Please try another file.");
  return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() });
}

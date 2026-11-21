/**
 * Greeting videos (browser only): validate an uploaded clip, then burn a guest's name onto it and re-encode it to MP4 with the original audio.
 * Rendering plays the clip once at normal speed into a canvas while MediaRecorder records the canvas plus the clip's own audio (routed through
 * WebAudio, so nothing is played aloud), so each guest's video takes as long as the clip itself.
 */
export const MAX_VIDEO_SECONDS = 60.5; // "up to 60 seconds", with a little slack for container rounding
export const MAX_SOURCE_BYTES = 250 * 1024 * 1024;
/** WhatsApp's video limit is 16 MB; the encoder budget below aims well under it and the result is checked. */
export const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const TARGET_BYTES = 14.5 * 1024 * 1024;
const AUDIO_BPS = 128_000;

export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const OK_TYPES = /^video\/(mp4|quicktime|webm)$/;

export interface VideoInfo { width: number; height: number; duration: number }

/** Validates type, size and length, and reads the clip's dimensions. Rejects with a message ready to show the client. */
export async function probeVideo(file: File): Promise<VideoInfo> {
  const okName = /\.(mp4|mov|webm)$/i.test(file.name);
  if (!OK_TYPES.test(file.type) && !(file.type === "" && okName)) throw new Error("Please upload an MP4, MOV or WebM video.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That video is over 250 MB. Please compress or trim it first.");
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.preload = "metadata"; v.muted = true; v.playsInline = true; v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("This browser can't read that video. Export it as H.264 MP4 (iPhone HEVC .mov files often can't be read) and try again."));
      setTimeout(() => rej(new Error("The video took too long to load. Please try a smaller file.")), 20_000);
    });
    if (!Number.isFinite(v.duration) || v.duration <= 0) throw new Error("Couldn't read the length of that video. Please try another file.");
    if (v.duration > MAX_VIDEO_SECONDS) throw new Error("Please upload a video up to 1 minute (60 seconds) long.");
    if (!v.videoWidth || !v.videoHeight) throw new Error("That file has no video picture. Please choose a video.");
    return { width: v.videoWidth, height: v.videoHeight, duration: v.duration };
  } finally { URL.revokeObjectURL(url); }
}

/** The MP4 flavour this browser's MediaRecorder can produce (H.264 + AAC), or null if it can't make MP4 (WhatsApp does not accept WebM). */
export function pickMp4Mime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/** Output frame size: the clip's own aspect ratio, long side capped at 1280 px (keeps the file small enough for WhatsApp), even numbers for H.264. */
export function outputSize(info: VideoInfo): { w: number; h: number } {
  const k = Math.min(1, 1280 / Math.max(info.width, info.height));
  const even = (n: number) => Math.max(2, Math.round((n * k) / 2) * 2);
  return { w: even(info.width), h: even(info.height) };
}

/** Video bitrate that keeps the whole file (video + 128 kbps audio) at about 14.5 MB for a clip of this length. */
export const videoBitrate = (seconds: number) => Math.round(Math.min(4_000_000, Math.max(600_000, (TARGET_BYTES * 8) / Math.max(1, seconds) - AUDIO_BPS)));

export interface VideoFestival { id: string; en: string; ml: string; quoteEn: string; quoteMl: string }
/** Festival presets for the video greeting: headline + footer quote in English and Malayalam. */
export const VIDEO_FESTIVALS: VideoFestival[] = [
  { id: "vishu", en: "Happy Vishu", ml: "വിഷു ആശംസകൾ", quoteEn: "Dear {name}, may this Vishu bring prosperity, peace, and bright new beginnings to your home.", quoteMl: "പ്രിയ {name}, ഐശ്വര്യത്തിന്റെയും സന്തോഷത്തിന്റെയും സമൃദ്ധിയുടെയും വിഷു ആശംസകൾ!" },
  { id: "onam", en: "Happy Onam", ml: "ഓണാശംസകൾ", quoteEn: "Dear {name}, wishing you and your family a harvest of happiness, harmony, and prosperity this Onam.", quoteMl: "പ്രിയ {name}, സ്നേഹത്തിന്റെയും സമൃദ്ധിയുടെയും ഒരു നല്ല ഓണക്കാലം ആശംസിക്കുന്നു!" },
  { id: "christmas", en: "Merry Christmas", ml: "ക്രിസ്മസ് ആശംസകൾ", quoteEn: "{name}, may the joy and peace of Christmas fill your home with warmth and happiness.", quoteMl: "പ്രിയ {name}, സ്നേഹത്തിന്റെയും സമാധാനത്തിന്റെയും തിരുപ്പിറവി ആശംസകൾ!" },
  { id: "newyear", en: "Happy New Year", ml: "പുതുവത്സരാശംസകൾ", quoteEn: "Wishing you, {name}, a year filled with good health, new milestones, and endless joy.", quoteMl: "{name}, സന്തോഷവും വിജയവും നിറഞ്ഞ ഒരു പുതുവത്സരം ആശംസിക്കുന്നു!" },
  { id: "eid", en: "Eid Mubarak", ml: "ഈദ് മുബാറക്", quoteEn: "{name}, may this blessed Eid bring peace, joy, and abundant blessings to you and your loved ones.", quoteMl: "പ്രിയ {name}, സ്നേഹത്തിന്റെയും സന്തോഷത്തിന്റെയും ഈദ് മുബാറക്!" },
  { id: "diwali", en: "Happy Diwali", ml: "ദീപാവലി ആശംസകൾ", quoteEn: "{name}, may the festival of lights illuminate your life with joy, peace, and prosperity.", quoteMl: "പ്രിയ {name}, വെളിച്ചത്തിന്റെയും സന്തോഷത്തിന്റെയും ദീപാവലി ആശംസകൾ!" },
];

export interface QuoteStyle { text: string; scale: number; color: string; font: "sans" | "serif" | "manjari"; backdrop: boolean }
const QUOTE_FONT = { sans: '"Noto Sans Malayalam", "Noto Sans", Inter, system-ui, sans-serif', serif: '"Noto Serif Malayalam", "Noto Serif", Georgia, serif', manjari: '"Manjari", "Noto Sans Malayalam", system-ui, sans-serif' } as const;

/**
 * The footer quote as a transparent sprite, drawn at `width` px frame width (logical design is 1080 wide). Wraps to at most 3 lines in the chosen
 * Malayalam-capable web font, on a translucent dark pill (optional) with a text shadow so it stays legible over any footage. w1080 is its width in 1080 units.
 */
export async function renderQuoteSprite(q: QuoteStyle, width: number): Promise<{ canvas: HTMLCanvasElement; w1080: number } | null> {
  const text = q.text.trim();
  if (!text) return null;
  const k = width / 1080, fam = QUOTE_FONT[q.font], px = 40 * q.scale * k, weight = q.font === "serif" ? 700 : 600;
  const font = `${weight} ${px}px ${fam}`;
  try { await Promise.race([document.fonts.load(font, text), new Promise((r) => setTimeout(r, 4000))]); } catch { /* fall back to system fonts */ }
  const c = document.createElement("canvas"), cx = c.getContext("2d")!;
  cx.font = font;
  const maxW = 880 * k, padX = 34 * k * q.scale, padY = 22 * k * q.scale, lh = px * 1.38, lines: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (line && cx.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4), textW = Math.min(maxW, Math.max(...shown.map((l) => cx.measureText(l).width)));
  const m = 12 * k, w = Math.ceil(textW + padX * 2 + m * 2), h = Math.ceil(shown.length * lh + padY * 2 + m * 2);
  c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  if (q.backdrop) { g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.roundRect(m, m, w - m * 2, h - m * 2, Math.min(h / 2, 36 * k)); g.fill(); }
  g.fillStyle = q.color; g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowBlur = 8 * k; g.shadowOffsetY = 2 * k;
  shown.forEach((l, i) => g.fillText(l, w / 2, m + padY + lh * (i + 0.5)));
  return { canvas: c, w1080: w / k };
}

export interface RenderGuestVideoOptions {
  /** Object URL of the uploaded clip. */
  src: string;
  info: VideoInfo;
  /** The guest-name overlay, already drawn at output scale (see sprite helpers in the studio). */
  sprite: HTMLCanvasElement;
  /** Overlay centre as 0-100 % of the frame. */
  x: number; y: number;
  /** Footer quote sprite (drawn at output scale) and its centre as 0-100 % of the frame. */
  quote?: { sprite: HTMLCanvasElement; x: number; y: number } | null;
  /** Optional sender logo / photo, drawn as a circle in the bottom-left corner. */
  logo?: HTMLImageElement | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Draws the overlay layers on top of whatever frame is on the canvas. Shared by the render and the poster. */
export function paintOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, o: Pick<RenderGuestVideoOptions, "sprite" | "x" | "y" | "logo" | "quote">) {
  const sw = o.sprite.width, sh = o.sprite.height;
  const cx = Math.min(w - sw / 2, Math.max(sw / 2, (o.x / 100) * w)), cy = Math.min(h - sh / 2, Math.max(sh / 2, (o.y / 100) * h));
  ctx.drawImage(o.sprite, Math.round(cx - sw / 2), Math.round(cy - sh / 2));
  if (o.quote) {
    const q = o.quote.sprite, qx = Math.min(w - q.width / 2, Math.max(q.width / 2, (o.quote.x / 100) * w)), qy = Math.min(h - q.height / 2, Math.max(q.height / 2, (o.quote.y / 100) * h));
    ctx.drawImage(q, Math.round(qx - q.width / 2), Math.round(qy - q.height / 2));
  }
  if (o.logo) {
    const d = Math.round(Math.min(w, h) * 0.16), m = Math.round(d * 0.28), x = m, y = h - d - m;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2 - 3, 0, Math.PI * 2); ctx.clip();
    const sc = Math.max(d / o.logo.width, d / o.logo.height); ctx.drawImage(o.logo, x + (d - o.logo.width * sc) / 2, y + (d - o.logo.height * sc) / 2, o.logo.width * sc, o.logo.height * sc); ctx.restore();
  }
}

/** Renders one guest's MP4 (name burned in, audio kept) plus a JPEG poster frame (used as the WhatsApp fallback image). Real time: takes about as long as the clip. */
export async function renderGuestVideo(o: RenderGuestVideoOptions): Promise<{ video: Blob; poster: Blob; seconds: number }> {
  const mime = pickMp4Mime();
  if (!mime) throw new Error("This browser can't create MP4 videos. Please use the latest Chrome (or Safari) to send video greetings.");
  const { w, h } = outputSize(o.info);
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const video = document.createElement("video");
  video.src = o.src; video.playsInline = true; video.preload = "auto"; video.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => { video.onloadeddata = () => res(); video.onerror = () => rej(new Error("The video couldn't be read.")); });

  // The clip's own audio goes to the recorder through WebAudio and is never connected to the speakers.
  const ac = new AudioContext();
  const dest = ac.createMediaStreamDestination();
  ac.createMediaElementSource(video).connect(dest);
  if (ac.state === "suspended") await ac.resume().catch(() => undefined);
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: videoBitrate(o.info.duration), audioBitsPerSecond: AUDIO_BPS });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const cleanup = () => { stream.getTracks().forEach((t) => t.stop()); void ac.close().catch(() => undefined); video.pause(); video.removeAttribute("src"); video.load(); };
  let posterBlob: Blob | null = null;
  const paint = () => { ctx.drawImage(video, 0, 0, w, h); paintOverlay(ctx, w, h, o); };
  try {
    paint();
    const done = new Promise<void>((res, rej) => {
      const guard = setTimeout(() => rej(new Error("Rendering the video took too long.")), (o.info.duration + 30) * 1000);
      video.onended = () => { clearTimeout(guard); res(); };
      video.onerror = () => { clearTimeout(guard); rej(new Error("The video stopped while rendering.")); };
      o.signal?.addEventListener("abort", () => { clearTimeout(guard); rej(new DOMException("Cancelled", "AbortError")); });
    });
    let running = true, posterTaken = false;
    const tick = () => {
      if (!running) return;
      paint();
      o.onProgress?.(Math.min(1, video.currentTime / o.info.duration));
      if (!posterTaken && video.currentTime >= Math.min(0.6, o.info.duration / 3)) { posterTaken = true; canvas.toBlob((b) => { posterBlob = b; }, "image/jpeg", 0.85); }
      if ("requestVideoFrameCallback" in video) (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
    };
    recorder.start(1000);
    await video.play();
    tick();
    await done;
    running = false; paint();
    if (!posterTaken) canvas.toBlob((b) => { posterBlob = b; }, "image/jpeg", 0.85);
    const stopped = new Promise<void>((res) => { recorder.onstop = () => res(); });
    recorder.stop();
    await stopped;
    await new Promise((r) => setTimeout(r, 50)); // let a pending poster toBlob settle
    const videoBlob = new Blob(chunks, { type: "video/mp4" });
    if (!posterBlob) throw new Error("Couldn't create the preview frame.");
    if (videoBlob.size > MAX_OUTPUT_BYTES) throw new Error(`The rendered video is ${(videoBlob.size / 1048576).toFixed(1)} MB, over WhatsApp's 16 MB limit. Please use a shorter or lower-resolution clip.`);
    return { video: videoBlob, poster: posterBlob, seconds: o.info.duration };
  } finally { if (recorder.state !== "inactive") { try { recorder.stop(); } catch { /* already stopped */ } } cleanup(); }
}

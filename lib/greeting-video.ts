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

export interface RenderGuestVideoOptions {
  /** Object URL of the uploaded clip. */
  src: string;
  info: VideoInfo;
  /** The guest-name overlay, already drawn at output scale (see sprite helpers in the studio). */
  sprite: HTMLCanvasElement;
  /** Overlay centre as 0-100 % of the frame. */
  x: number; y: number;
  /** Optional sender logo / photo, drawn as a circle in the bottom-left corner. */
  logo?: HTMLImageElement | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Draws the overlay layers on top of whatever frame is on the canvas. Shared by the render and the poster. */
export function paintOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, o: Pick<RenderGuestVideoOptions, "sprite" | "x" | "y" | "logo">) {
  const sw = o.sprite.width, sh = o.sprite.height;
  const cx = Math.min(w - sw / 2, Math.max(sw / 2, (o.x / 100) * w)), cy = Math.min(h - sh / 2, Math.max(sh / 2, (o.y / 100) * h));
  ctx.drawImage(o.sprite, Math.round(cx - sw / 2), Math.round(cy - sh / 2));
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

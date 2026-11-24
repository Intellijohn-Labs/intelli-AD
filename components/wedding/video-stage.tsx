"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { paintOverlay, renderQuoteSprite, type QuoteStyle, type VideoInfo } from "@/lib/greeting-video";
import { plainReveal, type AnimSprite, type TextAnim } from "@/lib/text-anim";
import { renderGreetingSprite } from "@/lib/wedding-render";
import type { WeddingDetails, WeddingTemplate } from "@/lib/wedding";
import { cn } from "@/lib/utils";

/** An overlay as drawn at 1080 px frame width; w1080 / h1080 are its size in that space (they size the draggable hit-box as a % of the stage). */
export interface SpritePreview { sp: AnimSprite; w1080: number; h1080: number }

/**
 * The greeting video on the studio canvas: the uploaded clip with play / pause and mute controls, and the guest's "Dear {Name}," drawn on top as an
 * overlay you can drag (a plain click selects it so its font, colour, size and box can be edited). The overlay is sized as a % of the stage width,
 * exactly how the rendered MP4 scales it, so what you see is where it lands on every frame.
 */
export function VideoStage({ src, info, sprite, x, y, logo, selected, onSelect, onMove, interactive = true, quote, qx = 50, qy = 92, quoteSelected, onSelectQuote, onMoveQuote, headerAnim = "none", footerAnim = "none", replayKey = 0 }: {
  src: string; info: VideoInfo; sprite: SpritePreview | null; x: number; y: number; logo?: string | null;
  selected?: boolean; onSelect?: () => void; onMove?: (x: number, y: number) => void; interactive?: boolean;
  /** Text animations (header = the guest line, footer = the quote) and a counter that restarts the clip from 0 s whenever it changes. */
  headerAnim?: TextAnim; footerAnim?: TextAnim; replayKey?: number;
  /** Footer quote overlay (draggable like the greeting). */
  quote?: SpritePreview | null; qx?: number; qy?: number; quoteSelected?: boolean; onSelectQuote?: () => void; onMoveQuote?: (x: number, y: number) => void;
}) {
  const vref = useRef<HTMLVideoElement>(null), stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true), [t, setT] = useState(0);
  useEffect(() => { const v = vref.current; if (v) v.muted = muted; }, [muted]);
  useEffect(() => { if (!replayKey) return; const v = vref.current; if (!v) return; v.currentTime = 0; void v.play().catch(() => undefined); }, [replayKey]);
  // The animated text is drawn on a canvas from the video's own clock, by the same function the MP4 renderer uses, so play, pause and scrubbing all match the export.
  const cv = useRef<HTMLCanvasElement>(null);
  const live = useRef({ sprite, quote, x, y, qx, qy, headerAnim, footerAnim });
  live.current = { sprite, quote, x, y, qx, qy, headerAnim, footerAnim };
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = cv.current, v = vref.current;
      if (c && v) {
        const ctx = c.getContext("2d")!, L = live.current;
        ctx.clearRect(0, 0, c.width, c.height);
        if (L.sprite) paintOverlay(ctx, c.width, c.height, { sprite: L.sprite.sp, x: L.x, y: L.y, quote: L.quote ? { sprite: L.quote.sp, x: L.qx, y: L.qy } : null, headerAnim: L.headerAnim, footerAnim: L.footerAnim, t: v.currentTime, skipLogo: true });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const portrait = info.height >= info.width;
  const at = (e: React.PointerEvent) => { const r = stage.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; };
  const qdrag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const clampPos = (px: number, py: number, sp: SpritePreview | null = sprite) => {
    const hw = sp ? (sp.w1080 / 1080) * 50 : 0; // half the overlay's width, as a % of the stage
    return { x: Math.min(100 - hw, Math.max(hw, px)), y: Math.min(96, Math.max(4, py)) };
  };
  return (
    <div className={cn("mx-auto w-full", portrait ? "max-w-[420px]" : "max-w-full")}>
      <div ref={stage} className="relative overflow-hidden rounded-lg border border-slate-200 bg-black select-none dark:border-slate-700" style={{ aspectRatio: `${info.width} / ${info.height}` }} onContextMenu={(e) => e.preventDefault()}>
        <video ref={vref} src={src} muted loop playsInline preload="auto" aria-label="Greeting video preview" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} className="pointer-events-none h-full w-full object-contain" />
        {logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" className="pointer-events-none absolute bottom-[3%] left-[3%] aspect-square w-[16%] rounded-full border-[3px] border-white object-cover shadow-lg" style={portrait ? undefined : { width: `${16 * (info.height / info.width)}%` }} />}
        <canvas ref={cv} width={1080} height={Math.max(2, Math.round((1080 * info.height) / info.width))} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        {sprite && (
          <div
            aria-label="Guest name overlay: drag to move, click to edit" role="button" tabIndex={0} data-video-overlay
            onPointerDown={interactive ? (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const p = at(e); drag.current = { dx: p.x - x, dy: p.y - y, sx: e.clientX, sy: e.clientY, moved: false }; } : undefined}
            onPointerMove={interactive ? (e) => { const d0 = drag.current; if (!d0) return; if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 4) return; d0.moved = true; const p = at(e), c = clampPos(p.x - d0.dx, p.y - d0.dy); onMove?.(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10); } : undefined}
            onPointerUp={interactive ? () => { if (drag.current && !drag.current.moved) onSelect?.(); drag.current = null; } : undefined}
            onKeyDown={interactive ? (e) => { if (!e.key.startsWith("Arrow")) { if (e.key === "Enter") onSelect?.(); return; } e.preventDefault(); const st = e.shiftKey ? 5 : 1; const c = clampPos(x + (e.key === "ArrowRight" ? st : e.key === "ArrowLeft" ? -st : 0), y + (e.key === "ArrowDown" ? st : e.key === "ArrowUp" ? -st : 0)); onMove?.(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10); } : undefined}
            className={cn("absolute max-w-none touch-none", interactive && "cursor-grab active:cursor-grabbing", selected ? "outline-2 outline-offset-2 outline-solid outline-[#D12014]" : interactive ? "hover:outline-1 hover:outline-offset-2 hover:outline-dashed hover:outline-[#D12014]" : "")}
            style={{ left: `${x}%`, top: `${y}%`, width: `${(sprite.w1080 / 1080) * 100}%`, aspectRatio: `${sprite.w1080} / ${sprite.h1080}`, transform: "translate(-50%, -50%)" }}
          />
        )}
        {quote && (
          <div
            aria-label="Footer greeting quote: drag to move, click to edit" role="button" tabIndex={0} data-video-quote
            onPointerDown={interactive ? (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const p = at(e); qdrag.current = { dx: p.x - qx, dy: p.y - qy, sx: e.clientX, sy: e.clientY, moved: false }; } : undefined}
            onPointerMove={interactive ? (e) => { const d0 = qdrag.current; if (!d0) return; if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 4) return; d0.moved = true; const p = at(e), c = clampPos(p.x - d0.dx, p.y - d0.dy, quote); onMoveQuote?.(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10); } : undefined}
            onPointerUp={interactive ? () => { if (qdrag.current && !qdrag.current.moved) onSelectQuote?.(); qdrag.current = null; } : undefined}
            onKeyDown={interactive ? (e) => { if (!e.key.startsWith("Arrow")) { if (e.key === "Enter") onSelectQuote?.(); return; } e.preventDefault(); const st = e.shiftKey ? 5 : 1; const c = clampPos(qx + (e.key === "ArrowRight" ? st : e.key === "ArrowLeft" ? -st : 0), qy + (e.key === "ArrowDown" ? st : e.key === "ArrowUp" ? -st : 0), quote); onMoveQuote?.(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10); } : undefined}
            className={cn("absolute max-w-none touch-none", interactive && "cursor-grab active:cursor-grabbing", quoteSelected ? "outline-2 outline-offset-2 outline-solid outline-[#D12014]" : interactive ? "hover:outline-1 hover:outline-offset-2 hover:outline-dashed hover:outline-[#D12014]" : "")}
            style={{ left: `${qx}%`, top: `${qy}%`, width: `${(quote.w1080 / 1080) * 100}%`, aspectRatio: `${quote.w1080} / ${quote.h1080}`, transform: "translate(-50%, -50%)" }}
          />
        )}
      </div>
      <div className="mt-2 flex items-center gap-2" role="group" aria-label="Video controls">
        <button type="button" onClick={() => { const v = vref.current; if (!v) return; if (v.paused) void v.play(); else v.pause(); }} aria-label={playing ? "Pause video" : "Play video"} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0B0D] text-white hover:bg-[#17181C] dark:bg-[#D12014] dark:hover:bg-[#E83E32]">{playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}</button>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute video" : "Mute video"} aria-pressed={!muted} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10">{muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}</button>
        <input type="range" min={0} max={info.duration} step={0.1} value={t} aria-label="Seek" onChange={(e) => { const v = vref.current; if (v) v.currentTime = Number(e.target.value); }} className="h-1.5 min-w-0 flex-1 accent-[#D12014]" />
        <span className="w-20 shrink-0 text-right text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">{Math.floor(t)}s / {Math.round(info.duration)}s</span>
      </div>
    </div>
  );
}

/** VideoStage plus its own overlay: renders the guest's greeting sprite with the card's current typography settings and keeps it fresh as they change. */
export function GreetingVideoStage({ tpl, rd, guest, quoteStyle, ...rest }: Omit<Parameters<typeof VideoStage>[0], "sprite" | "quote"> & { quoteStyle?: QuoteStyle; tpl: WeddingTemplate; rd: WeddingDetails; guest: { name: string; place: string } }) {
  const [sprite, setSprite] = useState<SpritePreview | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const sp = await renderGreetingSprite({ template: tpl, details: rd, guest, width: 1080 });
      if (live && sp) setSprite({ sp: { canvas: sp.canvas, reveal: plainReveal(sp.text, sp.canvas.width, sp.canvas.height) }, w1080: sp.w1080, h1080: sp.h1080 });
    }, 60);
    return () => { live = false; clearTimeout(t); };
  }, [tpl, rd, guest]);
  const [quote, setQuote] = useState<SpritePreview | null>(null);
  const qs = quoteStyle;
  useEffect(() => {
    let live = true;
    if (!qs || !qs.text.trim()) { setQuote(null); return; }
    const t = setTimeout(async () => {
      const sp = await renderQuoteSprite(qs, 1080);
      if (live) setQuote(sp ? { sp, w1080: sp.w1080, h1080: sp.h1080 } : null);
    }, 60);
    return () => { live = false; clearTimeout(t); };
  }, [qs?.text, qs?.scale, qs?.color, qs?.font, qs?.backdrop]); // eslint-disable-line react-hooks/exhaustive-deps
  return <VideoStage {...rest} sprite={sprite} quote={quote} />;
}

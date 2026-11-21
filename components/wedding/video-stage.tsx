"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { VideoInfo } from "@/lib/greeting-video";
import { renderGreetingSprite } from "@/lib/wedding-render";
import type { WeddingDetails, WeddingTemplate } from "@/lib/wedding";
import { cn } from "@/lib/utils";

export interface SpritePreview { url: string; w1080: number }

/**
 * The greeting video on the studio canvas: the uploaded clip with play / pause and mute controls, and the guest's "Dear {Name}," drawn on top as an
 * overlay you can drag (a plain click selects it so its font, colour, size and box can be edited). The overlay is sized as a % of the stage width,
 * exactly how the rendered MP4 scales it, so what you see is where it lands on every frame.
 */
export function VideoStage({ src, info, sprite, x, y, logo, selected, onSelect, onMove, interactive = true }: {
  src: string; info: VideoInfo; sprite: SpritePreview | null; x: number; y: number; logo?: string | null;
  selected?: boolean; onSelect?: () => void; onMove?: (x: number, y: number) => void; interactive?: boolean;
}) {
  const vref = useRef<HTMLVideoElement>(null), stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true), [t, setT] = useState(0);
  useEffect(() => { const v = vref.current; if (v) v.muted = muted; }, [muted]);
  const portrait = info.height >= info.width;
  const at = (e: React.PointerEvent) => { const r = stage.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; };
  const clampPos = (px: number, py: number) => {
    const hw = sprite ? (sprite.w1080 / 1080) * 50 : 0; // half the overlay's width, as a % of the stage
    return { x: Math.min(100 - hw, Math.max(hw, px)), y: Math.min(96, Math.max(4, py)) };
  };
  return (
    <div className={cn("mx-auto w-full", portrait ? "max-w-[420px]" : "max-w-full")}>
      <div ref={stage} className="relative overflow-hidden rounded-lg border border-slate-200 bg-black select-none dark:border-slate-700" style={{ aspectRatio: `${info.width} / ${info.height}` }} onContextMenu={(e) => e.preventDefault()}>
        <video ref={vref} src={src} muted loop playsInline preload="auto" aria-label="Greeting video preview" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} className="pointer-events-none h-full w-full object-contain" />
        {logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" className="pointer-events-none absolute bottom-[3%] left-[3%] aspect-square w-[16%] rounded-full border-[3px] border-white object-cover shadow-lg" style={portrait ? undefined : { width: `${16 * (info.height / info.width)}%` }} />}
        {sprite && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={sprite.url} alt="Guest name overlay: drag to move, click to edit" draggable={false} role="button" tabIndex={0} data-video-overlay
            onPointerDown={interactive ? (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const p = at(e); drag.current = { dx: p.x - x, dy: p.y - y, sx: e.clientX, sy: e.clientY, moved: false }; } : undefined}
            onPointerMove={interactive ? (e) => { const d0 = drag.current; if (!d0) return; if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 4) return; d0.moved = true; const p = at(e), c = clampPos(p.x - d0.dx, p.y - d0.dy); onMove?.(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10); } : undefined}
            onPointerUp={interactive ? () => { if (drag.current && !drag.current.moved) onSelect?.(); drag.current = null; } : undefined}
            onKeyDown={interactive ? (e) => { if (!e.key.startsWith("Arrow")) { if (e.key === "Enter") onSelect?.(); return; } e.preventDefault(); const st = e.shiftKey ? 5 : 1; const c = clampPos(x + (e.key === "ArrowRight" ? st : e.key === "ArrowLeft" ? -st : 0), y + (e.key === "ArrowDown" ? st : e.key === "ArrowUp" ? -st : 0)); onMove?.(Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10); } : undefined}
            className={cn("absolute max-w-none touch-none", interactive && "cursor-grab active:cursor-grabbing", selected ? "outline-2 outline-offset-2 outline-solid outline-[#D12014]" : interactive ? "hover:outline-1 hover:outline-offset-2 hover:outline-dashed hover:outline-[#D12014]" : "")}
            style={{ left: `${x}%`, top: `${y}%`, width: `${(sprite.w1080 / 1080) * 100}%`, transform: "translate(-50%, -50%)" }}
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
export function GreetingVideoStage({ tpl, rd, guest, ...rest }: Omit<Parameters<typeof VideoStage>[0], "sprite"> & { tpl: WeddingTemplate; rd: WeddingDetails; guest: { name: string; place: string } }) {
  const [sprite, setSprite] = useState<SpritePreview | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const sp = await renderGreetingSprite({ template: tpl, details: rd, guest, width: 1080 });
      if (live && sp) setSprite({ url: sp.canvas.toDataURL("image/png"), w1080: sp.w1080 });
    }, 60);
    return () => { live = false; clearTimeout(t); };
  }, [tpl, rd, guest]);
  return <VideoStage {...rest} sprite={sprite} />;
}

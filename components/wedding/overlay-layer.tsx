"use client";

import { useEffect, useRef, useState } from "react";
import type { OverlayText } from "@/lib/wedding";
import { renderOverlayTextSprite } from "@/lib/wedding-render";
import type { TextSprite } from "@/lib/text-sprite";
import { cn } from "@/lib/utils";

/** A draggable thing on the preview: centre and size as % of the frame. */
export interface HitItem { id: string; x: number; y: number; w: number; h: number; label: string }

/**
 * Transparent hit-boxes over a live preview (image card or video stage) for the logo and the "+ Add Text Box" boxes: drag with mouse / touch / pen, nudge with the
 * arrow keys (Shift = bigger steps); a press that barely moves just selects. Must sit inside the preview's `relative` frame. Nothing here is drawn into exports.
 */
export function OverlayHitLayer({ items, selectedId, onMove, onSelect, interactive = true }: { items: HitItem[]; selectedId: string | null; onMove: (id: string, x: number, y: number) => void; onSelect: (id: string) => void; interactive?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const at = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; };
  const put = (it: HitItem, x: number, y: number) => onMove(it.id, Math.round(Math.min(100 - it.w / 2, Math.max(it.w / 2, x)) * 10) / 10, Math.round(Math.min(100 - it.h / 2, Math.max(it.h / 2, y)) * 10) / 10);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-[5]">
      {items.map((it) => (
        <div
          key={it.id} role="button" tabIndex={interactive ? 0 : -1} aria-label={`${it.label}: drag to move, click to edit`} data-overlay-item={it.id}
          onPointerDown={interactive ? (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); const p = at(e); drag.current = { id: it.id, dx: p.x - it.x, dy: p.y - it.y, sx: e.clientX, sy: e.clientY, moved: false }; } : undefined}
          onPointerMove={interactive ? (e) => { const d0 = drag.current; if (!d0 || d0.id !== it.id) return; if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 4) return; d0.moved = true; const p = at(e); put(it, p.x - d0.dx, p.y - d0.dy); } : undefined}
          onPointerUp={interactive ? () => { if (drag.current && !drag.current.moved) onSelect(it.id); drag.current = null; } : undefined}
          onPointerCancel={interactive ? () => { drag.current = null; } : undefined}
          onKeyDown={interactive ? (e) => { if (!e.key.startsWith("Arrow")) { if (e.key === "Enter") onSelect(it.id); return; } e.preventDefault(); const st = e.shiftKey ? 5 : 1; put(it, it.x + (e.key === "ArrowRight" ? st : e.key === "ArrowLeft" ? -st : 0), it.y + (e.key === "ArrowDown" ? st : e.key === "ArrowUp" ? -st : 0)); } : undefined}
          className={cn("pointer-events-auto absolute touch-none", interactive && "cursor-grab active:cursor-grabbing", selectedId === it.id ? "outline-2 outline-offset-2 outline-solid outline-[#D12014]" : interactive ? "hover:outline-1 hover:outline-offset-2 hover:outline-dashed hover:outline-[#D12014]" : "pointer-events-none")}
          style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%`, height: `${it.h}%`, transform: "translate(-50%, -50%)" }}
        />
      ))}
    </div>
  );
}

export type TextSpriteEntry = { sp: TextSprite; w1080: number; h1080: number };

/** Builds each text box's sprite at 1080 wide (for hit-box sizes and the video preview); rebuilt when a box's text / look or the guest changes. */
export function useTextSprites(boxes: OverlayText[], fontStyle: string, guestName: string): Record<string, TextSpriteEntry> {
  const [out, setOut] = useState<Record<string, TextSpriteEntry>>({});
  const key = JSON.stringify([boxes.map((b) => [b.id, b.text, b.size, b.font, b.color, b.pill, b.pillColor]), fontStyle, guestName]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const entries = await Promise.all(boxes.map(async (b) => { const sp = await renderOverlayTextSprite(b, { fontStyle: fontStyle as never }, 1080, guestName); return sp ? ([b.id, { sp, w1080: sp.w1080, h1080: sp.h1080 }] as const) : null; }));
      if (live) setOut(Object.fromEntries(entries.filter((x): x is NonNullable<typeof x> => !!x)));
    }, 60);
    return () => { live = false; clearTimeout(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return out;
}

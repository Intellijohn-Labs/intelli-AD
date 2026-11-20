"use client";

import { useRef, useState } from "react";
import type { BlockId, WeddingDetails } from "@/lib/wedding";
import { blockOfZone, type CardZone, type GroupBox } from "@/lib/wedding-render";

const LABEL: Record<CardZone["id"], string> = {
  guest: "Click to edit the greeting · drag to move",
  blessing: "Click to edit blessing", title: "Click to edit event title", names: "Click to edit names", parents: "Click to edit family line",
  message: "Click to edit message", datetime: "Click to edit date & time", venue: "Click to edit venue", verse: "Click to edit closing verse", photo: "Click to upload photo",
};
const CARD_W = 1080, CARD_H = 1500;
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/**
 * Transparent hit-zones over the live preview image. Nothing is drawn until a section is hovered (dashed outline) or selected (solid ring);
 * a click selects the section (the studio then shows its toolbar), a drag moves it, arrow keys nudge it. DOM only: never part of the PNG.
 */
export function CardEditOverlay({ zones, groups, details, selected, onSelect, onPickPhoto, onRemovePhoto, onMoveBadge, onMoveBlock }: {
  zones: CardZone[]; groups: GroupBox[]; details: WeddingDetails;
  selected: CardZone["id"] | null; onSelect: (id: CardZone["id"]) => void;
  onPickPhoto: (index: number) => void; onRemovePhoto: (index: number) => void;
  onMoveBadge: (x: number, y: number) => void; onMoveBlock: (key: Exclude<BlockId, "guest">, x: number, y: number) => void;
}) {
  // Every text section can be dragged (mouse / touch / pen) or nudged with the arrow keys; a press that barely moves is a click and selects
  // it instead. Dotted guides show while moving.
  const frame = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: BlockId; dx: number; dy: number; sx: number; sy: number; moved: boolean; w: number; h: number } | null>(null);
  const suppressClick = useRef(false);
  const [guide, setGuide] = useState<{ x: number; y: number } | null>(null);

  /** Where a movable thing sits now (card px): its saved position if it has one, else the box it was last drawn in. */
  const boxOf = (key: BlockId, z: CardZone) => {
    const g = key === "guest" ? null : groups.find((x) => x.key === key);
    const saved = key === "guest" ? (details.guestBadgeX != null && details.guestBadgeY != null ? { x: details.guestBadgeX, y: details.guestBadgeY } : null) : details.blockPos?.[key] ?? null;
    const w = g?.w ?? z.w, h = g?.h ?? z.h;
    return { w, h, cx: saved ? (saved.x / 100) * CARD_W : (g ? g.x + g.w / 2 : z.x + z.w / 2), cy: saved ? (saved.y / 100) * CARD_H : (g ? g.y + g.h / 2 : z.y + z.h / 2) };
  };
  const moveTo = (key: BlockId, w: number, h: number, cx: number, cy: number) => {
    const x = Math.min(CARD_W - w / 2, Math.max(w / 2, cx)), y = Math.min(CARD_H - h / 2, Math.max(h / 2, cy));
    const px = Math.round((x / CARD_W) * 1000) / 10, py = Math.round((y / CARD_H) * 1000) / 10;
    setGuide({ x, y });
    if (key === "guest") onMoveBadge(px, py); else onMoveBlock(key, px, py);
  };
  const toCard = (e: React.PointerEvent) => { const r = frame.current!.getBoundingClientRect(); return { px: ((e.clientX - r.left) / r.width) * CARD_W, py: ((e.clientY - r.top) / r.height) * CARD_H }; };

  return (
    <>
      <div ref={frame} className="pointer-events-none absolute inset-0" aria-hidden="true">
        {guide && (
          <>
            <div className={`absolute inset-y-0 border-l border-dotted ${Math.abs(guide.x - CARD_W / 2) < 8 ? "border-[#D12014]" : "border-slate-500/70"}`} style={{ left: pct(guide.x, CARD_W) }} />
            <div className={`absolute inset-x-0 border-t border-dotted ${Math.abs(guide.y - CARD_H / 2) < 8 ? "border-[#D12014]" : "border-slate-500/70"}`} style={{ top: pct(guide.y, CARD_H) }} />
            <div className="absolute inset-y-0 left-1/2 border-l border-dotted border-[#D12014]/30" /><div className="absolute inset-x-0 top-1/2 border-t border-dotted border-[#D12014]/30" />
          </>
        )}
      </div>
      {zones.map((z, i) => {
        const mk = blockOfZone(z.id), on = selected === z.id;
        return (
          <button
            key={`${z.id}-${i}`}
            type="button"
            data-card-zone
            aria-label={LABEL[z.id]}
            aria-pressed={mk ? on : undefined}
            onPointerDown={mk ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const b = boxOf(mk, z), { px, py } = toCard(e);
              dragRef.current = { key: mk, dx: px - b.cx, dy: py - b.cy, sx: e.clientX, sy: e.clientY, moved: false, w: b.w, h: b.h };
            } : undefined}
            onPointerMove={mk ? (e) => {
              const d0 = dragRef.current; if (!d0) return;
              if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 5) return; // a quick click selects, a real drag moves
              d0.moved = true;
              const { px, py } = toCard(e); moveTo(d0.key, d0.w, d0.h, px - d0.dx, py - d0.dy);
            } : undefined}
            onPointerUp={mk ? () => { if (dragRef.current?.moved) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0); } dragRef.current = null; setGuide(null); } : undefined}
            onPointerCancel={mk ? () => { dragRef.current = null; setGuide(null); } : undefined}
            onKeyDown={mk ? (e) => {
              const k = e.key; if (!k.startsWith("Arrow")) return;
              e.preventDefault(); const st = e.shiftKey ? 50 : 10, b = boxOf(mk, z);
              moveTo(mk, b.w, b.h, b.cx + (k === "ArrowRight" ? st : k === "ArrowLeft" ? -st : 0), b.cy + (k === "ArrowDown" ? st : k === "ArrowUp" ? -st : 0));
              window.setTimeout(() => setGuide(null), 400);
            } : undefined}
            onClick={(e) => {
              if (suppressClick.current) return;
              if (z.id === "photo") { const r = e.currentTarget.getBoundingClientRect(); onPickPhoto(z.dual && e.clientX - r.left > r.width / 2 ? 1 : 0); return; }
              onSelect(z.id);
            }}
            className={`group absolute ${mk ? "touch-none" : ""} cursor-pointer rounded-sm outline-offset-2 transition ${on ? "outline-2 outline-solid outline-[#D12014] bg-[#D12014]/[0.06]" : "outline-1 outline-transparent hover:outline-dashed hover:outline-[#D12014]"} focus-visible:outline-dashed focus-visible:outline-[#D12014]`}
            style={{ left: pct(z.x, CARD_W), top: pct(z.y, CARD_H), width: pct(z.w, CARD_W), height: pct(z.h, CARD_H) }}
          >
            <span className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#D12014] px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{LABEL[z.id]}</span>
          </button>
        );
      })}
      {/* ✕ pills over each uploaded photo slot: DOM only, never part of the rendered / exported PNG. */}
      {zones.filter((z) => z.id === "photo").flatMap((z) => (z.dual ? [0, 1] : [0]).filter((i) => details.photos[i]).map((i) => {
        // Zones span the content width, the photo(s) sit centred: one pill centred, or one either side of the centre line.
        const tx = z.dual ? (i === 0 ? "-100%" : "0%") : "-50%", zc = z.x + z.w / 2, left = z.dual ? zc + (i === 0 ? -8 : 8) : zc;
        return (
          <button key={`rm-${i}`} type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemovePhoto(i)} style={{ left: pct(left, CARD_W), top: pct(z.y + 8, CARD_H), transform: `translateX(${tx})` }} className="absolute z-10 inline-flex items-center gap-0.5 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold text-white shadow hover:bg-[#D12014] focus-visible:ring-2 focus-visible:ring-white"><span aria-hidden="true">✕</span> Remove</button>
        );
      }))}
    </>
  );
}

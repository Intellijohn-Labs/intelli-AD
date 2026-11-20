"use client";

import { useEffect, useRef, useState } from "react";
import { EVENTS, greetingTemplate, type BlockKey, type EventConfig, type EventType, type WeddingDetails } from "@/lib/wedding";
import type { CardZone, GroupBox } from "@/lib/wedding-render";

const LABEL: Record<CardZone["id"], string> = {
  guest: "Click to edit the greeting · drag to move",
  blessing: "Click to edit blessing", title: "Click to edit event title", names: "Click to edit names", parents: "Click to edit family line",
  message: "Click to edit message", datetime: "Click to edit date & time", venue: "Click to edit venue", verse: "Click to edit closing verse", photo: "Click to upload photo",
};
const CARD_W = 1080, CARD_H = 1500;
const fieldCls = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#D12014] focus:ring-1 focus:ring-[#D12014] dark:border-slate-600 dark:bg-[#0A0B0D] dark:text-slate-100";

/**
 * Transparent hit-zones over the live preview image. Clicking one opens a small inline editor bound to the same
 * details state as the Details tab, so edits re-render the card and persist. Only used by the studio preview.
 */
export function CardEditOverlay({ zones, groups, details, cfg, onChange, onPickPhoto, onRemovePhoto, onMoveBadge, onMoveBlock }: { zones: CardZone[]; groups: GroupBox[]; onMoveBlock: (key: BlockKey, x: number, y: number) => void; details: WeddingDetails; cfg: EventConfig; onChange: (p: Partial<WeddingDetails>) => void; onRemovePhoto: (index: number) => void; onMoveBadge: (x: number, y: number) => void; onPickPhoto: (index: number) => void }) {
  const [open, setOpen] = useState<CardZone["id"] | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const zone = zones.find((z) => z.id === open) ?? null;

  // Every text group (and the greeting badge) can be dragged (mouse / touch / pen) or nudged with the arrow keys; a press that
  // barely moves is a click and opens the inline editor instead. Dotted guides show while moving.
  const frame = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: BlockKey | "guest"; dx: number; dy: number; sx: number; sy: number; moved: boolean; w: number; h: number } | null>(null);
  const suppressClick = useRef(false);
  const [guide, setGuide] = useState<{ x: number; y: number } | null>(null);
  const keyOf = (id: CardZone["id"]): BlockKey | "guest" | null => (id === "guest" ? "guest" : id === "blessing" || id === "title" ? "header" : id === "names" ? "names" : id === "parents" || id === "message" ? "body" : id === "datetime" ? "dateTime" : id === "venue" || id === "verse" ? "venue" : null);
  /** Where a movable thing sits now (card px): its saved position if it has one, else the box it was last drawn in. */
  const boxOf = (key: BlockKey | "guest", z: CardZone) => {
    const g = key === "guest" ? null : groups.find((x) => x.key === key);
    const saved = key === "guest" ? (details.guestBadgeX != null && details.guestBadgeY != null ? { x: details.guestBadgeX, y: details.guestBadgeY } : null) : details.blockPos?.[key] ?? null;
    const w = g?.w ?? z.w, h = g?.h ?? z.h;
    return { w, h, cx: saved ? (saved.x / 100) * CARD_W : (g ? g.x + g.w / 2 : z.x + z.w / 2), cy: saved ? (saved.y / 100) * CARD_H : (g ? g.y + g.h / 2 : z.y + z.h / 2) };
  };
  const moveTo = (key: BlockKey | "guest", w: number, h: number, cx: number, cy: number) => {
    const x = Math.min(CARD_W - w / 2, Math.max(w / 2, cx)), y = Math.min(CARD_H - h / 2, Math.max(h / 2, cy));
    const px = Math.round((x / CARD_W) * 1000) / 10, py = Math.round((y / CARD_H) * 1000) / 10;
    setGuide({ x, y });
    if (key === "guest") onMoveBadge(px, py); else onMoveBlock(key, px, py);
  };
  const toCard = (e: React.PointerEvent) => { const r = frame.current!.getBoundingClientRect(); return { px: ((e.clientX - r.left) / r.width) * CARD_W, py: ((e.clientY - r.top) / r.height) * CARD_H }; };

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (popRef.current?.contains(t) || t.closest("[data-card-zone]")) return;
      setOpen(null);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);
  useEffect(() => { popRef.current?.querySelector<HTMLElement>("input,textarea,select")?.focus(); }, [open]);

  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(null); }
    else if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "SELECT") { e.preventDefault(); setOpen(null); }
  };
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const below = zone ? (zone.y + zone.h) / CARD_H < 0.62 : true;

  const input = (label: string, value: string, k: keyof WeddingDetails, ph = "", type = "text") => (
    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}
      <input type={type} value={value} placeholder={ph} onChange={(e) => onChange({ [k]: e.target.value } as Partial<WeddingDetails>)} className={`mt-0.5 ${fieldCls}`} />
    </label>
  );
  const area = (label: string, value: string, k: keyof WeddingDetails, ph = "") => (
    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}
      <textarea rows={3} value={value} placeholder={ph} onChange={(e) => onChange({ [k]: e.target.value } as Partial<WeddingDetails>)} className={`mt-0.5 resize-none ${fieldCls}`} />
    </label>
  );

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
      {zones.map((z, i) => { const mk = keyOf(z.id); return (
        <button
          key={`${z.id}-${i}`}
          type="button"
          data-card-zone
          aria-label={LABEL[z.id]}
          onPointerDown={mk ? (e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const b = boxOf(mk, z), { px, py } = toCard(e);
            dragRef.current = { key: mk, dx: px - b.cx, dy: py - b.cy, sx: e.clientX, sy: e.clientY, moved: false, w: b.w, h: b.h };
          } : undefined}
          onPointerMove={mk ? (e) => {
            const d0 = dragRef.current; if (!d0) return;
            if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 5) return; // a quick click edits, a real drag moves
            d0.moved = true; setOpen(null);
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
            setOpen(z.id);
          }}
          className={`group absolute ${mk ? "touch-none" : ""} cursor-pointer rounded-sm outline-1 outline-offset-1 outline-transparent transition hover:outline-dashed hover:outline-[#D12014] focus-visible:outline-dashed focus-visible:outline-[#D12014] ${open === z.id ? "outline-dashed outline-[#D12014]" : ""}`}
          style={{ left: pct(z.x, CARD_W), top: pct(z.y, CARD_H), width: pct(z.w, CARD_W), height: pct(z.h, CARD_H) }}
        >
          <span className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#D12014] px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{LABEL[z.id]}</span>
        </button>
      ); })}
      {/* ✕ pills over each uploaded photo slot: DOM only, never part of the rendered / exported PNG. */}
      {zones.filter((z) => z.id === "photo").flatMap((z) => (z.dual ? [0, 1] : [0]).filter((i) => details.photos[i]).map((i) => {
        // Zones span the content width, the photo(s) sit centred: one pill centred, or one either side of the centre line.
        const tx = z.dual ? (i === 0 ? "-100%" : "0%") : "-50%", zc = z.x + z.w / 2, left = z.dual ? zc + (i === 0 ? -8 : 8) : zc;
        return (
          <button key={`rm-${i}`} type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemovePhoto(i)} style={{ left: pct(left, CARD_W), top: pct(z.y + 8, CARD_H), transform: `translateX(${tx})` }} className="absolute z-10 inline-flex items-center gap-0.5 rounded-full bg-black/75 px-2 py-1 text-[11px] font-bold text-white shadow hover:bg-[#D12014] focus-visible:ring-2 focus-visible:ring-white"><span aria-hidden="true">✕</span> Remove</button>
        );
      }))}
      {zone && (
        <div
          ref={popRef}
          onKeyDown={key}
          role="dialog"
          aria-label={LABEL[zone.id]}
          className="absolute z-20 space-y-2 rounded-lg border border-slate-300 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-[#131416]"
          style={{ left: "4%", right: "4%", ...(below ? { top: `calc(${pct(zone.y + zone.h, CARD_H)} + 6px)` } : { bottom: `calc(${100 - (zone.y / CARD_H) * 100}% + 6px)` }) }}
        >
          {zone.id === "guest" && (
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Greeting wording: {"{Name}"} and {"{Place}"} are filled in for every guest
              <input type="text" value={greetingTemplate(details)} maxLength={120} placeholder="Dear {Name} & Family" onChange={(e) => onChange({ guestGreetingFormat: "custom", guestGreetingTemplate: e.target.value })} className={`mt-0.5 ${fieldCls}`} />
            </label>
          )}
          {zone.id === "blessing" && area("Blessing / top verse", details.blessing, "blessing", "Leave empty for the template's default blessing")}
          {zone.id === "title" && (
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Event type
              <select value={details.eventType} onChange={(e) => onChange({ eventType: e.target.value as EventType })} className={`mt-0.5 ${fieldCls}`}>
                {EVENTS.map((t) => <option key={t.id} value={t.id}>{t.en} · {t.ml}</option>)}
              </select>
            </label>
          )}
          {zone.id === "names" && <div className={cfg.useName2 ? "grid grid-cols-2 gap-2" : ""}>{input(cfg.labels.name1, details.groom, "groom", cfg.sample.groom)}{cfg.useName2 && input(cfg.labels.name2, details.bride, "bride", cfg.sample.bride || "")}</div>}
          {zone.id === "parents" && <div className="space-y-2">{input(cfg.labels.host1, details.groomParents, "groomParents")}{cfg.useHost2 && input(cfg.labels.host2, details.brideParents, "brideParents")}</div>}
          {zone.id === "message" && area("Invitation message", details.message, "message", "Leave empty for the default wording")}
          {zone.id === "datetime" && <div className="grid grid-cols-2 gap-2">{input("Date", details.date, "date", "", "date")}{input(cfg.labels.time, details.time, "time", cfg.sample.time)}</div>}
          {zone.id === "venue" && input(cfg.labels.venue, details.venue, "venue", "Venue & place")}
          {zone.id === "verse" && area("Closing verse / footnote", details.verse, "verse")}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Enter or Esc to finish · changes save automatically</p>
        </div>
      )}
    </>
  );
}

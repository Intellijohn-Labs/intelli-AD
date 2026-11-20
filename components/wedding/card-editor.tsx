"use client";

import { useEffect, useRef, useState } from "react";
import { EVENTS, type EventConfig, type EventType, type WeddingDetails } from "@/lib/wedding";
import type { CardZone } from "@/lib/wedding-render";

const LABEL: Record<CardZone["id"], string> = {
  guest: "Drag to move the guest greeting",
  blessing: "Click to edit blessing", title: "Click to edit event title", names: "Click to edit names", parents: "Click to edit family line",
  message: "Click to edit message", datetime: "Click to edit date & time", venue: "Click to edit venue", verse: "Click to edit closing verse", photo: "Click to upload photo",
};
const CARD_W = 1080, CARD_H = 1500;
const fieldCls = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#D12014] focus:ring-1 focus:ring-[#D12014] dark:border-slate-600 dark:bg-[#0A0B0D] dark:text-slate-100";

/**
 * Transparent hit-zones over the live preview image. Clicking one opens a small inline editor bound to the same
 * details state as the Details tab, so edits re-render the card and persist. Only used by the studio preview.
 */
export function CardEditOverlay({ zones, details, cfg, onChange, onPickPhoto, onRemovePhoto, onMoveBadge }: { zones: CardZone[]; details: WeddingDetails; cfg: EventConfig; onChange: (p: Partial<WeddingDetails>) => void; onRemovePhoto: (index: number) => void; onMoveBadge: (x: number, y: number) => void; onPickPhoto: (index: number) => void }) {
  const [open, setOpen] = useState<CardZone["id"] | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const zone = zones.find((z) => z.id === open) ?? null;

  // Draggable guest-greeting badge: pointer (mouse / touch / pen) drag inside the card, or arrow keys; dotted guides show while moving.
  const frame = useRef<HTMLDivElement>(null);
  const [grab, setGrab] = useState<{ dx: number; dy: number } | null>(null);
  const guest = zones.find((z) => z.id === "guest") ?? null;
  const positioned = details.guestBadgeX != null && details.guestBadgeY != null;
  const gcx = guest ? (positioned ? (details.guestBadgeX! / 100) * CARD_W : guest.x + guest.w / 2) : 0;
  const gcy = guest ? (positioned ? (details.guestBadgeY! / 100) * CARD_H : guest.y + guest.h / 2) : 0;
  const place = (cx: number, cy: number) => {
    if (!guest) return;
    const x = Math.min(CARD_W - guest.w / 2, Math.max(guest.w / 2, cx)), y = Math.min(CARD_H - guest.h / 2, Math.max(guest.h / 2, cy));
    onMoveBadge(Math.round((x / CARD_W) * 1000) / 10, Math.round((y / CARD_H) * 1000) / 10);
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
      <div ref={frame} className="pointer-events-none absolute inset-0" aria-hidden={!guest}>
        {grab && guest && (
          <>
            <div className={`absolute inset-y-0 border-l border-dotted ${Math.abs(gcx - CARD_W / 2) < 8 ? "border-[#D12014]" : "border-slate-500/70"}`} style={{ left: pct(gcx, CARD_W) }} />
            <div className={`absolute inset-x-0 border-t border-dotted ${Math.abs(gcy - CARD_H / 2) < 8 ? "border-[#D12014]" : "border-slate-500/70"}`} style={{ top: pct(gcy, CARD_H) }} />
            <div className="absolute inset-y-0 left-1/2 border-l border-dotted border-[#D12014]/30" /><div className="absolute inset-x-0 top-1/2 border-t border-dotted border-[#D12014]/30" />
          </>
        )}
        {guest && (
          <button type="button" aria-label="Move the guest greeting: drag, or use the arrow keys" title="Drag to move" data-card-zone
            onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const { px, py } = toCard(e); setGrab({ dx: px - gcx, dy: py - gcy }); }}
            onPointerMove={(e) => { if (!grab) return; const { px, py } = toCard(e); place(px - grab.dx, py - grab.dy); }}
            onPointerUp={() => setGrab(null)} onPointerCancel={() => setGrab(null)}
            onKeyDown={(e) => { const st = e.shiftKey ? 50 : 10, k = e.key; if (!k.startsWith("Arrow")) return; e.preventDefault(); place(gcx + (k === "ArrowRight" ? st : k === "ArrowLeft" ? -st : 0), gcy + (k === "ArrowDown" ? st : k === "ArrowUp" ? -st : 0)); }}
            className={`pointer-events-auto absolute touch-none rounded-md outline-2 outline-dashed outline-offset-2 ${grab ? "cursor-grabbing outline-[#D12014]" : "cursor-grab outline-[#D12014]/55 hover:outline-[#D12014]"} focus-visible:outline-[#D12014]`}
            style={{ left: pct(gcx - guest.w / 2, CARD_W), top: pct(gcy - guest.h / 2, CARD_H), width: pct(guest.w, CARD_W), height: pct(guest.h, CARD_H) }} />
        )}
      </div>
      {zones.filter((z) => z.id !== "guest").map((z, i) => (
        <button
          key={`${z.id}-${i}`}
          type="button"
          data-card-zone
          aria-label={LABEL[z.id]}
          onClick={(e) => {
            if (z.id === "photo") { const r = e.currentTarget.getBoundingClientRect(); onPickPhoto(z.dual && e.clientX - r.left > r.width / 2 ? 1 : 0); return; }
            setOpen(z.id);
          }}
          className={`group absolute cursor-pointer rounded-sm outline-1 outline-offset-1 outline-transparent transition hover:outline-dashed hover:outline-[#D12014] focus-visible:outline-dashed focus-visible:outline-[#D12014] ${open === z.id ? "outline-dashed outline-[#D12014]" : ""}`}
          style={{ left: pct(z.x, CARD_W), top: pct(z.y, CARD_H), width: pct(z.w, CARD_W), height: pct(z.h, CARD_H) }}
        >
          <span className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#D12014] px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{LABEL[z.id]}</span>
        </button>
      ))}
      {/* ✕ pills over each uploaded photo slot: DOM only, never part of the rendered / exported PNG. */}
      {zones.filter((z) => z.id === "photo").flatMap((z) => (z.dual ? [0, 1] : [0]).filter((i) => details.photos[i]).map((i) => {
        // Zones span the content width, the photo(s) sit centred: one pill centred, or one either side of the centre line.
        const tx = z.dual ? (i === 0 ? "-100%" : "0%") : "-50%", left = z.dual ? CARD_W / 2 + (i === 0 ? -8 : 8) : CARD_W / 2;
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

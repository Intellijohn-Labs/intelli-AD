"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_TYPES, type EventType, type WeddingDetails } from "@/lib/wedding";
import type { CardZone } from "@/lib/wedding-render";

const LABEL: Record<CardZone["id"], string> = {
  blessing: "Click to edit blessing", title: "Click to edit event title", names: "Click to edit names", parents: "Click to edit family line",
  message: "Click to edit message", datetime: "Click to edit date & time", venue: "Click to edit venue", verse: "Click to edit closing verse", photo: "Click to upload photo",
};
const CARD_W = 1080, CARD_H = 1500;
const fieldCls = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#D12014] focus:ring-1 focus:ring-[#D12014] dark:border-slate-600 dark:bg-[#0A0B0D] dark:text-slate-100";

/**
 * Transparent hit-zones over the live preview image. Clicking one opens a small inline editor bound to the same
 * details state as the Details tab, so edits re-render the card and persist. Only used by the studio preview.
 */
export function CardEditOverlay({ zones, details, onChange, onPickPhoto }: { zones: CardZone[]; details: WeddingDetails; onChange: (p: Partial<WeddingDetails>) => void; onPickPhoto: (index: number) => void }) {
  const [open, setOpen] = useState<CardZone["id"] | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const zone = zones.find((z) => z.id === open) ?? null;

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
      {zones.map((z, i) => (
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
                {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.en} · {t.ml}</option>)}
              </select>
            </label>
          )}
          {zone.id === "names" && <div className="grid grid-cols-2 gap-2">{input("Groom", details.groom, "groom", "Groom")}{input("Bride", details.bride, "bride", "Bride")}</div>}
          {zone.id === "parents" && <div className="space-y-2">{input("Groom's parents", details.groomParents, "groomParents")}{input("Bride's parents", details.brideParents, "brideParents")}</div>}
          {zone.id === "message" && area("Invitation message", details.message, "message", "Leave empty for the default wording")}
          {zone.id === "datetime" && <div className="grid grid-cols-2 gap-2">{input("Date", details.date, "date", "", "date")}{input("Time", details.time, "time", "10:30 AM")}</div>}
          {zone.id === "venue" && input("Venue", details.venue, "venue", "Venue & place")}
          {zone.id === "verse" && area("Closing verse / footnote", details.verse, "verse")}
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Enter or Esc to finish · changes save automatically</p>
        </div>
      )}
    </>
  );
}

"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { EVENTS, FONT_STYLES, fontLabel, greetingTemplate, TEXT_SCALE_MAX, TEXT_SCALE_MIN, type BlockId, type EventConfig, type EventType, type FontStyle, type TextId, type WeddingDetails } from "@/lib/wedding";
import { blockOfZone, type CardZone, type GroupBox } from "@/lib/wedding-render";
import { cn } from "@/lib/utils";

const SECTION: Record<BlockId, string> = { guest: "Greeting", header: "Header / blessing", names: "Names", body: "Message", dateTime: "Date & time", venue: "Venue / footer" };
const fieldCls = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#D12014] focus:ring-1 focus:ring-[#D12014] dark:border-slate-600 dark:bg-[#0A0B0D] dark:text-slate-100";
const btn = "h-7 min-w-8 rounded-md border border-slate-300 px-1.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5";
/** The element being edited (size is per element; font and position belong to its block, which can hold several elements). */
const ELEMENT: Record<TextId, string> = { guest: "Greeting", blessing: "Blessing", title: "Event title", names: "Names", parents: "Family line", message: "Wording", datetime: "Date & time", venue: "Venue", verse: "Closing verse" };
const clampScale = (v: number) => Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(v * 20) / 20));

/**
 * The contextual toolbar for the text section the client clicked on the card: edit its wording, set its font and size (for just this
 * section or all text), toggle the greeting's box, fine-tune its position, then Done. Rendered only while a section is selected.
 */
export function SectionToolbar({ zone, zones, groups, details, cfg, onChange, onMoveBadge, onMoveBlock, onScale, onMaster, onFont, onAllFont, onDone }: {
  zone: CardZone["id"]; zones: CardZone[]; groups: GroupBox[]; details: WeddingDetails; cfg: EventConfig;
  onChange: (p: Partial<WeddingDetails>) => void;
  onMoveBadge: (x: number, y: number) => void; onMoveBlock: (key: Exclude<BlockId, "guest">, x: number, y: number) => void;
  onScale: (key: TextId, v: number) => void; onMaster: (v: number) => void;
  onFont: (key: BlockId, f: FontStyle | "") => void; onAllFont: (f: FontStyle) => void; onDone: () => void;
}) {
  const key = blockOfZone(zone);
  const [scope, setScope] = useState<"section" | "all">("section");
  if (!key) return null;

  // Where the section sits now (% of the card): its saved position, else the box it was last drawn in.
  const box = key === "guest" ? zones.find((z) => z.id === "guest") : groups.find((g) => g.key === key);
  const saved = key === "guest" ? (details.guestBadgeX != null && details.guestBadgeY != null ? { x: details.guestBadgeX, y: details.guestBadgeY } : null) : details.blockPos?.[key] ?? null;
  const cx = saved?.x ?? (box ? Math.round(((box.x + box.w / 2) / 1080) * 1000) / 10 : 50);
  const cy = saved?.y ?? (box ? Math.round(((box.y + box.h / 2) / 1500) * 1000) / 10 : 10);
  const move = (x: number, y: number) => { const nx = Math.min(100, Math.max(0, Math.round(x * 10) / 10)), ny = Math.min(100, Math.max(0, Math.round(y * 10) / 10)); if (key === "guest") onMoveBadge(nx, ny); else onMoveBlock(key, nx, ny); };

  const tid = zone as TextId; // size is kept per text element (zone), not per block
  const legacy = ({ blessing: "header", title: "header", parents: "body", message: "body", datetime: "dateTime" } as Partial<Record<TextId, BlockId>>)[tid];
  const own = details.blockScale?.[tid] ?? (legacy ? details.blockScale?.[legacy] : undefined);
  const size = scope === "all" ? details.contentScale ?? 1 : own ?? 1;
  const setSize = (v: number) => (scope === "all" ? onMaster(clampScale(v)) : onScale(tid, clampScale(v)));
  const fontVal = scope === "all" ? details.fontStyle ?? "default" : details.blockFont?.[key] ?? "";

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
  // Enter finishes editing from a single-line field (Escape is handled by the studio for every selection).
  const enterDone = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA" && (e.target as HTMLElement).tagName !== "SELECT") { e.preventDefault(); onDone(); } };

  return (
    <div role="toolbar" aria-label={`${ELEMENT[tid]} options`} data-section-toolbar onKeyDown={enterDone} className="space-y-2.5 rounded-lg border border-[#D12014]/40 bg-white p-3 shadow-md dark:border-[#D12014]/50 dark:bg-[#131416]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900 dark:text-white"><span className="mr-1.5 rounded-full bg-[#D12014] px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">Editing</span>{ELEMENT[tid]}</p>
        <button type="button" onClick={onDone} aria-label="Done" className="inline-flex items-center gap-1 rounded-md bg-[#0A0B0D] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#17181C] dark:bg-[#D12014] dark:hover:bg-[#E83E32]"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Done</button>
      </div>

      {/* 1. Inline text edit */}
      <div className="space-y-2">
        {zone === "guest" && (
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Greeting wording: {"{Name}"} and {"{Place}"} are filled in for every guest
            <input type="text" autoFocus value={greetingTemplate(details)} maxLength={120} placeholder="Dear {Name} & Family" onChange={(e) => onChange({ guestGreetingFormat: "custom", guestGreetingTemplate: e.target.value })} className={`mt-0.5 ${fieldCls}`} />
          </label>
        )}
        {zone === "blessing" && area("Blessing / top verse", details.blessing, "blessing", "Leave empty for the template's default blessing")}
        {zone === "title" && (
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Event type
            <select value={details.eventType} onChange={(e) => onChange({ eventType: e.target.value as EventType })} className={`mt-0.5 ${fieldCls}`}>
              {EVENTS.map((t) => <option key={t.id} value={t.id}>{t.en} · {t.ml}</option>)}
            </select>
          </label>
        )}
        {zone === "names" && <div className={cfg.useName2 ? "grid grid-cols-2 gap-2" : ""}>{input(cfg.labels.name1, details.groom, "groom", cfg.sample.groom)}{cfg.useName2 && input(cfg.labels.name2, details.bride, "bride", cfg.sample.bride || "")}</div>}
        {zone === "parents" && <div className="space-y-2">{input(cfg.labels.host1, details.groomParents, "groomParents")}{cfg.useHost2 && input(cfg.labels.host2, details.brideParents, "brideParents")}</div>}
        {zone === "message" && area("Invitation message", details.message, "message", "Leave empty for the default wording")}
        {zone === "datetime" && <div className="grid grid-cols-2 gap-2">{input("Date", details.date, "date", "", "date")}{input(cfg.labels.time, details.time, "time", cfg.sample.time)}</div>}
        {zone === "venue" && input(cfg.labels.venue, details.venue, "venue", "Venue & place")}
        {zone === "verse" && area("Closing verse / footnote", details.verse, "verse")}
      </div>

      {/* 2. Style: font + size, for this section or every text on the card */}
      <div className="space-y-2 border-t border-slate-200 pt-2.5 dark:border-slate-700">
        <div role="radiogroup" aria-label="Apply font and size to" className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Apply to</span>
          {([["section", "This text"], ["all", "All text"]] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={scope === v} onClick={() => setScope(v)} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", scope === v ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5")}>{label}</button>
          ))}
        </div>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Font
          <select aria-label={scope === "all" ? "Font for all card text" : "Font for this section"} value={fontVal} onChange={(e) => (scope === "all" ? onAllFont(e.target.value as FontStyle) : onFont(key, e.target.value as FontStyle | ""))} className={`mt-0.5 ${fieldCls}`}>
            {scope === "section" && <option value="">Card font ({fontLabel(details.fontStyle)})</option>}
            {FONT_STYLES.filter((f) => scope === "all" || f.id !== "default").map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1.5" role="group" aria-label={scope === "all" ? "All text size" : `${ELEMENT[tid]} text size`}>
          <span className="w-14 shrink-0 text-[11px] leading-tight font-semibold text-slate-600 dark:text-slate-300">{scope === "all" ? "All text size" : "Text size"}</span>
          <button type="button" aria-label="Smaller text" onClick={() => setSize(size - 0.05)} disabled={size <= TEXT_SCALE_MIN} className={btn}>A−</button>
          <input type="range" min={TEXT_SCALE_MIN * 100} max={TEXT_SCALE_MAX * 100} step={5} value={Math.round(size * 100)} aria-label={`${scope === "all" ? "All text" : ELEMENT[tid]} size, percent`} onChange={(e) => setSize(Number(e.target.value) / 100)} className="h-1.5 min-w-0 flex-1 accent-[#D12014]" />
          <button type="button" aria-label="Larger text" onClick={() => setSize(size + 0.05)} disabled={size >= TEXT_SCALE_MAX} className={btn}>A+</button>
          <span className="w-11 shrink-0 rounded-md bg-slate-100 px-1 py-0.5 text-center text-[11px] font-bold tabular-nums text-slate-800 dark:bg-white/10 dark:text-slate-100" aria-live="polite">{Math.round(size * 100)}%</span>
          <button type="button" onClick={() => setSize(1)} disabled={Math.round(size * 100) === 100} className="shrink-0 rounded-md border border-slate-300 px-1.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5">Reset</button>
        </div>
        {key === "guest" && (
          <div role="radiogroup" aria-label="Greeting box" className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Greeting box</span>
            {([[true, "With box"], [false, "Text only"]] as const).map(([v, label]) => (
              <button key={label} type="button" role="radio" aria-checked={(details.guestGreetingBoxed !== false) === v} onClick={() => onChange({ guestGreetingBoxed: v })} className={cn("rounded-md border px-2.5 py-1 text-[11px] font-bold", (details.guestGreetingBoxed !== false) === v ? "border-[#D12014] bg-[#D12014]/5 text-[#A91400] dark:text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5")}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Fine position (dragging the text on the card and the arrow keys also work) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-200 pt-2.5 dark:border-slate-700" role="group" aria-label="Fine position">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Position</span>
        {([["X", cx, (v: number) => move(v, cy), "left", "right"], ["Y", cy, (v: number) => move(cx, v), "up", "down"]] as const).map(([axis, val, apply, dec, inc]) => (
          <span key={axis} className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{axis}</span>
            <button type="button" aria-label={`Move ${dec}`} onClick={() => apply(val - 1)} className={btn}>−</button>
            <span className="w-12 text-center text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-100">{val}%</span>
            <button type="button" aria-label={`Move ${inc}`} onClick={() => apply(val + 1)} className={btn}>+</button>
          </span>
        ))}
        <span className="text-[10px] text-slate-500 dark:text-slate-400">moves this whole block · or drag on the card · arrow keys nudge</span>
      </div>
    </div>
  );
}

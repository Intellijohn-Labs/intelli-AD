"use client";

import { Plus, Trash2 } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { buildAnimConfig, defaultTiming } from "@/lib/text-anim";
import { LOGO_SHAPES, LOGO_SIZE, type LogoShape } from "@/lib/overlay";
import { FONT_STYLES, newId, type FontStyle, type OverlayText } from "@/lib/wedding";
import { cn } from "@/lib/utils";
import { AnimControls } from "./anim-controls";
import { ColorControls } from "./anim-colors";

export const newTextBox = (n: number): OverlayText => ({ id: newId(), text: "Your text", x: 50, y: Math.min(80, 30 + n * 10), size: 56, font: "", color: null, pill: "dark", pillColor: "#000000", anim: "none", timing: defaultTiming("header") });

/** "+ Add Text Box" panel (image cards and videos): the list of boxes, and the editor of the selected one. Boxes are dragged on the live preview. */
export function TextBoxEditor({ boxes, selectedId, onSelect, onAdd, onChange, onDelete, isVideo, videoDuration, onReplay }: {
  boxes: OverlayText[]; selectedId: string | null; onSelect: (id: string | null) => void; onAdd: () => void;
  onChange: (id: string, patch: Partial<OverlayText>) => void; onDelete: (id: string) => void; isVideo: boolean; videoDuration: number; onReplay: () => void;
}) {
  const sel = boxes.find((b) => b.id === selectedId) ?? null;
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 sm:col-span-2 dark:border-slate-700" data-text-boxes>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Text boxes</h3>
        <button type="button" onClick={onAdd} data-add-text-box className="inline-flex items-center gap-1.5 rounded-lg bg-[#D12014] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#A91400]"><Plus className="h-4 w-4" aria-hidden="true" /> Add Text Box</button>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">Add your own lines (English or Malayalam) anywhere on the {isVideo ? "video" : "card"}. Drag a box on the preview to place it; use {"{name}"} to insert each guest&apos;s name.</p>
      {boxes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Your text boxes">
          {boxes.map((b, i) => (
            <li key={b.id}><button type="button" onClick={() => onSelect(selectedId === b.id ? null : b.id)} aria-pressed={selectedId === b.id} className={cn("max-w-[11rem] truncate rounded-full border px-3 py-1 text-xs font-bold", selectedId === b.id ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5")}>{i + 1}. {b.text.trim() || "Empty"}</button></li>
          ))}
        </ul>
      )}
      {sel && (
        <div className="space-y-3 rounded-lg border border-[#D12014]/40 p-3" data-text-box-editor={sel.id}>
          <div className="flex items-end gap-2">
            <Field id={`tb-text-${sel.id}`} label="Text" className="flex-1"><Input id={`tb-text-${sel.id}`} value={sel.text} maxLength={160} onChange={(e) => onChange(sel.id, { text: e.target.value })} placeholder="Type here, e.g. With love, {name}" /></Field>
            <button type="button" onClick={() => onDelete(sel.id)} aria-label="Delete this text box" className="mb-5 inline-flex h-10 items-center gap-1.5 rounded-lg border border-red-300 px-3 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`tb-font-${sel.id}`} label="Font">
              <Select id={`tb-font-${sel.id}`} value={sel.font || "default"} onChange={(e) => onChange(sel.id, { font: e.target.value === "default" ? "" : (e.target.value as FontStyle) })}>
                {FONT_STYLES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </Select>
            </Field>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Font size: {sel.size}px
              <input type="range" aria-label="Text box font size" data-tb-size min={20} max={140} step={2} value={sel.size} onChange={(e) => onChange(sel.id, { size: Number(e.target.value) })} className="mt-2 block w-full accent-[#D12014]" />
            </label>
          </div>
          <ColorControls layer={`tb-${sel.id}`} label="Text box" allowDefaultColor color={sel.color} onColor={(c) => onChange(sel.id, { color: c })} pill={sel.pill} pillColor={sel.pillColor} onPill={(p) => onChange(sel.id, { pill: p })} onPillColor={(c) => onChange(sel.id, { pillColor: c })} />
          {isVideo && (
            <AnimControls layer="header" id={`tb-anim-${sel.id}`} label="Animation" preset={sel.anim} timing={sel.timing} cfg={buildAnimConfig(sel.anim, sel.timing, "header", videoDuration)} videoDuration={videoDuration}
              onPreset={(p) => { onChange(sel.id, { anim: p }); onReplay(); }} onTiming={(t) => { onChange(sel.id, { timing: t }); onReplay(); }} />
          )}
        </div>
      )}
    </div>
  );
}

/** Size and shape of the sender logo / photo (placed by dragging it on the preview). */
export function LogoControls({ size, shape, moved, onSize, onShape, onReset }: { size: number; shape: LogoShape; moved: boolean; onSize: (n: number) => void; onShape: (s: LogoShape) => void; onReset: () => void }) {
  return (
    <div className="mt-2 space-y-2" data-logo-controls>
      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-100">Logo size: {size}px
        <input type="range" aria-label="Logo size" data-logo-size min={LOGO_SIZE.min} max={LOGO_SIZE.max} step={2} value={size} onChange={(e) => onSize(Number(e.target.value))} className="mt-1 block w-full accent-[#D12014]" />
      </label>
      <div role="radiogroup" aria-label="Logo shape" className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Shape</span>
        {LOGO_SHAPES.map((s) => <button key={s.id} type="button" role="radio" aria-checked={shape === s.id} onClick={() => onShape(s.id)} className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", shape === s.id ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5")}>{s.label}</button>)}
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-300">Drag the logo on the preview to move it.{moved && <> <button type="button" onClick={onReset} className="font-bold text-[#D12014] underline">Put it back</button></>}</p>
    </div>
  );
}

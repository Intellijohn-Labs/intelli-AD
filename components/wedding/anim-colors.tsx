"use client";

import { PILL_STYLES, type PillStyle } from "@/lib/text-anim";
import { cn } from "@/lib/utils";

export const FESTIVE_SWATCHES: { hex: string; name: string }[] = [
  { hex: "#FFFFFF", name: "Crisp White" }, { hex: "#FDE047", name: "Warm Gold" }, { hex: "#FACC15", name: "Amber Gold" }, { hex: "#F87171", name: "Crimson Coral" },
  { hex: "#34D399", name: "Emerald Mint" }, { hex: "#60A5FA", name: "Sky Blue" }, { hex: "#F472B6", name: "Rose Pink" }, { hex: "#111827", name: "Deep Charcoal" },
];

/** Text colour (picker, hex readout, 8 swatches) and background pill style for one video text layer. `color` null = the layer's built-in default. */
export function ColorControls({ layer, label, color, onColor, pill, pillColor, onPill, onPillColor, allowDefaultColor }: {
  layer: string; label: string; color: string | null; onColor: (hex: string | null) => void;
  pill: PillStyle; pillColor: string; onPill: (p: PillStyle) => void; onPillColor: (hex: string) => void; allowDefaultColor?: boolean;
}) {
  const chip = (on: boolean) => cn("rounded-full border px-2.5 py-1 text-xs font-bold", on ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5");
  return (
    <div className="space-y-2" data-anim-colors={layer}>
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Colours</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="color" aria-label={`${label} text colour`} data-text-color={layer} value={color ?? "#FACC15"} onChange={(e) => onColor(e.target.value.toUpperCase())} className="h-9 w-11 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600" />
        <output className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100" data-text-hex={layer}>{color ?? "Default"}</output>
        {allowDefaultColor && <button type="button" onClick={() => onColor(null)} disabled={!color} className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5">Use default</button>}
      </div>
      <div role="group" aria-label={`${label} colour swatches`} className="flex flex-wrap gap-1.5">
        {FESTIVE_SWATCHES.map((s) => (
          <button key={s.hex} type="button" title={`${s.name} ${s.hex}`} aria-label={`${s.name} ${s.hex}`} aria-pressed={color?.toUpperCase() === s.hex} onClick={() => onColor(s.hex)}
            className={cn("h-7 w-7 rounded-full border-2", color?.toUpperCase() === s.hex ? "border-[#D12014] ring-2 ring-[#D12014]/40" : "border-slate-300 dark:border-slate-500")} style={{ background: s.hex }} />
        ))}
      </div>
      <div role="radiogroup" aria-label={`${label} background pill`} className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Pill</span>
        {allowDefaultColor && <button type="button" role="radio" aria-checked={pill === "default"} onClick={() => onPill("default")} className={chip(pill === "default")}>Card default</button>}
        {PILL_STYLES.map((p) => <button key={p.id} type="button" role="radio" aria-checked={pill === p.id} onClick={() => onPill(p.id)} className={chip(pill === p.id)}>{p.label}</button>)}
        {pill === "custom" && <input type="color" aria-label={`${label} pill tint`} data-pill-color={layer} value={pillColor} onChange={(e) => onPillColor(e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600" />}
      </div>
    </div>
  );
}

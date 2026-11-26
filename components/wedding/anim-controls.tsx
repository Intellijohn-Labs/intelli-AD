"use client";

import type { ReactNode } from "react";
import { Field, Select } from "@/components/ui/field";
import { defaultDuration, defaultTiming, DURATION_RANGE, EXIT_ANIMS, SPEED_RANGE, START_RANGE, TEXT_ANIMS, type AnimConfig, type AnimTiming, type ExitAnim, type TextAnim } from "@/lib/text-anim";

const num = "h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const lab = "text-xs font-semibold text-slate-700 dark:text-slate-200";

/**
 * One animated text layer's controls: preset (15 effects, grouped) plus Timing & Speed (speed, start-in, duration, exit and out time). Used for the video header, the footer
 * quote and every "+ Add Text Box" box, so they all behave identically. `children` render below (colour controls etc.).
 */
export function AnimControls({ layer, id, label, hint, preset, timing, cfg, videoDuration, onPreset, onTiming, children }: {
  layer: "header" | "footer"; id: string; label: string; hint?: string; preset: TextAnim; timing: Partial<AnimTiming> | undefined; cfg: AnimConfig; videoDuration: number;
  onPreset: (p: TextAnim) => void; onTiming: (t: AnimTiming) => void; children?: ReactNode;
}) {
  const tm: AnimTiming = { ...defaultTiming(layer), ...(timing ?? {}) }, off = tm.exit === "none";
  const setT = (patch: Partial<AnimTiming>) => onTiming({ ...tm, ...patch });
  const parse = (v: string) => (v.trim() === "" ? null : Number(v));
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700" data-anim-layer={layer}>
      <Field id={id} label={label} hint={hint}>
        <Select id={id} value={preset} onChange={(e) => onPreset(e.target.value as TextAnim)}>
          <option value="none">None (Static)</option>
          <optgroup label="Entrance animations">{TEXT_ANIMS.filter((a) => a.group === "entrance").map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
          <optgroup label="Continuous / loop">{TEXT_ANIMS.filter((a) => a.group === "loop").map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
        </Select>
      </Field>
      <fieldset className="grid gap-2 sm:grid-cols-2" disabled={preset === "none" && off}>
        <legend className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-200">Timing &amp; Speed</legend>
        <label className={lab}>Speed: {tm.speed.toFixed(2).replace(/0$/, "")}x
          <input type="range" aria-label={`${label} speed`} data-anim-speed={layer} min={SPEED_RANGE.min} max={SPEED_RANGE.max} step={0.05} value={tm.speed} onChange={(e) => setT({ speed: Number(e.target.value) })} className="mt-1 block w-full" />
        </label>
        <label className={lab}>Start In (s)
          <input type="number" aria-label={`${label} start in`} data-anim-start={layer} className={`${num} mt-1`} min={START_RANGE.min} max={START_RANGE.max} step={0.1} value={tm.startIn} onChange={(e) => setT({ startIn: Number(e.target.value) || 0 })} />
        </label>
        <label className={lab}>Duration (s)
          <input type="number" aria-label={`${label} duration`} data-anim-duration={layer} className={`${num} mt-1`} min={DURATION_RANGE.min} max={DURATION_RANGE.max} step={0.1} value={tm.duration ?? defaultDuration(preset)} onChange={(e) => setT({ duration: parse(e.target.value) })} />
        </label>
        <label className={lab}>Exit / Out
          <Select id={`${id}-exit`} value={tm.exit} onChange={(e) => setT({ exit: e.target.value as ExitAnim })}>{EXIT_ANIMS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</Select>
        </label>
        <label className={`${lab} sm:col-span-2`}>Out Time (s)
          <input type="number" aria-label={`${label} out time`} data-anim-out={layer} disabled={off} className={`${num} mt-1`} min={0} max={Math.max(0, videoDuration)} step={0.1} value={Math.round(cfg.outTime * 10) / 10} onChange={(e) => setT({ outTime: parse(e.target.value) })} />
        </label>
      </fieldset>
      {children}
    </div>
  );
}

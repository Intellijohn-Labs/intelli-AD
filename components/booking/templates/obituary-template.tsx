"use client";

import { Flame, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { getNewspaper } from "@/data/newspapers";
import { AiAssistantModal, useAiReady } from "../ai-assistant-modal";
import { useArtworkUpload } from "@/lib/supabase/use-artwork-upload";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { composeObituary, DEFAULT_OBITUARY, FRAME_ACCENTS, FRAME_STYLES, HEADING_STYLES, MILESTONES, OBITUARY_PRESETS, PREFIXES, TRIBUTES, tributeText, type FrameAccent, type ObituaryFields, type ObituaryKind } from "@/data/obituary";
import { useBooking, type BookingState } from "@/lib/booking-store";
import { cropStyle, PhotoCropper } from "../photo-cropper";
import { ParagraphField } from "../paragraph-field";
import type { FileMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PreviewCaption } from "./preview-caption";

/** Single-line contentEditable block: commits on blur / Enter, so the notice text can be edited right on the proof. */
function EditableLine({ value, onCommit, className, style }: { value: string; onCommit: (v: string) => void; className?: string; style?: React.CSSProperties }) {
  return (
    <p
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label="Edit this line"
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      onBlur={(e) => { const v = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim(); if (v !== value) onCommit(v); }}
      className={cn("cursor-text rounded-sm outline-none hover:bg-blue-500/5 focus:bg-blue-50/80 focus:ring-1 focus:ring-blue-500", className)}
      style={style}
    >{value}</p>
  );
}

/** Replaces the nth non-empty line of the ad text. */
function replaceLine(text: string, n: number, value: string) {
  const lines = text.split("\n");
  let seen = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() && ++seen === n) { lines[i] = value; break; }
  }
  return lines.join("\n");
}

const SERIF = { fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' };
const chip = "rounded border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-500";

/**
 * Composer for the obituary category: pick Marana Vartha (death notice) or Death Anniversary
 * (In Memoriam), fill the fields, and the print text is generated into the ad text.
 * The portrait is the ad's artwork upload (classified display / box ads).
 */
export function ObituaryComposer({ onText, onPhoto, charsPerLine = 28 }: { onText: (text: string) => void; onPhoto: (f: FileMeta | null) => void; charsPerLine?: number }) {
  const { state, update } = useBooking();
  const aiReady = useAiReady();
  const [aiOpen, setAiOpen] = useState(false);
  const paperName = getNewspaper(Object.keys(state.selection).find((k) => state.selection[k].length))?.name ?? "";
  // The category decides the notice type: Obituary = death notice, Remembrance = death anniversary.
  const kind: ObituaryKind = state.categoryId === "remembrance" ? "anniversary" : "demise";
  const f = { ...DEFAULT_OBITUARY, ...state.obituary, kind }; // merge keeps older saved drafts valid
  const isText = state.adType === "classified-text";
  const anniv = kind === "anniversary";

  // The matter is custom when flagged (AI text applied) or when it no longer matches what the fields would generate
  // (edited by hand in the text box or the proof). Compared loosely: spacing / blank lines don't count as edits.
  const norm = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
  const custom = f.isCustomMatter === true || (norm(state.text) !== "" && norm(state.text) !== norm(composeObituary(f)));

  /** Regenerates the matter from the fields (quick drafts, reset, and every field edit while the matter isn't custom). */
  const apply = (next: ObituaryFields) => {
    const fields = { ...next, isCustomMatter: false };
    update({ obituary: fields });
    onText(composeObituary(fields));
  };
  const set = (patch: Partial<ObituaryFields>) => {
    // A custom matter is never overwritten by field edits; the fields (photo, frame, heading…) still save.
    if (custom) update({ obituary: { ...f, ...patch, isCustomMatter: true } });
    else apply({ ...f, ...patch });
  };
  const input = (key: keyof ObituaryFields, type = "text") => ({
    value: f[key] as string,
    type,
    onChange: (e: { target: { value: string } }) => set({ [key]: e.target.value } as Partial<ObituaryFields>),
  });

  return (
    <section aria-labelledby="obit-h" className="space-y-5 rounded-md border border-zinc-300 bg-zinc-50/70 p-4 sm:p-5 dark:border-[#1F2F57] dark:bg-slate-800/40">
      <div>
        <h3 id="obit-h" className="font-bold text-zinc-900 dark:text-white">{anniv ? "Death Anniversary / In Memoriam · ചരമവാർഷികം" : "Obituary · മരണവാർത്ത"}</h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-slate-200">Fill in the details and the notice is written for you. You can still edit the generated text below.</p>
      </div>

      {custom && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <span className="flex-1">ഇഷ്ടാനുസൃത മാറ്റർ ഉപയോഗത്തിലുണ്ട് — താഴെയുള്ള വിവരങ്ങൾ മാറ്റിയാലും ഇത് മാറില്ല. (Custom matter in use: editing the fields won’t overwrite it.)</span>
          <button type="button" onClick={() => apply(f)} className="font-semibold underline underline-offset-2 hover:text-amber-700">റീസെറ്റ് ചെയ്യുക (Reset to default template)</button>
        </p>
      )}

      <div role="group" aria-label="Quick drafts" className="flex flex-wrap gap-2">
        {OBITUARY_PRESETS.filter((p) => p.kind === kind).map((p) => (
          <button key={p.id} type="button" title={p.description} className={cn(chip, "border-navy-300 bg-white text-navy-800 hover:bg-navy-50 dark:bg-[#0F1D3D] dark:text-white")}
            onClick={() => apply({ ...p.build(new Date()), kind })}>
            {p.titleMl} <span className="font-normal text-zinc-500">· {p.title}</span>
          </button>
        ))}
      </div>

      {anniv ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ob-milestone" label="Anniversary · ചരമവാർഷികം">
            <Select id="ob-milestone" value={f.milestone} onChange={(e) => set({ milestone: e.target.value })}>
              {MILESTONES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </Select>
          </Field>
          <Field id="ob-rdate" label="Date of remembrance · സ്മരണ തീയതി"><Input id="ob-rdate" {...input("remembranceDate", "date")} /></Field>
          <Field id="ob-name" label="Name of the deceased · പരേതന്റെ/പരേതയുടെ പേര്" required className="sm:col-span-2"><Input id="ob-name" {...input("name")} /></Field>
          <Field id="ob-house" label="House / family name · വീട്ടുപേര്"><Input id="ob-house" {...input("house")} /></Field>
          <Field id="ob-place" label="Place · സ്ഥലം"><Input id="ob-place" {...input("place")} /></Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Tribute verse · സ്മരണാഞ്ജലി വരികൾ</p>
            <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Tribute presets">
              {TRIBUTES.map((t) => (
                <button key={t.id} type="button" onClick={() => set({ tribute: tributeText(t.id, f.name) })} className={cn(chip, "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}>{t.label}</button>
              ))}
            </div>
            <ParagraphField id="ob-tribute" label="Tribute text" rows={4} maxHeight={260} value={f.tribute} onChange={(v) => set({ tribute: v })} placeholder="ഇവിടെ അനുശോചന കുറിപ്പുകൾ പാരഗ്രാഫുകളായി ടൈപ്പ് ചെയ്യുക (ഉദാ: ഞങ്ങളുടെ പ്രിയപ്പെട്ട... നിത്യശാന്തി നേരുന്നു)..." textClassName="font-clipping" />
          </div>
          <ParagraphField id="ob-family" label="Remembered by · ഓർമ്മകളോടെ" hint="Spouse, children, grandchildren, relatives & friends · ഭാര്യ/ഭർത്താവ്, മക്കൾ, കൊച്ചുമക്കൾ, ബന്ധുമിത്രാദികൾ" className="sm:col-span-2" rows={3} maxHeight={240} value={f.family} onChange={(v) => set({ family: v })} textClassName="font-clipping" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ob-prefix" label="Header · ശീർഷകം" className="sm:col-span-2">
            <Select id="ob-prefix" value={f.prefixId} onChange={(e) => set({ prefixId: e.target.value })}>
              <optgroup label="Neutral / respectful">
                {PREFIXES.filter((p) => p.group === "neutral").map((p) => <option key={p.id} value={p.id}>{p.text}</option>)}
              </optgroup>
              <optgroup label="Religious">
                {PREFIXES.filter((p) => p.group === "religious").map((p) => <option key={p.id} value={p.id}>{p.text} ({p.note})</option>)}
              </optgroup>
            </Select>
          </Field>
          <Field id="ob-name" label="Name of the deceased · പരേതന്റെ/പരേതയുടെ പേര്" required><Input id="ob-name" {...input("name")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ob-age" label="Age · വയസ്സ്"><Input id="ob-age" inputMode="numeric" {...input("age")} /></Field>
            <Field id="ob-gender" label="Gender · ലിംഗം" hint="Used for the verb">
              <Select id="ob-gender" value={f.gender} onChange={(e) => set({ gender: e.target.value as "m" | "f" })}>
                <option value="m">പുരുഷൻ · Male</option>
                <option value="f">സ്ത്രീ · Female</option>
              </Select>
            </Field>
          </div>
          <Field id="ob-house" label="House / family name · വീട്ടുപേര്"><Input id="ob-house" {...input("house")} /></Field>
          <Field id="ob-place" label="Place · സ്ഥലം"><Input id="ob-place" {...input("place")} /></Field>
          <Field id="ob-ddate" label="Date of demise · മരണപ്പെട്ട തീയതി"><Input id="ob-ddate" {...input("demiseDate", "date")} /></Field>
          <Field id="ob-dtime" label="Time of demise · സമയം"><Input id="ob-dtime" {...input("demiseTime", "time")} /></Field>
          <Field id="ob-fdate" label="Funeral date · സംസ്കാരം തീയതി"><Input id="ob-fdate" {...input("funeralDate", "date")} /></Field>
          <Field id="ob-ftime" label="Funeral time · സമയം"><Input id="ob-ftime" {...input("funeralTime", "time")} /></Field>
          <Field id="ob-fplace" label="Funeral / cremation place · സംസ്കാര സ്ഥലം" className="sm:col-span-2"><Input id="ob-fplace" {...input("funeralPlace")} /></Field>
          <ParagraphField id="ob-family" label="Surviving family · ബന്ധുക്കൾ" hint="Spouse, children, in-laws · ഭാര്യ/ഭർത്താവ്, മക്കൾ, മരുമക്കൾ" className="sm:col-span-2" rows={3} maxHeight={240} value={f.family} onChange={(v) => set({ family: v })} textClassName="font-clipping" />
          <Field id="ob-contact" label="Contact number(s) · ഫോൺ" className="sm:col-span-2"><Input id="ob-contact" inputMode="tel" {...input("contact")} /></Field>
        </div>
      )}

      {!isText && aiReady && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
          <button type="button" onClick={() => setAiOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(124,58,237,0.55)] hover:shadow-[0_0_22px_rgba(124,58,237,0.8)]">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> ✨ AI സഹായി (AI Suggestions)
          </button>
          <span className="flex-1 text-xs text-zinc-600 dark:text-slate-200">ഫോം വിവരങ്ങളിൽ നിന്ന് ചരമ അറിയിപ്പിന്റെ മാതൃകകൾ ഉണ്ടാക്കാം. തിരഞ്ഞെടുത്താൽ നോട്ടീസ് മാറ്ററായി ചേർക്കും; ഫോമിലെ വിവരങ്ങൾ പിന്നീട് മാറ്റിയാലും ഈ മാറ്റർ മാറില്ല (റീസെറ്റ് ചെയ്താൽ ഫോമിൽ നിന്ന് വീണ്ടും ഉണ്ടാക്കാം).</span>
        </div>
      )}
      <AiAssistantModal open={aiOpen} onClose={() => setAiOpen(false)} initialText={state.text} category={anniv ? "remembrance" : "obituary"} newspaper={paperName} language="ml" charsPerLine={charsPerLine} onUse={(txt) => { update({ obituary: { ...f, isCustomMatter: true } }); onText(txt); }} />

      <ParagraphField id="ob-prayer" label="Prayer / tribute · പ്രാർത്ഥന" hint="Printed in italics under the details · e.g. ആത്മാവിന് നിത്യശാന്തി നേരുന്നു." rows={3} maxHeight={240} value={f.prayer} onChange={(v) => set({ prayer: v })} textClassName="font-clipping" />

      {isText ? (
        <p className="border-t border-zinc-300 pt-4 text-xs text-zinc-600 dark:border-[#1F2F57] dark:text-slate-200">Booked as Classified Text: billed per line, with no photo or border. Choose Classified Display in step 1 for a photo, frame and size-based pricing.</p>
      ) : (
      <fieldset className="space-y-4 border-t border-zinc-300 pt-4 dark:border-[#1F2F57]">
        <legend className="text-sm font-bold">Photo, frame &amp; heading · ഫോട്ടോ</legend>
        <PhotoCropper photo={state.artwork} onPhoto={onPhoto} crop={f.photoCrop} onCrop={(c) => set({ photoCrop: c })} round={f.photoFrame === "round"} />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Photo shape">
          {(["round", "rect"] as const).map((fr) => (
            <button key={fr} type="button" aria-pressed={f.photoFrame === fr} onClick={() => set({ photoFrame: fr })} className={cn(chip, f.photoFrame === fr ? "border-navy-700 bg-navy-50 text-navy-900" : "border-zinc-300 bg-white dark:bg-[#0F1D3D]")}>
              {fr === "round" ? "Circular photo" : "Rectangular photo"}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-slate-200">Border frame · ബോർഡർ</p>
          <div role="radiogroup" aria-label="Border frame" className="grid grid-cols-3 gap-2">
            {FRAME_STYLES.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={f.frameStyle === a.id} onClick={() => set({ frameStyle: a.id })}
                className={cn("rounded border px-2 py-2 text-center text-xs font-semibold focus-visible:outline-2 focus-visible:outline-navy-500", f.frameStyle === a.id ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}>
                {a.ml}<span className="block font-normal text-zinc-500">{a.en}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-slate-200">Heading style · ശീർഷക ശൈലി</p>
          <div role="radiogroup" aria-label="Heading style" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HEADING_STYLES.map((h) => (
              <button key={h.id} type="button" role="radio" aria-checked={f.headingStyle === h.id} onClick={() => set({ headingStyle: h.id })}
                className={cn("rounded border px-2 py-2 text-center text-base focus-visible:outline-2 focus-visible:outline-navy-500", f.headingStyle === h.id ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}
                style={{ fontFamily: h.family, fontWeight: h.weight }}>
                {h.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-slate-200">Portrait ornament · അലങ്കാരം</p>
          <div role="radiogroup" aria-label="Frame accent" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FRAME_ACCENTS.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={f.frameAccent === a.id} onClick={() => set({ frameAccent: a.id })}
                className={cn("rounded border px-2 py-2 text-center text-xs font-semibold focus-visible:outline-2 focus-visible:outline-navy-500", f.frameAccent === a.id ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}>
                {a.ml}<span className="block font-normal text-zinc-500">{a.en}</span>
              </button>
            ))}
          </div>
        </div>
      </fieldset>
      )}
    </section>
  );
}

/** Flowers spaced evenly along the frame outline (viewBox units). */
function garlandPoints(round: boolean, w: number, h: number, n: number) {
  const pts: [number, number][] = [];
  if (round) {
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([w / 2 + (w / 2 - 6) * Math.cos(a), h / 2 + (h / 2 - 6) * Math.sin(a)]); }
  } else {
    const per = 2 * (w - 12 + h - 12);
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per;
      if (d < w - 12) pts.push([6 + d, 6]);
      else if ((d -= w - 12) < h - 12) pts.push([w - 6, 6 + d]);
      else if ((d -= h - 12) < w - 12) pts.push([w - 6 - d, h - 6]);
      else pts.push([6, h - 6 - (d - (w - 12))]);
    }
  }
  return pts;
}

/** Garland: a ring of flowers around the portrait (black outlines, white petals, so it prints in mono). */
export function Garland({ round, w, h }: { round: boolean; w: number; h: number }) {
  const pts = garlandPoints(round, w, h, round ? 14 : 18);
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {pts.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} stroke="#000" strokeWidth="1" fill="#fff">
          {[0, 72, 144, 216, 288].map((r) => <circle key={r} cx={0} cy={-4} r={3} transform={`rotate(${r})`} />)}
          <circle r="2" fill="#000" />
        </g>
      ))}
    </svg>
  );
}

/** Nilavilakku: Kerala brass lamp with a lit wick. White halo keeps it readable over the photo. */
export function Lamp() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 48" className="h-12 w-8" strokeLinejoin="round">
      <g stroke="#fff" strokeWidth="3" paintOrder="stroke" fill="#000">
        <path className="lamp-flame" d="M16 3c2.6 3 3.4 5.2 0 8.4-3.4-3.2-2.6-5.4 0-8.4z" />
        <path d="M5 14h22l-3 5H8z" />
        <path d="M14.5 19h3v14h-3z" />
        <path d="M10 33h12l2 4H8z" />
        <path d="M5 37h22l3 8H2z" />
      </g>
      <path className="lamp-flame" d="M16 6c1.2 1.6 1.6 2.6 0 4.2-1.6-1.6-1.2-2.6 0-4.2z" fill="#fff" />
    </svg>
  );
}

/** Memorial candle with a glowing flame (the glow shows in the digital preview only). */
function Candle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 48" className="h-12 w-6" strokeLinejoin="round">
      <defs>
        <radialGradient id="candle-glow"><stop offset="0" stopColor="#fbbf24" stopOpacity="0.9" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="12" cy="9" r="9" fill="url(#candle-glow)" className="print:hidden" />
      <g stroke="#fff" strokeWidth="3" paintOrder="stroke" fill="#000">
        <path d="M12 2c2.4 3 3 5.6 0 8.6-3-3-2.4-5.6 0-8.6z" />
        <path d="M11.4 10h1.2v4h-1.2z" />
        <rect x="6" y="14" width="12" height="26" rx="1" />
        <path d="M3 40h18v4H3z" />
      </g>
      <path d="M12 5c1 1.6 1.4 2.8 0 4.2-1.4-1.4-1-2.6 0-4.2z" fill="#fbbf24" />
    </svg>
  );
}

/** 4×5 cm portrait (aspect 4:5) with the chosen accent. Overflow stays visible so ornaments can sit on the frame. */
function Frame({ url, round, accent, crop, onCrop, onPhoto, scale = 1 }: { scale?: number; url?: string; round: boolean; accent: FrameAccent; crop: { zoom: number; x: number; y: number }; onCrop?: (c: { zoom: number; x: number; y: number }) => void; onPhoto?: (f: FileMeta) => void }) {
  const W = Math.round(96 * scale), H = Math.round((round ? 96 : 120) * scale); // px; a 4×5 cm print area at preview scale
  const pad = accent === "garland" ? 12 : 4;
  const interactive = !!(onCrop && onPhoto);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const upload = useArtworkUpload((f) => { if (f) onPhoto?.(f); });
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y, moved: false };
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !onCrop || !url) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const r = e.currentTarget.getBoundingClientRect(); // screen size, so it also works when the preview is scaled
    // Dragging the photo right means showing more of its left side: the focus point moves the other way.
    onCrop({ ...crop, x: clamp(d.cx - (dx / r.width) * 100), y: clamp(d.cy - (dy / r.height) * 100) });
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) input.current?.click(); // a plain click replaces the photo
  };
  const pick = (file?: File) => {
    if (!file || !onPhoto || !/\.(jpe?g|png)$/i.test(file.name) || file.size > 15 * 1024 * 1024) return;
    const meta: FileMeta = { name: file.name, size: file.size, type: file.type, previewUrl: URL.createObjectURL(file) };
    onPhoto(meta);
    upload.start(file, meta); // calls onPhoto again with the Supabase URL attached
  };

  return (
    <div className="relative shrink-0 overflow-visible" style={{ width: W + pad * 2, height: H + pad * 2, padding: pad }} aria-hidden={!url && !interactive}>
      <div
        className={cn("group/photo relative h-full w-full overflow-hidden border-2 border-[#0F172A] bg-zinc-100", round && "rounded-full", interactive && "cursor-grab touch-none active:cursor-grabbing")}
        {...(interactive ? { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: () => { drag.current = null; }, role: "button", tabIndex: 0, "aria-label": url ? "Drag to reposition the photo, click to replace it" : "Click to add a photo", onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") input.current?.click(); } } : {})}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Portrait of the deceased" draggable={false} className="pointer-events-none h-full w-full object-cover grayscale" style={cropStyle(crop)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">{interactive ? <>Click to add<br />photo</> : <>Photo<br />4×5 cm</>}</div>
        )}
        {interactive && url && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[8px] font-bold text-white opacity-0 transition-opacity group-hover/photo:opacity-100">Drag · click to replace</span>}
      </div>
      {interactive && <input ref={input} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />}
      {accent === "garland" && <Garland round={round} w={W + pad * 2} h={H + pad * 2} />}
      {(accent === "lamp" || accent === "candle") && (
        <span className="pointer-events-none absolute right-[-8px] bottom-0">{accent === "lamp" ? <Lamp /> : <Candle />}</span>
      )}
    </div>
  );
}

/** Flower strip for the traditional border (black outlines, white petals, so it prints in mono). */
export function FloralBand({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("block h-3.5 w-full", className)} preserveAspectRatio="none">
      <defs>
        <pattern id="floral-band" width="18" height="14" patternUnits="userSpaceOnUse">
          <g transform="translate(9 7)" stroke="#000" strokeWidth="0.8" fill="#fff">
            {[0, 72, 144, 216, 288].map((r) => <circle key={r} cx={0} cy={-2.6} r={2} transform={`rotate(${r})`} />)}
            <circle r="1.3" fill="#000" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#floral-band)" />
    </svg>
  );
}

function Cross({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 22" className={cn("h-5 w-3.5", className)}>
      <path d="M6.5 0h3v6h6v3h-6v13h-3V9h-6V6h6z" fill="#000" />
    </svg>
  );
}

/** Border frame around the whole notice: traditional floral bands, Christian cross, or a minimal rule. */
function NoticeFrame({ style, children }: { style: "traditional" | "christian" | "minimal"; children: React.ReactNode }) {
  // The frame grows to the height it is given (the print box) and centres its content, so a short notice sits balanced in it.
  if (style === "minimal") return <div className="flex flex-1 flex-col justify-center border border-[#0F172A] p-3">{children}</div>;
  if (style === "christian") {
    return (
      <div className="flex flex-1 flex-col border-[3px] border-double border-[#0F172A] p-1">
        <div className="flex flex-1 flex-col justify-center border border-[#0F172A] p-3 pt-2">
          <div className="mb-1 flex justify-center"><Cross /></div>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col border-2 border-[#0F172A] p-1">
      <FloralBand />
      <div className="flex flex-1 flex-col justify-center border-x border-[#0F172A] px-3 py-2">{children}</div>
      <FloralBand />
    </div>
  );
}

/**
 * Live Kerala-broadsheet preview of an obituary or remembrance. `bare` renders just the notice
 * (no caption or width cap) so the to-scale print preview can place it inside the exact ad box.
 */
export function ObituaryPreview({ state, bare = false, editable = false, inlineText = false }: { state: BookingState; bare?: boolean; editable?: boolean; inlineText?: boolean }) {
  const { update } = useBooking();
  const f = { ...DEFAULT_OBITUARY, ...state.obituary, kind: state.categoryId === "remembrance" ? ("anniversary" as const) : ("demise" as const) };
  const anniv = f.kind === "anniversary";
  const isText = state.adType === "classified-text";
  const textPx = { sm: 11, md: 13, lg: 16 }[state.textStyle?.size ?? "md"];
  const align = { left: "text-left", center: "text-center", justify: "text-justify" }[state.textStyle?.align ?? "justify"];
  const commit = (n: number) => (v: string) => update({ text: replaceLine(state.text, n, v) });
  const heading = HEADING_STYLES.find((h) => h.id === f.headingStyle) ?? HEADING_STYLES[0];

  const all = state.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = all[0];
  const hasFooter = all.length > 1 && all[all.length - 1].startsWith("ഓർമ്മകളോടെ");
  const footer = hasFooter ? all[all.length - 1] : null;
  const body = all.slice(1, hasFooter ? -1 : undefined);
  const prayerLines = new Set(f.prayer.split("\n").map((l) => l.trim()).filter(Boolean));
  const prayer = prayerLines.size > 0;

  const showPhoto = !isText;
  const narrow = !isText && (state.display.widthCm ?? state.display.columns * 4) < 6; // a ~1 column box stacks the portrait on top

  const notice = (
    <div className="paper-grain flex flex-1 flex-col bg-[#faf8f5] p-2 text-zinc-950" style={SERIF}>
      {!header ? (
        <p className="py-6 text-center text-sm text-zinc-400 italic">Your notice appears here as you fill the form…</p>
      ) : (
        <NoticeFrame style={isText ? "minimal" : f.frameStyle}>
          <h4 className="flex items-center justify-center gap-2 border-b border-[#0F172A] pb-1.5 text-center text-lg leading-snug" style={{ fontFamily: heading.family, fontWeight: heading.weight, letterSpacing: heading.spacing }}>
            {anniv && <Flame className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
            {inlineText ? <EditableLine value={header} onCommit={commit(0)} /> : header}
            {anniv && <Flame className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
          </h4>
          <div className={cn("mt-2", showPhoto ? (narrow ? "flex flex-col items-center gap-3" : "flow-root") : "block")}>
            {showPhoto && (narrow ? <Frame url={state.artwork?.previewUrl} round={f.photoFrame === "round"} accent={f.frameAccent} scale={f.photoScale ?? 1} crop={f.photoCrop} onCrop={editable ? (c) => update({ obituary: { ...f, photoCrop: c } }) : undefined} onPhoto={editable ? (file) => update(file.url ? { artwork: file } : { artwork: file, obituary: { ...f, photoCrop: { zoom: 1, x: 50, y: 50 } } }) : undefined} /> : <div className="float-left mr-3 mb-1"><Frame url={state.artwork?.previewUrl} round={f.photoFrame === "round"} accent={f.frameAccent} scale={f.photoScale ?? 1} crop={f.photoCrop} onCrop={editable ? (c) => update({ obituary: { ...f, photoCrop: c } }) : undefined} onPhoto={editable ? (file) => update(file.url ? { artwork: file } : { artwork: file, obituary: { ...f, photoCrop: { zoom: 1, x: 50, y: 50 } } }) : undefined} /></div>)}
            {/* The portrait floats left: the first lines sit beside it and the rest run the full width, so text never gets squeezed into a narrow column. */}
            <div lang="ml" className={cn("min-w-0 space-y-1.5 leading-[1.7] hyphens-auto [overflow-wrap:anywhere] [text-wrap:pretty]", narrow && "w-full", showPhoto && !narrow && align === "text-justify" ? "text-left" : align)} style={{ fontSize: textPx }}>
              {body.map((p, i) => {
                const cls = cn(prayerLines.has(p) && "text-center font-semibold italic", !prayer && anniv && i === body.length - 1 && "text-center font-semibold italic");
                return inlineText ? <EditableLine key={i} value={p} onCommit={commit(i + 1)} className={cls} /> : <p key={i} className={cls}>{p}</p>;
              })}
            </div>
          </div>
          {footer && (inlineText
            ? <EditableLine value={footer} onCommit={commit(all.length - 1)} className="mt-2 border-t border-[#0F172A] pt-1 text-right text-[13px] font-bold italic" />
            : <p className="mt-2 border-t border-[#0F172A] pt-1 text-right text-[13px] font-bold italic">{footer}</p>)}
        </NoticeFrame>
      )}
    </div>
  );

  if (bare) return notice;
  return (
    <figure aria-label="Obituary preview" className="mx-auto w-full" style={{ maxWidth: narrow ? 240 : 384 }}>
      <div className="border-2 border-[#0F172A] shadow-sm">{notice}</div>
      <PreviewCaption state={state} />
    </figure>
  );
}

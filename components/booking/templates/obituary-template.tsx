"use client";

import { Flame } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { BOX_SIZES, composeObituary, DEFAULT_OBITUARY, FRAME_ACCENTS, MILESTONES, OBITUARY_PRESETS, PREFIXES, TRIBUTES, tributeText, type FrameAccent, type ObituaryFields, type ObituaryKind } from "@/data/obituary";
import { useBooking, type BookingState } from "@/lib/booking-store";
import { cn } from "@/lib/utils";
import { PreviewCaption } from "./preview-caption";

const SERIF = { fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' };
const chip = "rounded border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-500";

/**
 * Composer for the obituary category: pick Marana Vartha (death notice) or Death Anniversary
 * (In Memoriam), fill the fields, and the print text is generated into the ad text.
 * The portrait is the ad's artwork upload (classified display / box ads).
 */
export function ObituaryComposer({ onText, onSize }: { onText: (text: string) => void; onSize: (columns: number, heightCm: number) => void }) {
  const { state, update } = useBooking();
  // The category decides the notice type: Obituary = death notice, Remembrance = death anniversary.
  const kind: ObituaryKind = state.categoryId === "remembrance" ? "anniversary" : "demise";
  const f = { ...DEFAULT_OBITUARY, ...state.obituary, kind }; // merge keeps older saved drafts valid
  const isText = state.adType === "classified-text";
  const anniv = kind === "anniversary";

  const apply = (next: ObituaryFields) => {
    update({ obituary: next });
    onText(composeObituary(next));
  };
  const set = (patch: Partial<ObituaryFields>) => apply({ ...f, ...patch });
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

      <div role="group" aria-label="Quick drafts" className="flex flex-wrap gap-2">
        {OBITUARY_PRESETS.filter((p) => p.kind === kind).map((p) => (
          <button key={p.id} type="button" title={p.description} className={cn(chip, "border-navy-300 bg-white text-navy-800 hover:bg-navy-50 dark:bg-[#0F1D3D] dark:text-white")}
            onClick={() => { apply({ ...p.build(new Date()), kind }); if (p.adType !== state.adType && (p.adType === "classified-text" || isText)) update({ adType: p.adType }); }}>
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
            <Textarea id="ob-tribute" rows={3} aria-label="Tribute verse" className="font-clipping" value={f.tribute} onChange={(e) => set({ tribute: e.target.value })} />
          </div>
          <Field id="ob-family" label="Remembered by · ഓർമ്മകളോടെ" hint="Spouse, children, grandchildren, relatives & friends · ഭാര്യ/ഭർത്താവ്, മക്കൾ, കൊച്ചുമക്കൾ, ബന്ധുമിത്രാദികൾ" className="sm:col-span-2">
            <Textarea id="ob-family" rows={2} className="font-clipping" value={f.family} onChange={(e) => set({ family: e.target.value })} />
          </Field>
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
          <Field id="ob-family" label="Surviving family · ബന്ധുക്കൾ" hint="Spouse, children, in-laws · ഭാര്യ/ഭർത്താവ്, മക്കൾ, മരുമക്കൾ" className="sm:col-span-2">
            <Textarea id="ob-family" rows={2} className="font-clipping" value={f.family} onChange={(e) => set({ family: e.target.value })} />
          </Field>
          <Field id="ob-contact" label="Contact number(s) · ഫോൺ" className="sm:col-span-2"><Input id="ob-contact" inputMode="tel" {...input("contact")} /></Field>
        </div>
      )}

      <fieldset className="space-y-3 border-t border-zinc-300 pt-4 dark:border-[#1F2F57]">
        <legend className="text-sm font-bold">Photo &amp; box · ഫോട്ടോ</legend>
        {isText ? (
          <p className="text-xs text-zinc-600 dark:text-slate-200">
            Photos are printed in Classified Display (box) ads.{" "}
            <button type="button" className="font-semibold text-navy-700 underline" onClick={() => update({ adType: "classified-display" })}>Switch to Classified Display</button>
          </p>
        ) : (
          <>
            <p className="text-xs text-zinc-600 dark:text-slate-200">Upload the portrait in the Artwork box below; it appears in the preview.</p>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Photo frame">
              {(["round", "rect"] as const).map((fr) => (
                <button key={fr} type="button" aria-pressed={f.photoFrame === fr} onClick={() => set({ photoFrame: fr })} className={cn(chip, f.photoFrame === fr ? "border-navy-700 bg-navy-50 text-navy-900" : "border-zinc-300 bg-white dark:bg-[#0F1D3D]")}>
                  {fr === "round" ? "Circular frame" : "Rectangular frame"}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Frame accent" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FRAME_ACCENTS.map((a) => (
                <button key={a.id} type="button" role="radio" aria-checked={f.frameAccent === a.id} onClick={() => set({ frameAccent: a.id })}
                  className={cn("rounded border px-2 py-2 text-center text-xs font-semibold focus-visible:outline-2 focus-visible:outline-navy-500", f.frameAccent === a.id ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}>
                  {a.ml}<span className="block font-normal text-zinc-500">{a.en}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Box size presets">
              <span className="text-xs font-semibold text-zinc-600">Box size:</span>
              {BOX_SIZES.map((b) => (
                <button key={b.label} type="button" onClick={() => onSize(b.columns, b.heightCm)} className={cn(chip, "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}>{b.label}</button>
              ))}
            </div>
          </>
        )}
      </fieldset>
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
function Frame({ url, round, accent }: { url?: string; round: boolean; accent: FrameAccent }) {
  const W = 96, H = round ? 96 : 120; // px; a 4×5 cm print area at preview scale
  const pad = accent === "garland" ? 12 : 4;
  return (
    <div className="relative shrink-0 overflow-visible" style={{ width: W + pad * 2, height: H + pad * 2, padding: pad }} aria-hidden={!url}>
      <div className={cn("h-full w-full overflow-hidden border-2 border-[#0F172A] bg-zinc-100", round && "rounded-full")}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Portrait of the deceased" className="h-full w-full object-cover grayscale" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">Photo<br />4×5 cm</div>
        )}
      </div>
      {accent === "garland" && <Garland round={round} w={W + pad * 2} h={H + pad * 2} />}
      {(accent === "lamp" || accent === "candle") && (
        <span className="pointer-events-none absolute right-[-8px] bottom-0">{accent === "lamp" ? <Lamp /> : <Candle />}</span>
      )}
    </div>
  );
}

/** Live Kerala-broadsheet preview of an obituary or remembrance, with line count and cost estimate. */
export function ObituaryPreview({ state }: { state: BookingState }) {
  const f = { ...DEFAULT_OBITUARY, ...state.obituary, kind: state.categoryId === "remembrance" ? ("anniversary" as const) : ("demise" as const) };
  const anniv = f.kind === "anniversary";
  const isText = state.adType === "classified-text";

  const all = state.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = all[0];
  const hasFooter = all.length > 1 && all[all.length - 1].startsWith("ഓർമ്മകളോടെ");
  const footer = hasFooter ? all[all.length - 1] : null;
  const body = all.slice(1, hasFooter ? -1 : undefined);

  const showPhoto = !isText;
  const oneCol = !isText && state.display.columns === 1; // a single column is ~one photo wide, so the portrait sits top-centre

  return (
    <figure aria-label="Obituary preview" className="mx-auto w-full" style={{ maxWidth: !isText && state.display.columns === 1 ? 240 : !isText && state.display.columns === 2 ? 340 : 384 }}>
      {/* paper-grain keeps the cutting light newsprint (and restores the light zinc scale inside it) in dark mode too */}
      <div className="paper-grain border-2 border-[#0F172A] bg-[#faf8f5] p-4 text-zinc-950 shadow-sm" style={SERIF}>
        {!header ? (
          <p className="py-6 text-center text-sm text-zinc-400 italic">Your notice appears here as you fill the form…</p>
        ) : (
          <>
            <h4 className="flex items-center justify-center gap-2 border-b border-[#0F172A] pb-1.5 text-center text-lg leading-snug font-extrabold">
              {anniv && <Flame className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
              {header}
              {anniv && <Flame className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
            </h4>
            <div className={cn("mt-2 gap-3", showPhoto ? (oneCol ? "flex flex-col items-center" : "flex items-start") : "block")}>
              {showPhoto && <Frame url={state.artwork?.previewUrl} round={f.photoFrame === "round"} accent={f.frameAccent} />}
              <div className="min-w-0 flex-1 space-y-1.5 text-[13px] leading-[1.7] text-justify">
                {body.map((p, i) => <p key={i} className={cn(anniv && i === body.length - 1 && "text-center font-semibold italic")}>{p}</p>)}
              </div>
            </div>
            {footer && <p className="mt-2 border-t border-[#0F172A] pt-1 text-right text-[13px] font-bold italic">{footer}</p>}
          </>
        )}
      </div>
      <PreviewCaption state={state} />
    </figure>
  );
}

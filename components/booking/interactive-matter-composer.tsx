"use client";

import { RefreshCw, User } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { composeObituary, DEFAULT_OBITUARY } from "@/data/obituary";
import { composeTender, DEFAULT_TENDER } from "@/data/tender";
import { useBooking } from "@/lib/booking-store";
import { cn } from "@/lib/utils";

/**
 * Final print matter: the exact copy that goes to print (stored as the booking's ad text). Starts from the form-generated
 * wording but can be rewritten freely: split into paragraphs, delete or rephrase anything, independent of the form fields.
 */
export function InteractiveMatterComposer({ value, onChange, chars, words, lines, charsPerLine, showPhoto }: {
  value: string;
  onChange: (text: string) => void;
  chars: number;
  words: number;
  lines: number;
  charsPerLine: number;
  /** Classified display ads with a portrait: show it beside the matter. */
  showPhoto: boolean;
}) {
  const { state } = useBooking();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [confirming, setConfirming] = useState(false);
  const ob = { ...DEFAULT_OBITUARY, ...state.obituary, kind: state.categoryId === "remembrance" ? ("anniversary" as const) : ("demise" as const) };
  const generator =
    (state.categoryId === "obituary" || state.categoryId === "remembrance") && state.obituary ? () => composeObituary(ob)
    : state.categoryId === "tender" && state.tender ? () => composeTender({ ...DEFAULT_TENDER, ...state.tender })
    : null;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  }, [value]);

  const photo = state.artwork?.previewUrl ?? state.artwork?.url;
  const round = ob.photoFrame === "round";
  const frame = ob.frameStyle === "christian" ? "border-[3px] border-double" : ob.frameStyle === "minimal" ? "border" : "border-2 ring-2 ring-offset-2 ring-stone-400";

  return (
    <section aria-labelledby="matter-h" className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-white/15 dark:bg-[#0F1D3D]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="matter-h" className="font-bold">ഫൈനൽ പ്രിന്റ് ലേഔട്ടും മാറ്ററും / Final Print Layout &amp; Matter</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">പത്രത്തിൽ അച്ചടിക്കുന്ന വിധത്തിലുള്ള മാറ്റർ ഇവിടെ കാണാം. ആവശ്യാനുസരണം മാറ്റങ്ങൾ വരുത്താം (Edit freely as paragraphs or full text).</p>
        </div>
        {generator && (
          <button type="button" aria-expanded={confirming} onClick={() => { if (!value.trim() || value === generator()) onChange(generator()); else setConfirming(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-100 dark:border-white/20 dark:hover:bg-white/10">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Auto-Format / Sync from Form
          </button>
        )}
      </div>

      {confirming && generator && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100">
          <span className="font-semibold">Replace your edited text with wording generated from the form?</span>
          <button type="button" onClick={() => { onChange(generator()); setConfirming(false); }} className="rounded-md bg-stone-900 px-3 py-1 text-xs font-bold text-white hover:bg-stone-800">Yes, replace</button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-stone-400 px-3 py-1 text-xs font-bold hover:bg-white/60">Cancel</button>
        </div>
      )}

      <div className="mt-4 rounded-lg border-2 border-stone-300 bg-[#fdfdfb] p-5 shadow-inner">
        <div className={cn("gap-4", showPhoto ? "flex flex-col items-center sm:flex-row sm:items-start" : "block")}>
          {showPhoto && (
            <div className={cn("flex shrink-0 items-center justify-center overflow-hidden border-stone-800 bg-stone-100", frame, round ? "h-24 w-24 rounded-full" : "h-[120px] w-24")}>
              {photo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photo} alt="Uploaded portrait" className="h-full w-full object-cover grayscale" />
                : <User className="h-10 w-10 text-stone-400" aria-label="No photo yet" />}
            </div>
          )}
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Final ad matter as it will print"
            placeholder="Your ad copy appears here. Edit it freely: write paragraphs, delete or rephrase anything."
            spellCheck={false}
            className="min-h-[120px] w-full flex-1 resize-none bg-transparent font-serif text-[15px] leading-relaxed text-stone-900 outline-none placeholder:text-stone-400"
            style={{ fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", Georgia, serif' }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300" aria-live="polite">
        {chars} characters · {words} words · ≈ {lines} print lines at {charsPerLine} characters per line. This text is what is printed and saved with your booking.
      </p>
    </section>
  );
}

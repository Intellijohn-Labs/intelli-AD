"use client";

import type { ReactNode } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BOX_SIZES } from "@/data/obituary";
import { composeTender, DEFAULT_TENDER, fmtTenderDeadline, TENDER_HEADER, type TenderFields } from "@/data/tender";
import { useBooking, type BookingState } from "@/lib/booking-store";
import { cn } from "@/lib/utils";
import { PreviewCaption } from "./preview-caption";

const SERIF = { fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' };
const chip = "rounded border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-500";

/**
 * Composer for the Tender Notice category (ദർഘാസ് പരസ്യം). The form writes the print text; the logo slot
 * (passed in by the compose step) is the ad's artwork, so a notice with a logo is billed as a display ad by size.
 */
export function TenderComposer({ logoSlot, onText, onSize }: { logoSlot: ReactNode; onText: (text: string) => void; onSize: (columns: number, heightCm: number) => void }) {
  const { state, update } = useBooking();
  const f: TenderFields = { ...DEFAULT_TENDER, ...state.tender };
  const isText = state.adType === "classified-text";

  const set = (patch: Partial<TenderFields>) => {
    const next = { ...f, ...patch };
    update({ tender: next });
    onText(composeTender(next));
  };
  const input = (key: keyof TenderFields) => ({ value: f[key] as string, onChange: (e: { target: { value: string } }) => set({ [key]: e.target.value } as Partial<TenderFields>) });

  return (
    <section aria-labelledby="tender-h" className="space-y-5 rounded-md border border-zinc-300 bg-zinc-50/70 p-4 sm:p-5 dark:border-[#1F2F57] dark:bg-slate-800/40">
      <div>
        <h3 id="tender-h" className="font-bold text-zinc-900 dark:text-white">Tender Notice · ദർഘാസ് പരസ്യം</h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-slate-200">Fill in the details and the notice is written for you. You can still edit the generated text below.</p>
      </div>

      <div className="space-y-2">
        {logoSlot}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Logo shape">
          <span className="text-xs font-semibold text-zinc-600">Logo preview:</span>
          {(["square", "round"] as const).map((sh) => (
            <button key={sh} type="button" aria-pressed={f.logoShape === sh} onClick={() => set({ logoShape: sh })} className={cn(chip, f.logoShape === sh ? "border-navy-700 bg-navy-50 text-navy-900" : "border-zinc-300 bg-white dark:bg-[#0F1D3D]")}>
              {sh === "square" ? "Square" : "Circular"}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600 dark:text-slate-200">
          {isText ? "Adding a logo moves the notice to Classified Display, billed by size (cm²) instead of by line." : "Billed as Classified Display, by size (cm²)."}
          {!isText && (
            <> <button type="button" className="font-semibold text-navy-700 underline" onClick={() => update({ adType: "classified-text" })}>Switch back to a text ad</button></>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="td-org" label="Authority / department name · സ്ഥാപനത്തിന്റെ പേര്" required className="sm:col-span-2" hint="e.g. കേരള പൊതുമരാമത്ത് വകുപ്പ്, ഗ്രാമപഞ്ചായത്ത്, ലിമിറ്റഡ് കമ്പനി"><Input id="td-org" {...input("org")} /></Field>
        <Field id="td-ref" label="Tender number · ദർഘാസ് നമ്പർ" required><Input id="td-ref" {...input("ref")} /></Field>
        <Field id="td-pac" label="PAC / estimate · അടങ്കൽ തുക"><Input id="td-pac" inputMode="decimal" placeholder="5,00,000" {...input("pac")} /></Field>
        <Field id="td-desc" label="Work / procurement title & details · പ്രവൃത്തിയുടെ പേര്" required className="sm:col-span-2">
          <Textarea id="td-desc" rows={3} className="font-clipping" {...input("description")} />
        </Field>
        <Field id="td-emd" label="EMD · നിരതദ്രവ്യം"><Input id="td-emd" inputMode="decimal" {...input("emd")} /></Field>
        <Field id="td-fee" label="Tender document fee · ദർഘാസ് ഫോറത്തിന്റെ വില"><Input id="td-fee" inputMode="decimal" {...input("fee")} /></Field>
        <Field id="td-date" label="Last date · അവസാന തീയതി" required><Input id="td-date" type="date" {...input("lastDate")} /></Field>
        <Field id="td-time" label="Last time · സമയം"><Input id="td-time" type="time" {...input("lastTime")} /></Field>
        <Field id="td-contact" label="Officer / authority contact · വിശദവിവരങ്ങൾക്ക്"><Input id="td-contact" {...input("contact")} /></Field>
        <Field id="td-web" label="Official website · വെബ്സൈറ്റ്"><Input id="td-web" inputMode="url" placeholder="www.example.gov.in" {...input("website")} /></Field>
      </div>

      {!isText && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-300 pt-4 dark:border-[#1F2F57]" role="group" aria-label="Box size presets">
          <span className="text-xs font-semibold text-zinc-600">Box size:</span>
          {BOX_SIZES.map((b) => (
            <button key={b.label} type="button" onClick={() => onSize(b.columns, b.heightCm)} className={cn(chip, "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#0F1D3D]")}>{b.label}</button>
          ))}
        </div>
      )}
    </section>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <tr className="align-top">
    <th scope="row" className="w-[42%] border border-[#0F172A] px-2 py-1 text-left font-bold">{k}</th>
    <td className="border border-[#0F172A] px-2 py-1">{v}</td>
  </tr>
);

/** Kerala government-style tender broadsheet notice: double-line frame, logo + bold header, tabular particulars. */
export function TenderPreview({ state }: { state: BookingState }) {
  const f: TenderFields = { ...DEFAULT_TENDER, ...state.tender };
  const isText = state.adType === "classified-text";
  const logo = state.artwork?.previewUrl;
  const round = f.logoShape === "round";
  const width = isText ? 400 : state.display.columns === 1 ? 300 : state.display.columns === 2 ? 360 : 420;
  const contact = [f.contact.trim(), f.website.trim()].filter(Boolean).join(", ");

  return (
    <figure aria-label="Tender notice preview" className="mx-auto w-full" style={{ maxWidth: width }}>
      {/* Outer + inner rules make the classic double-line frame. paper-grain keeps it light newsprint in dark mode. */}
      <div className="paper-grain border-2 border-[#0F172A] bg-[#faf8f5] p-1 text-zinc-950 shadow-sm" style={SERIF}>
        <div className="border border-[#0F172A] p-3">
          <div className="flex items-center justify-center gap-3 border-b-2 border-double border-[#0F172A] pb-2">
            {(logo || !isText) && (
              <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-[#0F172A] bg-white text-center text-[9px] leading-tight text-zinc-500", round && "rounded-full")}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Organisation logo" className="h-full w-full object-contain p-0.5" />
                ) : (
                  "LOGO"
                )}
              </div>
            )}
            <div className="text-center">
              <p className="text-lg leading-tight font-extrabold">ദർഘാസ് പരസ്യം</p>
              <p className="text-xs font-bold tracking-[0.25em]">TENDER NOTICE</p>
            </div>
          </div>
          <p className="mt-2 text-center text-sm font-bold">{f.org.trim() || "[സ്ഥാപനത്തിന്റെ പേര്]"}</p>
          <p className="mt-1.5 text-justify text-[13px] leading-[1.7]">{f.description.trim() || "[ജോലിയുടെ / സാമഗ്രികളുടെ വിവരണം]"}</p>
          <table className="mt-2 w-full border-collapse text-[12.5px] leading-snug">
            <tbody>
              <Row k="ടെൻഡർ നമ്പർ" v={f.ref.trim() || "[ടെൻഡർ നമ്പർ]"} />
              {f.pac.trim() && <Row k="അടങ്കൽ തുക (PAC)" v={f.pac.trim()} />}
              {f.emd.trim() && <Row k="നിരതദ്രവ്യം (EMD)" v={f.emd.trim()} />}
              {f.fee.trim() && <Row k="ദർഘാസ് ഫോറത്തിന്റെ വില" v={f.fee.trim()} />}
              <Row k="അവസാന തീയതിയും സമയവും" v={fmtTenderDeadline(f)} />
            </tbody>
          </table>
          <p className="mt-2 border-t border-[#0F172A] pt-1 text-[12.5px] font-semibold">വിശദവിവരങ്ങൾക്ക്: {contact || "[ഫോൺ / വെബ്സൈറ്റ്]"}</p>
        </div>
      </div>
      <PreviewCaption state={state} />
    </figure>
  );
}

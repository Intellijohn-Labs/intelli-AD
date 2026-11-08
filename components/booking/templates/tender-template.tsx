"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { composeTender, DEFAULT_TENDER, fmtTenderDeadline, type TenderFields, type TenderItem } from "@/data/tender";
import { useBooking, type BookingState } from "@/lib/booking-store";
import { cn } from "@/lib/utils";
import { ParagraphField } from "../paragraph-field";
import { PreviewCaption } from "./preview-caption";

const SERIF = { fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' };
const chip = "rounded border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-navy-500";

/**
 * Composer for the Tender Notice category (ദർഘാസ് പരസ്യം). The form writes the print text; the logo slot
 * (passed in by the compose step) is the ad's artwork, so a notice with a logo is billed as a display ad by size.
 */
export function TenderComposer({ logoSlot, onText }: { logoSlot: ReactNode; onText: (text: string) => void }) {
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

      {!isText && (
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
        <p className="text-xs text-zinc-600 dark:text-slate-200">Billed as Classified Display, by size (cm²).</p>
      </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="td-org" label="Authority / department name · സ്ഥാപനത്തിന്റെ പേര്" required className="sm:col-span-2" hint="e.g. കേരള പൊതുമരാമത്ത് വകുപ്പ്, ഗ്രാമപഞ്ചായത്ത്, ലിമിറ്റഡ് കമ്പനി"><Input id="td-org" {...input("org")} /></Field>
        <Field id="td-ref" label="Tender number · ദർഘാസ് നമ്പർ" required><Input id="td-ref" {...input("ref")} /></Field>
        <Field id="td-pac" label="PAC / estimate · അടങ്കൽ തുക"><Input id="td-pac" inputMode="decimal" placeholder="5,00,000" {...input("pac")} /></Field>
        <ParagraphField id="td-desc" label="Work / procurement title & details · പ്രവൃത്തിയുടെ പേര്" required className="sm:col-span-2" rows={4} maxHeight={320} value={f.description} onChange={(v) => set({ description: v })} placeholder="വിശദമായ ടെൻഡർ വിവരങ്ങളും നിബന്ധനകളും ഇവിടെ നൽകുക..." textClassName="font-clipping" />
        <Field id="td-emd" label="EMD · നിരതദ്രവ്യം"><Input id="td-emd" inputMode="decimal" {...input("emd")} /></Field>
        <Field id="td-fee" label="Tender document fee · ദർഘാസ് ഫോറത്തിന്റെ വില"><Input id="td-fee" inputMode="decimal" {...input("fee")} /></Field>
        <Field id="td-date" label="Last date · അവസാന തീയതി" required><Input id="td-date" type="date" {...input("lastDate")} /></Field>
        <Field id="td-time" label="Last time · സമയം"><Input id="td-time" type="time" {...input("lastTime")} /></Field>
        <Field id="td-contact" label="Officer / authority contact · വിശദവിവരങ്ങൾക്ക്"><Input id="td-contact" {...input("contact")} /></Field>
        <Field id="td-web" label="Official website · വെബ്സൈറ്റ്"><Input id="td-web" inputMode="url" placeholder="www.example.gov.in" {...input("website")} /></Field>
      </div>

      {isText ? (
        <p className="border-t border-zinc-300 pt-4 text-xs text-zinc-600 dark:border-[#1F2F57] dark:text-slate-200">Booked as Classified Text: legal text lines billed per line, with no logo. Choose Classified Display in step 1 for a logo, item table and size-based pricing.</p>
      ) : (
        <>
      <fieldset className="space-y-3 border-t border-zinc-300 pt-4 dark:border-[#1F2F57]">
        <legend className="text-sm font-bold">Schedule of items · ഇനങ്ങൾ</legend>
        {f.items.length === 0 && <p className="text-xs text-zinc-600 dark:text-slate-200">Add rows for each work or item. They print as a ruled table.</p>}
        {f.items.map((it, i) => {
          const setItem = (patch: Partial<TenderItem>) => set({ items: f.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="grid grid-cols-[1fr_5.5rem_6.5rem_auto] items-end gap-2">
              <Field id={`ti-n-${i}`} label={i === 0 ? "Item / work" : ""}><Input id={`ti-n-${i}`} aria-label={`Item ${i + 1} name`} value={it.name} onChange={(e) => setItem({ name: e.target.value })} /></Field>
              <Field id={`ti-q-${i}`} label={i === 0 ? "Qty" : ""}><Input id={`ti-q-${i}`} aria-label={`Item ${i + 1} quantity`} value={it.qty} onChange={(e) => setItem({ qty: e.target.value })} /></Field>
              <Field id={`ti-a-${i}`} label={i === 0 ? "Est. ₹" : ""}><Input id={`ti-a-${i}`} aria-label={`Item ${i + 1} amount`} inputMode="decimal" value={it.amount} onChange={(e) => setItem({ amount: e.target.value })} /></Field>
              <button type="button" aria-label={`Remove item ${i + 1}`} onClick={() => set({ items: f.items.filter((_, j) => j !== i) })} className="mb-1 rounded p-2 text-zinc-500 hover:text-red-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          );
        })}
        {f.items.length < 8 && (
          <button type="button" onClick={() => set({ items: [...f.items, { name: "", qty: "", amount: "" }] })} className={cn(chip, "inline-flex items-center gap-1 border-navy-300 bg-white text-navy-800 hover:bg-navy-50 dark:bg-[#0F1D3D] dark:text-white")}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add item row
          </button>
        )}
      </fieldset>

      <fieldset className="space-y-3 border-t border-zinc-300 pt-4 dark:border-[#1F2F57]">
        <legend className="text-sm font-bold">Authorised signature &amp; seal · ഒപ്പും മുദ്രയും</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="td-sign" label="Signatory name · ഒപ്പിടുന്ന ഉദ്യോഗസ്ഥൻ"><Input id="td-sign" {...input("signatory")} /></Field>
          <Field id="td-desg" label="Designation · തസ്തിക"><Input id="td-desg" placeholder="സെക്രട്ടറി / എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ" {...input("designation")} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={f.seal} onChange={(e) => set({ seal: e.target.checked })} className="h-4 w-4 accent-[#E11D48]" />
          Reserve a seal / stamp zone beside the signature
        </label>
      </fieldset>
        </>
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

/** Kerala government-style tender notice. `bare` renders just the notice so the to-scale print preview can place it in the ad box. */
export function TenderPreview({ state, bare = false, editable = false }: { state: BookingState; bare?: boolean; editable?: boolean }) {
  const { update } = useBooking();
  const f: TenderFields = { ...DEFAULT_TENDER, ...state.tender };
  const isText = state.adType === "classified-text";
  const logo = state.artwork?.previewUrl;
  const round = f.logoShape === "round";
  const contact = [f.contact.trim(), f.website.trim()].filter(Boolean).join(", ");
  const items = isText ? [] : f.items.filter((i) => i.name.trim());
  const hasSign = !isText && (f.signatory.trim() || f.designation.trim() || f.seal);

  const notice = (
    // Outer + inner rules make the classic double-line frame. paper-grain keeps it light newsprint in dark mode.
    <div className="paper-grain border-2 border-[#0F172A] bg-[#faf8f5] p-1 text-zinc-950" style={SERIF}>
      <div className="border border-[#0F172A] p-3">
        <div className="flex items-center justify-center gap-3 border-b-2 border-double border-[#0F172A] pb-2">
          {(logo || !isText) && <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-[#0F172A] bg-white text-center text-[9px] leading-tight text-zinc-500", round && "rounded-full")}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Organisation logo" className="h-full w-full object-contain p-0.5" />
            ) : (
              "LOGO"
            )}
          </div>}
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
        {items.length > 0 && (
          <table className="mt-2 w-full border-collapse text-[12.5px] leading-snug" aria-label="Schedule of items">
            <thead>
              <tr className="bg-zinc-200/70">
                <th className="w-7 border border-[#0F172A] px-1 py-0.5">#</th>
                <th className="border border-[#0F172A] px-2 py-0.5 text-left">ഇനം</th>
                <th className="border border-[#0F172A] px-2 py-0.5">അളവ്</th>
                <th className="border border-[#0F172A] px-2 py-0.5 text-right">തുക (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="align-top">
                  <td className="border border-[#0F172A] px-1 py-0.5 text-center">{i + 1}</td>
                  <td className="border border-[#0F172A] px-2 py-0.5">{it.name}</td>
                  <td className="border border-[#0F172A] px-2 py-0.5 text-center">{it.qty}</td>
                  <td className="border border-[#0F172A] px-2 py-0.5 text-right">{it.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 border-t border-[#0F172A] pt-1 text-[12.5px] font-semibold">വിശദവിവരങ്ങൾക്ക്: {contact || "[ഫോൺ / വെബ്സൈറ്റ്]"}</p>
        {hasSign && (
          <div className={cn("mt-3 flex gap-3", f.sealPos === "center" ? "flex-col items-center" : f.sealPos === "right" ? "flex-row-reverse items-end justify-between" : "items-end justify-between")}>
            {f.seal ? (
              <button
                type="button"
                disabled={!editable}
                onClick={() => update({ tender: { ...f, sealPos: f.sealPos === "left" ? "center" : f.sealPos === "center" ? "right" : "left" } })}
                title={editable ? "Click to move the seal: left, centre or right" : undefined}
                aria-label={editable ? `Seal position: ${f.sealPos}. Click to move it.` : "Seal"}
                className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-zinc-500 text-center text-[9px] leading-tight text-zinc-500 disabled:cursor-default", editable && "cursor-pointer hover:border-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600")}
              >സീൽ<br />SEAL</button>
            ) : <span />}
            <div className="min-w-[45%] text-center text-[12.5px]">
              <div className="h-8 border-b border-[#0F172A]" aria-hidden="true" />
              <p className="mt-0.5 font-bold">{f.signatory.trim() || "[ഒപ്പ് / പേര്]"}</p>
              {f.designation.trim() && <p>{f.designation.trim()}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (bare) return notice;
  return (
    <figure aria-label="Tender notice preview" className="mx-auto w-full" style={{ maxWidth: 420 }}>
      <div className="shadow-sm">{notice}</div>
      <PreviewCaption state={state} />
    </figure>
  );
}

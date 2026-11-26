"use client";

import { Download, Eye, FileUp, Loader2, Plus, Send, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { CooldownPill } from "./cooldown-pill";
import { Input, Textarea } from "@/components/ui/field";
import { guestsFromCsv, newId, parseGuests, SAMPLE_GUESTS_CSV, validPhone, type Guest } from "@/lib/wedding";
import { cn } from "@/lib/utils";

/** Editable guest list: add / paste-import / edit / delete rows, per-row preview + Send via Waau Panel, and Pending / Queued / Sent status. */
export function GuestTable({ guests, onChange, busyId, onSend, onPreview, cooldownLeft, onReplied, readyIds }: {
  /** Guests whose card / video has already been generated (shown as "Ready to send"). */
  readyIds?: ReadonlySet<string>;
  guests: Guest[];
  /** The studio's setGuests: always called with an updater so an edit never overwrites status updates (or other edits) that landed since the last render. */
  onChange: React.Dispatch<React.SetStateAction<Guest[]>>;
  /** Id of the guest whose card is being rendered right now. */
  busyId: string | null;
  onSend: (g: Guest) => void;
  onPreview: (g: Guest) => void;
  /** Milliseconds until this guest's number may be sent to again (0 = now): the 2-per-15-minutes cooldown. */
  cooldownLeft: (phone: string) => number;
  /** The user confirmed this guest replied on WhatsApp (lifts the cooldown for that number). */
  onReplied: (phone: string) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [limit, setLimit] = useState(50); // long lists render a page at a time so 1,000+ guests stay responsive
  const shown = guests.slice(0, limit);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const patch = (id: string, p: Partial<Guest>) => onChange((cur) => cur.map((g) => (g.id === id ? { ...g, ...p } : g)));
  const downloadSample = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE_GUESTS_CSV], { type: "text/csv;charset=utf-8" }));
    a.download = "guest-list-sample.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("That file is over 3 MB. Split the list into smaller CSV files."); return; }
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) { toast.error("Upload a .csv file (in Excel: File > Save As > CSV)."); return; }
    const res = guestsFromCsv(await file.text(), guests);
    if (!res.added) { toast.error(`No new guests found${res.duplicates ? `: ${res.duplicates} duplicate number${res.duplicates === 1 ? "" : "s"}` : ""}${res.invalid ? `, ${res.invalid} without a valid number` : ""}.`); return; }
    onChange((cur) => [...cur, ...res.guests]);
    const skipped = [res.duplicates && `${res.duplicates} duplicate${res.duplicates === 1 ? "" : "s"}`, res.invalid && `${res.invalid} invalid`, res.truncated && "list capped at 5,000"].filter(Boolean).join(", ");
    toast(`Imported ${res.added} guest${res.added === 1 ? "" : "s"}${skipped ? ` (skipped ${skipped})` : ""}.`);
  };
  const importPaste = () => {
    const rows = parseGuests(paste);
    if (rows.length) onChange((cur) => [...cur, ...rows]);
    setPaste(""); setShowPaste(false);
  };

  const view = (g: Guest): Guest["status"] | "ready" => (g.status === "pending" && readyIds?.has(g.id) ? "ready" : g.status);
  const statusCls = (st: Guest["status"] | "ready") => cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap", st === "sent" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200" : st === "queued" ? "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200" : st === "failed" ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200" : st === "ready" ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200");
  const statusText = (st: Guest["status"] | "ready") => (st === "ready" ? "Ready to send" : st === "sent" ? "Sent via Waau Panel" : st === "queued" ? "Queued in Waau Panel" : st === "failed" ? "Failed" : "Pending");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onChange((cur) => [...cur, { id: newId(), name: "", place: "", phone: "", status: "pending" }])} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0B0D] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#17181C] dark:bg-[#D12014] dark:hover:bg-[#E83E32]"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add guest</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><FileUp className="h-3.5 w-3.5" aria-hidden="true" /> Bulk upload CSV</button>
        <button type="button" onClick={downloadSample} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Download sample CSV</button>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" aria-label="Upload a CSV guest list" onChange={(e) => { void importCsv(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => setShowPaste((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Upload className="h-3.5 w-3.5" aria-hidden="true" /> Paste / import many</button>
        {guests.length > 0 && <button type="button" onClick={() => { if (confirm("Remove every guest from the list?")) onChange([]); }} className="text-xs font-semibold text-slate-600 underline dark:text-slate-300">Clear all</button>}
      </div>
      {showPaste && (
        <div className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <label htmlFor="paste-guests" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">One guest per line: Name, Place, WhatsApp number (copy straight from Excel / Google Sheets)</label>
          <Textarea id="paste-guests" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"Suresh Kumar, Thrissur, 98470 12345\nMary Joseph, Kottayam, 9946012345"} />
          <button type="button" onClick={importPaste} disabled={!paste.trim()} className="mt-2 rounded-lg bg-[#D12014] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#A91400] disabled:opacity-50">Add these guests</button>
        </div>
      )}
      {guests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">No guests yet. Add rows or paste your list, then share each personalised card on WhatsApp.</p>
      ) : (
        <>
        <ul className="space-y-3 sm:hidden">
          {shown.map((g, i) => {
            const bad = g.phone.trim() !== "" && !validPhone(g.phone);
            const cd = cooldownLeft(g.phone);
            const disabled = busyId !== null || !g.name.trim() || !validPhone(g.phone) || g.status === "sent" || g.status === "queued" || cd > 0;
            return (
              <li key={g.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-300">Guest {i + 1}</span>
                  <span className={statusCls(view(g))}>{statusText(view(g))}</span>
                </div>
                {cd > 0 && <div className="mb-2"><CooldownPill leftMs={cd} onReplied={() => onReplied(g.phone)} /></div>}
                <div className="space-y-2">
                  <Input aria-label={`Guest ${i + 1} name`} placeholder="Guest name" value={g.name} onChange={(e) => patch(g.id, { name: e.target.value })} />
                  <Input aria-label={`Guest ${i + 1} place`} placeholder="Address / place" value={g.place} onChange={(e) => patch(g.id, { place: e.target.value })} />
                  <Input aria-label={`Guest ${i + 1} WhatsApp number`} inputMode="tel" className={cn(bad && "border-red-500")} value={g.phone} onChange={(e) => patch(g.id, { phone: e.target.value, status: "pending" })} placeholder="WhatsApp number, e.g. 98470 12345" aria-invalid={bad || undefined} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => onSend(g)} disabled={disabled} aria-label={`Send via Waau Panel to ${g.name || `guest ${i + 1}`}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-sm font-bold text-[#06371a] hover:brightness-95 disabled:opacity-40">{busyId === g.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} {g.status === "failed" ? "Retry" : "Send via Waau Panel"}</button>
                  <button type="button" onClick={() => onPreview(g)} aria-label={`Preview card for ${g.name || `guest ${i + 1}`}`} className="rounded-md border border-slate-300 p-2.5 text-slate-700 dark:border-slate-600 dark:text-slate-200"><Eye className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onChange((cur) => cur.filter((x) => x.id !== g.id))} aria-label={`Delete ${g.name || `guest ${i + 1}`}`} className="rounded-md border border-red-200 p-2.5 text-red-700 dark:border-red-500/30 dark:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto rounded-lg border border-slate-200 sm:block dark:border-slate-700">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr><th className="px-2 py-2">#</th><th className="px-2 py-2">Guest name</th><th className="px-2 py-2">Address / place</th><th className="px-2 py-2">WhatsApp number</th><th className="px-2 py-2">Status</th><th className="px-2 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {shown.map((g, i) => {
                const bad = g.phone.trim() !== "" && !validPhone(g.phone);
                const cd = cooldownLeft(g.phone);
                return (
                  <tr key={g.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-300">{i + 1}</td>
                    <td className="px-1 py-1"><Input aria-label={`Guest ${i + 1} name`} className="py-1.5" value={g.name} onChange={(e) => patch(g.id, { name: e.target.value })} /></td>
                    <td className="px-1 py-1"><Input aria-label={`Guest ${i + 1} place`} className="py-1.5" value={g.place} onChange={(e) => patch(g.id, { place: e.target.value })} /></td>
                    <td className="px-1 py-1"><Input aria-label={`Guest ${i + 1} WhatsApp number`} inputMode="tel" className={cn("py-1.5", bad && "border-red-500")} value={g.phone} onChange={(e) => patch(g.id, { phone: e.target.value, status: "pending" })} placeholder="98470 12345" aria-invalid={bad || undefined} /></td>
                    <td className="px-2 py-1.5">
                      <span className={statusCls(view(g))}>{statusText(view(g))}</span>
                    
                      {cd > 0 && <div className="mt-1"><CooldownPill leftMs={cd} onReplied={() => onReplied(g.phone)} /></div>}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => onPreview(g)} title="Preview / download this guest's card" aria-label={`Preview card for ${g.name || `guest ${i + 1}`}`} className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"><Eye className="h-4 w-4" /></button>
                        <button type="button" onClick={() => onSend(g)} disabled={busyId !== null || !g.name.trim() || !validPhone(g.phone) || g.status === "sent" || g.status === "queued" || cd > 0} title={cd > 0 ? "This number is in cooldown (max 2 per 24 hours). You can send again once the timer finishes, or after you confirm the guest replied." : !g.name.trim() ? "Enter the guest's name first" : !validPhone(g.phone) ? "Enter a valid WhatsApp number" : g.status === "sent" || g.status === "queued" ? "Already handed to Waau Panel" : "Send this guest's personalised card via Waau Panel"} aria-label={`Send via Waau Panel to ${g.name || `guest ${i + 1}`}`} className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-xs font-bold whitespace-nowrap text-[#06371a] hover:brightness-95 disabled:opacity-40">{busyId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />} {g.status === "failed" ? "Retry" : "Send via Waau Panel"}</button>
                        <button type="button" onClick={() => onChange((cur) => cur.filter((x) => x.id !== g.id))} aria-label={`Delete ${g.name || `guest ${i + 1}`}`} className="rounded-md p-1.5 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {guests.length > shown.length && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-200">
            <span>Showing {shown.length} of {guests.length} guests. All {guests.length} are included when you send.</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => setLimit((n) => n + 100)} className="rounded-md border border-slate-300 px-3 py-1 font-bold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">Show 100 more</button>
              <button type="button" onClick={() => setLimit(guests.length)} className="rounded-md border border-slate-300 px-3 py-1 font-bold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">Show all</button>
            </span>
          </div>
        )}
        </>
      )}
    </div>
  );
}

"use client";

import { Eye, Loader2, Plus, Send, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Input, Textarea } from "@/components/ui/field";
import { newId, parseGuests, validPhone, type Guest } from "@/lib/wedding";
import { cn } from "@/lib/utils";

/** Editable guest list: add / paste-import / edit / delete rows, per-row WhatsApp + preview, and Sent / Pending status. */
export function GuestTable({ guests, onChange, busyId, onSend, onPreview }: {
  guests: Guest[];
  onChange: (g: Guest[]) => void;
  /** Id of the guest whose card is being rendered right now. */
  busyId: string | null;
  onSend: (g: Guest) => void;
  onPreview: (g: Guest) => void;
}) {
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const patch = (id: string, p: Partial<Guest>) => onChange(guests.map((g) => (g.id === id ? { ...g, ...p } : g)));
  const importPaste = () => {
    const rows = parseGuests(paste);
    if (rows.length) onChange([...guests, ...rows]);
    setPaste(""); setShowPaste(false);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onChange([...guests, { id: newId(), name: "", place: "", phone: "", status: "pending" }])} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0B0D] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#17181C] dark:bg-[#D12014] dark:hover:bg-[#E83E32]"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add guest</button>
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
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr><th className="px-2 py-2">#</th><th className="px-2 py-2">Guest name</th><th className="px-2 py-2">Address / place</th><th className="px-2 py-2">WhatsApp number</th><th className="px-2 py-2">Status</th><th className="px-2 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {guests.map((g, i) => {
                const bad = g.phone.trim() !== "" && !validPhone(g.phone);
                return (
                  <tr key={g.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-300">{i + 1}</td>
                    <td className="px-1 py-1"><Input aria-label={`Guest ${i + 1} name`} className="py-1.5" value={g.name} onChange={(e) => patch(g.id, { name: e.target.value })} /></td>
                    <td className="px-1 py-1"><Input aria-label={`Guest ${i + 1} place`} className="py-1.5" value={g.place} onChange={(e) => patch(g.id, { place: e.target.value })} /></td>
                    <td className="px-1 py-1"><Input aria-label={`Guest ${i + 1} WhatsApp number`} inputMode="tel" className={cn("py-1.5", bad && "border-red-500")} value={g.phone} onChange={(e) => patch(g.id, { phone: e.target.value, status: "pending" })} placeholder="98470 12345" aria-invalid={bad || undefined} /></td>
                    <td className="px-2 py-1.5">
                      <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold", g.status === "sent" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200")}>{g.status === "sent" ? "Sent" : "Pending"}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => onPreview(g)} title="Preview / download this guest's card" aria-label={`Preview card for ${g.name || `guest ${i + 1}`}`} className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"><Eye className="h-4 w-4" /></button>
                        <button type="button" onClick={() => onSend(g)} disabled={busyId !== null || !g.name.trim()} title={!g.name.trim() ? "Enter the guest's name first" : "Share this guest's personalised card image"} aria-label={`Share card for ${g.name || `guest ${i + 1}`}`} className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-xs font-bold text-[#06371a] hover:brightness-95 disabled:opacity-40">{busyId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />} {g.status === "sent" ? "Share again" : "Share"}</button>
                        <button type="button" onClick={() => onChange(guests.filter((x) => x.id !== g.id))} aria-label={`Delete ${g.name || `guest ${i + 1}`}`} className="rounded-md p-1.5 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

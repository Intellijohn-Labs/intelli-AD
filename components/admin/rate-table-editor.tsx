"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clearNewspaperRates, saveRates } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { AD_TYPE_IDS, getActiveRates, permutations } from "@/lib/rates";
import { loadRates, useRatesVersion } from "@/lib/use-rates";
import type { AdType, Newspaper } from "@/lib/types";

type Key = "min_lines" | "min_sq_cm" | "cutoff_days" | "cutoff_time" | "base_rate" | "extra_line_rate" | "sq_cm_rate" | "color_surcharge_percent" | "bold_heading_rate" | "tick_rate" | "border_rate";
const COLS: { key: Key; label: string; types: AdType[]; type: "number" | "time"; step?: string }[] = [
  { key: "min_lines", label: "Min Lines", types: ["classified-text"], type: "number", step: "1" },
  { key: "base_rate", label: "Base Rate", types: ["classified-text"], type: "number", step: "0.01" },
  { key: "extra_line_rate", label: "Extra Line Rate", types: ["classified-text"], type: "number", step: "0.01" },
  { key: "bold_heading_rate", label: "Bold Rate (₹)", types: ["classified-text"], type: "number", step: "0.01" },
  { key: "tick_rate", label: "Tick Rate (₹)", types: ["classified-text"], type: "number", step: "0.01" },
  { key: "border_rate", label: "Border Rate (₹)", types: ["classified-text"], type: "number", step: "0.01" },
  { key: "min_sq_cm", label: "Min Sq.cm", types: ["classified-display", "commercial-display"], type: "number", step: "0.01" },
  { key: "sq_cm_rate", label: "Sq.cm Rate", types: ["classified-display", "commercial-display"], type: "number", step: "0.01" },
  { key: "color_surcharge_percent", label: "Surcharge %", types: ["classified-display", "commercial-display"], type: "number", step: "0.01" },
  { key: "cutoff_days", label: "Cutoff Days", types: AD_TYPE_IDS, type: "number", step: "1" },
  { key: "cutoff_time", label: "Cutoff Time", types: AD_TYPE_IDS, type: "time" },
];
const ENH_KEYS: Key[] = ["bold_heading_rate", "tick_rate", "border_rate"];
interface Cell { vals: Record<Key, string>; gst: boolean }
const keyOf = (p: { edition: string; category: string; ad_type: string }) => `${p.edition}|${p.category}|${p.ad_type}`;
const str = (v: number | string | null | undefined) => (v === null || v === undefined || v === 0 ? "" : String(v));

/** Fixed-structure table: Edition / Category / Ad type are read-only; only the setting and rate inputs can be edited. */
export function RateTableEditor({ paper }: { paper: Newspaper }) {
  const toast = useToast();
  const perms = useMemo(() => permutations(paper), [paper]);
  const ratesVersion = useRatesVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const original = useMemo(() => new Map((getActiveRates() ?? []).filter((r) => r.newspaper_name === paper.name).map((r) => [keyOf(r), r])), [paper, ratesVersion]);
  const initial = (k: string): Cell => {
    const r = original.get(k);
    return { vals: Object.fromEntries(COLS.map((c) => [c.key, str(r?.[c.key])])) as Record<Key, string>, gst: r?.gst_included ?? false };
  };
  const [cells, setCells] = useState<Record<string, Cell>>(() => Object.fromEntries(perms.map((p) => [keyOf(p), initial(keyOf(p))])));
  const [adType, setAdType] = useState<AdType>("classified-text");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isDirty = (k: string) => {
    const a = cells[k], b = initial(k);
    return a.gst !== b.gst || COLS.some((c) => (a.vals[c.key] || "") !== (b.vals[c.key] || ""));
  };
  const dirty = perms.filter((p) => isDirty(keyOf(p)));
  const cols = COLS.filter((c) => c.types.includes(adType));
  const shown = perms.filter((p) => p.ad_type === adType && (!filter || `${p.edition} ${p.category}`.toLowerCase().includes(filter.toLowerCase())));

  async function save() {
    setSaving(true); setMsg(null);
    const rows = dirty.map((p) => ({ newspaper_name: paper.name, ...p, ...cells[keyOf(p)].vals, gst_included: cells[keyOf(p)].gst }));
    const res = await saveRates(rows, true); // validated again on the server; fully empty rows clear an existing rate
    setSaving(false);
    if (res.ok) { toast(res.message); setMsg({ ok: true, text: res.message }); await loadRates(); }
    else setMsg({ ok: false, text: res.message + (res.errors.length ? " " + res.errors.slice(0, 3).map((e) => { const r = rows[e.line - 2]; return `${r?.edition}/${r?.category}/${r?.ad_type}: ${e.errors[0]}`; }).join("; ") : "") });
  }

  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !clearing) { e.stopPropagation(); setConfirming(false); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [confirming, clearing]);

  async function clearAll() {
    setClearing(true); setMsg(null);
    const res = await clearNewspaperRates(paper.name); // deletes this newspaper's rows from publication_rates (admin-only, server side)
    setClearing(false);
    setConfirming(false);
    if (!res.ok) return setMsg({ ok: false, text: res.message });
    setCells(Object.fromEntries(perms.map((p) => [keyOf(p), { vals: Object.fromEntries(COLS.map((c) => [c.key, ""])) as Record<Key, string>, gst: false }])));
    toast(res.message);
    setMsg({ ok: true, text: res.message });
    await loadRates(); // refreshes the live calculator and the card badge
  }

  const set = (k: string, f: (c: Cell) => Cell) => setCells((all) => ({ ...all, [k]: f(all[k]) }));

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Edit {paper.name}&apos;s rates and limits in place. Text ads need a Base Rate; display ads need a Sq.cm Rate. Cutoff days and time go together; blank limits use the publication&apos;s standard values. Clearing every field of a saved row removes it.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select aria-label="Ad type" value={adType} onChange={(e) => setAdType(e.target.value as AdType)} className="w-52">{AD_TYPE_IDS.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
        <Input aria-label="Filter rows" placeholder="Filter edition / category…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56" />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">{dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}</span>
          <button type="button" disabled={saving || clearing || original.size === 0} onClick={() => setConfirming(true)} title={original.size === 0 ? "No saved rates to clear" : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" />Clear All Rates</button>
          <Button size="sm" disabled={saving || !dirty.length} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Save Rates</Button>
        </div>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm font-medium ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      {adType === "classified-text" && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-bold">Ad Enhancement Charges (ക്ലാസിഫൈഡ് എൻഹാൻസ്‌മെന്റ് നിരക്കുകൾ)</p>
          <p className="text-xs">The highlighted Bold, Tick and Border columns are flat extra charges per booking (₹). Leave them empty or 0 to offer the option free. Background tint stays a fixed 30% of the text charge.</p>
        </div>
      )}
      <div className="mt-3 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs text-slate-700"><tr><th className="px-3 py-2">Edition</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Ad Type</th>{cols.map((c) => <th key={c.key} className={`px-3 py-2 ${ENH_KEYS.includes(c.key) ? "bg-amber-100 text-amber-900" : ""}`}>{c.label}</th>)}<th className="px-3 py-2">Rates incl. GST</th></tr></thead>
          <tbody>
            {shown.map((p) => {
              const k = keyOf(p);
              return (
                <tr key={k} className={`border-t border-slate-200 dark:border-slate-700 ${isDirty(k) ? "bg-amber-50" : ""}`}>
                  <td className="px-3 py-1.5 text-slate-700">{p.edition}</td><td className="px-3 py-1.5 text-slate-700">{p.category}</td><td className="px-3 py-1.5 text-slate-700">{p.ad_type}</td>
                  {cols.map((c) => (
                    <td key={c.key} className="px-3 py-1.5">
                      <Input aria-label={`${c.label}: ${p.edition} / ${p.category}`} type={c.type} min={0} step={c.step} inputMode={c.type === "number" ? "decimal" : undefined} value={cells[k].vals[c.key]} onChange={(e) => set(k, (cell) => ({ ...cell, vals: { ...cell.vals, [c.key]: e.target.value } }))} className={c.type === "time" ? "h-8 w-28 px-2 text-sm" : "h-8 w-24 px-2 text-sm"} />
                    </td>
                  ))}
                  <td className="px-3 py-1.5"><input type="checkbox" aria-label={`Rates include GST: ${p.edition} / ${p.category}`} checked={cells[k].gst} onChange={(e) => set(k, (cell) => ({ ...cell, gst: e.target.checked }))} className="h-4 w-4" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {confirming && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => !clearing && setConfirming(false)} />
          <div role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-desc" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <h3 id="clear-title" className="text-lg font-extrabold text-slate-900 dark:text-white">Clear all rates for {paper.name}?</h3>
            <p id="clear-desc" className="mt-2 text-sm text-slate-600 dark:text-slate-300">Are you sure you want to delete all configured rates and limits for this newspaper? This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button ref={cancelRef} type="button" disabled={clearing} onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">Cancel</button>
              <button type="button" disabled={clearing} onClick={() => void clearAll()} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{clearing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Yes, Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

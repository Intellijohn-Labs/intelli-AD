"use client";

import { Loader2, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { saveRates } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { AD_TYPE_IDS, permutations, getActiveRates, type RateRow } from "@/lib/rates";
import { loadRates } from "@/lib/use-rates";
import type { AdType, Newspaper } from "@/lib/types";

const FIELDS = [["base_rate", "Base Rate"], ["extra_line_rate", "Extra Line Rate"], ["sq_cm_rate", "Sq.cm Rate"], ["color_surcharge_percent", "Surcharge %"]] as const;
type Field = (typeof FIELDS)[number][0];
const keyOf = (p: { edition: string; category: string; ad_type: string }) => `${p.edition}|${p.category}|${p.ad_type}`;

/** Fixed-structure table: Edition / Category / Ad type are read-only; only the four rate inputs can be edited. */
export function RateTableEditor({ paper }: { paper: Newspaper }) {
  const toast = useToast();
  const perms = useMemo(() => permutations(paper), [paper]);
  const original = useMemo(() => new Map((getActiveRates() ?? []).filter((r) => r.newspaper_name === paper.name).map((r) => [keyOf(r), r])), [paper]);
  const [vals, setVals] = useState<Record<string, Record<Field, string>>>(() =>
    Object.fromEntries(perms.map((p) => { const r = original.get(keyOf(p)); return [keyOf(p), Object.fromEntries(FIELDS.map(([f]) => [f, r && r[f] ? String(r[f]) : ""])) as Record<Field, string>]; })),
  );
  const [adType, setAdType] = useState<AdType>("classified-text");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isDirty = (p: (typeof perms)[number]) => {
    const r = original.get(keyOf(p));
    return FIELDS.some(([f]) => Number(vals[keyOf(p)][f] || 0) !== (r?.[f] ?? 0));
  };
  const dirty = perms.filter(isDirty);
  const shown = perms.filter((p) => p.ad_type === adType && (!filter || `${p.edition} ${p.category}`.toLowerCase().includes(filter.toLowerCase())));

  async function save() {
    setSaving(true); setMsg(null);
    const rows = dirty.map((p) => ({ newspaper_name: paper.name, ...p, ...Object.fromEntries(FIELDS.map(([f]) => [f, vals[keyOf(p)][f]])) }));
    const res = await saveRates(rows, true); // validated again on the server; all-empty rows clear an existing rate
    setSaving(false);
    if (res.ok) { toast(res.message); setMsg({ ok: true, text: res.message }); await loadRates(); }
    else setMsg({ ok: false, text: res.message + (res.errors.length ? " " + res.errors.slice(0, 3).map((e) => `${rows[e.line - 2]?.edition}/${rows[e.line - 2]?.category}/${rows[e.line - 2]?.ad_type}: ${e.errors[0]}`).join("; ") : "") });
  }

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Edit {paper.name}&apos;s rates in place. Text ads need a Base Rate; display ads need a Sq.cm Rate. Leave a row empty to not publish it (clearing a saved row removes its rate).</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select aria-label="Ad type" value={adType} onChange={(e) => setAdType(e.target.value as AdType)} className="w-52">{AD_TYPE_IDS.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
        <Input aria-label="Filter rows" placeholder="Filter edition / category…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56" />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">{dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}</span>
          <Button size="sm" disabled={saving || !dirty.length} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Save Rates</Button>
        </div>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm font-medium ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      <div className="mt-3 max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs text-slate-700"><tr><th className="px-3 py-2">Edition</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Ad Type</th>{FIELDS.map(([, l]) => <th key={l} className="px-3 py-2">{l}</th>)}</tr></thead>
          <tbody>
            {shown.map((p) => {
              const k = keyOf(p);
              return (
                <tr key={k} className={`border-t border-slate-200 dark:border-slate-700 ${isDirty(p) ? "bg-amber-50" : ""}`}>
                  <td className="px-3 py-1.5 text-slate-700">{p.edition}</td><td className="px-3 py-1.5 text-slate-700">{p.category}</td><td className="px-3 py-1.5 text-slate-700">{p.ad_type}</td>
                  {FIELDS.map(([f, l]) => (
                    <td key={f} className="px-3 py-1.5"><Input aria-label={`${l}: ${p.edition} / ${p.category}`} type="number" min={0} step="0.01" inputMode="decimal" value={vals[k][f]} onChange={(e) => setVals((v) => ({ ...v, [k]: { ...v[k], [f]: e.target.value } }))} className="h-8 w-24 px-2 text-sm" /></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

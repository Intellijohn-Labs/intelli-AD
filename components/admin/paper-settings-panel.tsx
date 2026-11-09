"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { savePaperSettings } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getActiveSettings } from "@/lib/rates";
import { loadRates } from "@/lib/use-rates";
import type { Newspaper } from "@/lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Print schedule (weekdays) and the list of editions offered for booking. */
export function PaperSettingsPanel({ paper }: { paper: Newspaper }) {
  const toast = useToast();
  const saved = getActiveSettings()?.find((s) => s.newspaper_name === paper.name);
  const [days, setDays] = useState<number[]>(saved?.print_days?.length ? saved.print_days : [0, 1, 2, 3, 4, 5, 6]);
  const [eds, setEds] = useState<string[]>(saved?.enabled_editions?.length ? saved.enabled_editions : paper.editions.map((e) => e.name));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await savePaperSettings({ newspaperName: paper.name, printDays: days.length === 7 ? null : days, enabledEditions: eds.length === paper.editions.length ? null : eds });
    setSaving(false);
    setMsg({ ok: res.ok, text: res.message });
    if (res.ok) { toast(res.message); await loadRates(); }
  }

  const box = "flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600";
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daily print schedule</h2>
        <p className="mt-1 text-sm text-slate-600">Weekdays {paper.name} prints. Customers can only pick release dates that fall on these days.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAYS.map((d, i) => <label key={d} className={box}><input type="checkbox" className="h-4 w-4" checked={days.includes(i)} onChange={() => setDays((l) => flip(l, i))} />{d}</label>)}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edition list</h2>
        <p className="mt-1 text-sm text-slate-600">Editions offered for booking. Unticked editions are hidden from customers. (Adding a district that isn&apos;t listed here needs a code change.)</p>
        <div className="mt-3 flex gap-3 text-xs"><button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => setEds(paper.editions.map((e) => e.name))}>Select all</button><button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => setEds([])}>Clear</button></div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {paper.editions.map((e) => <label key={e.id} className={box}><input type="checkbox" className="h-4 w-4" checked={eds.includes(e.name)} onChange={() => setEds((l) => flip(l, e.name))} />{e.name}</label>)}
        </div>
      </section>
      <div className="flex items-center gap-3">
        <Button disabled={saving || !days.length || !eds.length} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Save settings</Button>
        {(!days.length || !eds.length) && <span className="text-xs text-amber-800">Select at least one print day and one edition.</span>}
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-sm font-medium ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

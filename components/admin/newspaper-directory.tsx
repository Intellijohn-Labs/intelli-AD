"use client";

import { CheckCircle2, FileSpreadsheet, Newspaper, Settings, Table2, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BRAND, DEFAULT_BRAND } from "@/data/brand-colors";
import { newspapers } from "@/data/newspapers";
import { getActiveRates, paperHasRates } from "@/lib/rates";
import { loadRates, useRatesVersion } from "@/lib/use-rates";
import { RateManager } from "./rate-manager";
import { PaperSettingsPanel } from "./paper-settings-panel";
import { RateTableEditor } from "./rate-table-editor";

const FORMATS = ["Classified Text", "Classified Display", "Commercial Display"];

export function NewspaperDirectory() {
  const version = useRatesVersion();
  const [open, setOpen] = useState<{ id: string; mode: "upload" | "table" | "settings" } | null>(null);
  useEffect(() => { void loadRates(); }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of getActiveRates() ?? []) m.set(r.newspaper_name, (m.get(r.newspaper_name) ?? 0) + 1);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tableRows = useMemo(() => getActiveRates() ?? [], [version]);
  const ordered = newspapers; // same list, same order as the booking wizard (lib/publications.ts)
  const paper = open ? newspapers.find((n) => n.id === open.id)! : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Newspapers &amp; Rates</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage rates one publication at a time. Saved rates go live in the booking calculator immediately.</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((n) => {
          const brand = BRAND[n.id] ?? DEFAULT_BRAND;
          const count = counts.get(n.name) ?? 0;
          const configured = count > 0 && paperHasRates(getActiveRates() ?? [], n.name);
          return (
            <li key={n.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-serif text-lg font-black text-white" style={{ background: brand.primary }}>{n.name.replace(/^The /, "").slice(0, 1)}</span>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-slate-900 dark:text-white">{n.name}</h2>
                  <p className="truncate text-xs text-slate-500">{n.language} · {n.editions.length} editions</p>
                </div>
              </div>
              {configured ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Configured · {count} active {count === 1 ? "entry" : "entries"}</p>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />Missing · no rate sheet uploaded</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">{FORMATS.map((f) => <span key={f} className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-600 dark:text-slate-300">{f}</span>)}</div>
              <div className="mt-4 pt-1">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpen({ id: n.id, mode: "upload" })} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />Upload Excel / Update Rates</button>
                  <button type="button" onClick={() => setOpen({ id: n.id, mode: "table" })} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Table2 className="h-3.5 w-3.5" aria-hidden="true" />Edit Rates in Table</button>
                  <button type="button" onClick={() => setOpen({ id: n.id, mode: "settings" })} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Settings className="h-3.5 w-3.5" aria-hidden="true" />Publication Settings</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Current database rates</h2>
        <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>{["Newspaper", "Edition", "Category", "Ad type", "Min", "Cut-off", "Base rate (₹)", "Line rate (₹)", "Sq.cm rate (₹)"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {!tableRows.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No rates uploaded yet.</td></tr>}
              {tableRows.map((r) => (
                <tr key={r.id ?? `${r.newspaper_name}|${r.edition}|${r.category}|${r.ad_type}`} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">{r.newspaper_name}</td><td className="px-3 py-2">{r.edition}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2">{r.ad_type}</td>
                  <td className="px-3 py-2">{r.min_lines ?? (r.min_sq_cm ? `${r.min_sq_cm} cm²` : "—")}</td><td className="px-3 py-2 whitespace-nowrap">{r.cutoff_days !== null && r.cutoff_time ? `${r.cutoff_days}d · ${r.cutoff_time}` : "—"}</td><td className="px-3 py-2">{r.base_rate}</td><td className="px-3 py-2">{r.extra_line_rate}</td><td className="px-3 py-2">{r.sq_cm_rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {paper && open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${paper.name} rates`}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(null)} />
          <div className="relative flex h-full w-full max-w-4xl flex-col overflow-y-auto bg-slate-50 shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <Newspaper className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="flex-1 truncate text-lg font-extrabold text-slate-900 dark:text-white">{paper.name} <span className="text-sm font-normal text-slate-500">· {open.mode === "upload" ? "upload rate sheet" : open.mode === "table" ? "edit rates" : "publication settings"}</span></h2>
              <FileSpreadsheet className="hidden h-4 w-4 text-emerald-600 sm:block" aria-hidden="true" />
              <button type="button" onClick={() => setOpen(null)} aria-label="Close drawer" className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 sm:p-6">{open.mode === "upload" ? <RateManager key={paper.id} paper={paper.name} /> : open.mode === "table" ? <RateTableEditor key={paper.id} paper={paper} /> : <PaperSettingsPanel key={paper.id} paper={paper} />}</div>
          </div>
        </div>
      )}
    </div>
  );
}

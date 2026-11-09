"use client";

import { CheckCircle2, FileSpreadsheet, Newspaper, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BRAND, DEFAULT_BRAND } from "@/data/brand-colors";
import { newspapers } from "@/data/newspapers";
import { getActiveRates, paperHasRates } from "@/lib/rates";
import { loadRates, useRatesVersion } from "@/lib/use-rates";
import { RateManager } from "./rate-manager";

const FORMATS = ["Classified Text", "Classified Display", "Commercial Display"];

export function NewspaperDirectory() {
  const version = useRatesVersion();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { void loadRates(); }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of getActiveRates() ?? []) m.set(r.newspaper_name, (m.get(r.newspaper_name) ?? 0) + 1);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const ordered = newspapers; // same list, same order as the booking wizard (lib/publications.ts)
  const paper = open ? newspapers.find((n) => n.id === open)! : null;

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
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Rates Configured - {count} active {count === 1 ? "entry" : "entries"}</p>
              ) : (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />No Rate Sheet Uploaded</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">{FORMATS.map((f) => <span key={f} className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-600 dark:text-slate-300">{f}</span>)}</div>
              <div className="mt-4 pt-1">
                <button type="button" onClick={() => setOpen(n.id)} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />Upload Excel / Manage Rates</button>
              </div>
            </li>
          );
        })}
      </ul>

      {paper && open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${paper.name} rates`}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(null)} />
          <div className="relative flex h-full w-full max-w-4xl flex-col overflow-y-auto bg-slate-50 shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <Newspaper className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="flex-1 truncate text-lg font-extrabold text-slate-900 dark:text-white">{paper.name} <span className="text-sm font-normal text-slate-500">· rates</span></h2>
              <FileSpreadsheet className="hidden h-4 w-4 text-emerald-600 sm:block" aria-hidden="true" />
              <button type="button" onClick={() => setOpen(null)} aria-label="Close drawer" className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 sm:p-6"><RateManager key={paper.id} paper={paper.name} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, Save, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { saveRates } from "@/app/admin/actions";
import { useToast } from "@/components/ui/toast";
import { newspapers } from "@/data/newspapers";
import { mapExtraction, type ImportField, type ImportRow, type RateExtraction } from "@/lib/rate-import";
import { RATE_COLUMNS, validateRows } from "@/lib/rates";
import { loadRates } from "@/lib/use-rates";
import { cn } from "@/lib/utils";

const MAX_BYTES = 4 * 1024 * 1024;
const NUMS: { key: ImportField; label: string; types: ImportRow["ad_type"][]; step: string }[] = [
  { key: "min_lines", label: "Min lines", types: ["classified-text"], step: "1" },
  { key: "base_rate", label: "Base ₹", types: ["classified-text"], step: "0.01" },
  { key: "extra_line_rate", label: "Extra line ₹", types: ["classified-text"], step: "0.01" },
  { key: "bold_heading_rate", label: "Bold ₹", types: ["classified-text"], step: "0.01" },
  { key: "border_rate", label: "Box ₹", types: ["classified-text"], step: "0.01" },
  { key: "min_sq_cm", label: "Min cm²", types: ["classified-display", "commercial-display"], step: "0.01" },
  { key: "sq_cm_rate", label: "₹ / cm²", types: ["classified-display", "commercial-display"], step: "0.01" },
  { key: "color_surcharge_percent", label: "Colour +%", types: ["classified-display", "commercial-display"], step: "0.01" },
];
const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900";

/** Admin: upload a newspaper's tariff PDF, review the extracted rates in an editable table, then save them to the live rate book. */
export function RatePdfImporter() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [paperId, setPaperId] = useState(newspapers[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [wpl, setWpl] = useState(4);
  const [busy, setBusy] = useState<"" | "reading" | "saving">("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{ ex: RateExtraction; provider: string; model: string } | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const paper = newspapers.find((n) => n.id === paperId)!;

  const remap = (ex: RateExtraction, words: number) => { const m = mapExtraction(paper, ex, { wordsPerLine: words }); setRows(m.rows); setNotes(m.notes); };

  async function extract() {
    if (!file) return;
    setError(""); setMeta(null); setRows([]); setNotes([]); setBusy("reading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("publicationId", paperId);
      const res = await fetch("/api/admin/rates/parse-pdf", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.extraction) { setError(j.error ?? `Couldn't read the PDF (${res.status}).`); return; }
      setMeta({ ex: j.extraction, provider: j.provider, model: j.model });
      remap(j.extraction, wpl);
    } catch { setError("Couldn't reach the server. Check your connection and try again."); }
    finally { setBusy(""); }
  }

  const included = rows.filter((r) => r.include);
  // Same validation the server applies on save, shown per row before anything is written.
  const problems = useMemo(() => {
    const res = validateRows(included.map((r) => Object.fromEntries(RATE_COLUMNS.map((c) => [c, r[c]]))));
    return new Map(included.map((r, i) => [r.uid, res[i].errors]));
  }, [included]);
  const blocked = [...problems.values()].some((e) => e.length);

  const edit = (uid: string, patch: Partial<ImportRow>, field?: ImportField) =>
    setRows((rs) => rs.map((r) => {
      if (r.uid !== uid) return r;
      const flags = { ...r.flags };
      if (field) delete flags[field]; // edited by the admin = verified
      return { ...r, ...patch, flags };
    }));

  async function apply() {
    if (!included.length || blocked) return;
    setBusy("saving"); setError("");
    try {
      const raw = included.map((r) => Object.fromEntries(RATE_COLUMNS.map((c) => [c, r[c]])));
      for (let i = 0; i < raw.length; i += 500) {
        const res = await saveRates(raw.slice(i, i + 500));
        if (!res.ok) { setError(res.message + (res.errors[0] ? ` (${res.errors[0].errors[0]})` : "")); return; }
      }
      toast(`${raw.length} ${paper.name} rate${raw.length === 1 ? "" : "s"} saved and live`);
      setMeta(null); setRows([]); setNotes([]); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadRates(); // the booking calculator reads this rate book
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save the rates."); }
    finally { setBusy(""); }
  }

  const flagged = included.reduce((n, r) => n + Object.keys(r.flags).length, 0);
  const cellCls = (f?: "missing" | "uncertain") => cn("w-20 rounded border px-1.5 py-1 text-right text-xs tabular-nums dark:bg-slate-800 dark:text-white",
    f === "missing" ? "border-red-500 bg-red-50 ring-1 ring-red-400 dark:bg-red-950/40" : f === "uncertain" ? "border-amber-500 bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/30" : "border-slate-300 dark:border-slate-600");

  return (
    <section aria-labelledby="pdf-import-h" className={card}>
      <h2 id="pdf-import-h" className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" /> Import from Rate Card PDF</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Upload a publication&rsquo;s official tariff PDF. The AI reads it with the provider set in AI Settings, and you review every number before anything is saved. Existing rates are only changed where the imported rows match.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-end">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Publication
          <select value={paperId} onChange={(e) => { setPaperId(e.target.value); setMeta(null); setRows([]); setNotes([]); }} disabled={!!busy} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
            {newspapers.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rate card PDF (max 4 MB)
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" disabled={!!busy} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 dark:border-slate-600 dark:bg-slate-800"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setError("");
              if (f && !/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { setError("Please choose a PDF file."); setFile(null); return; }
              if (f && f.size > MAX_BYTES) { setError(`That PDF is ${(f.size / 1048576).toFixed(1)} MB; the limit is 4 MB. Compress it or upload only the rate pages.`); setFile(null); return; }
              setFile(f);
            }} />
        </label>
        <button type="button" onClick={() => void extract()} disabled={!file || !!busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
          {busy === "reading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />} {busy === "reading" ? "Reading PDF…" : "Extract rates"}
        </button>
      </div>
      {busy === "reading" && <p className="mt-2 text-xs text-slate-500">Reading a multi-page tariff can take up to a minute or two.</p>}
      {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}

      {meta && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span>Read by <b>{meta.provider === "claude" ? "Claude" : "Gemini"}</b> · {meta.model}</span>
            <span>Effective date: <b>{meta.ex.effectiveDate ?? "not found"}</b></span>
            <span>GST: <b>{meta.ex.gstIncluded === true ? "included" : meta.ex.gstIncluded === false ? "extra" : "not stated"}</b></span>
            <span>Confidence: <b>{meta.ex.confidence != null ? `${Math.round(meta.ex.confidence * (meta.ex.confidence <= 1 ? 100 : 1))}%` : "n/a"}</b></span>
            <label className="ml-auto flex items-center gap-1.5">Words per line (per-word rates)
              <input type="number" min={1} max={20} value={wpl} onChange={(e) => { const v = Math.max(1, Math.min(20, Number(e.target.value) || 4)); setWpl(v); remap(meta.ex, v); }} className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-right dark:border-slate-600 dark:bg-slate-900" />
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">No rates could be matched to {paper.name}&rsquo;s editions and categories. See the notes below, or check you picked the right publication.</p>
          ) : (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-block h-2.5 w-2.5 rounded-sm border border-red-500 bg-red-100 align-middle" /> missing &nbsp; <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-500 bg-amber-100 align-middle" /> uncertain / derived (check against the PDF). Editing a cell marks it as checked. {flagged > 0 && <b className="text-amber-800 dark:text-amber-300">{flagged} cell{flagged === 1 ? "" : "s"} to verify.</b>}
              </p>
              <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[1000px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>
                    <th className="px-2 py-2">Use</th><th className="px-2 py-2">Edition</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Ad type</th>
                    {NUMS.map((c) => <th key={c.key} className="px-2 py-2 text-right whitespace-nowrap">{c.label}</th>)}<th className="px-2 py-2">Source</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const errs = r.include ? problems.get(r.uid) ?? [] : [];
                      return (
                        <tr key={r.uid} className={cn("border-t border-slate-200 align-top dark:border-slate-700", !r.include && "opacity-45", errs.length > 0 && "bg-red-50/60 dark:bg-red-950/20")}>
                          <td className="px-2 py-1.5"><input type="checkbox" checked={r.include} onChange={(e) => edit(r.uid, { include: e.target.checked })} aria-label={`Include ${r.edition} ${r.category} ${r.ad_type}`} className="h-4 w-4 accent-violet-600" /></td>
                          <td className="px-2 py-1.5 font-semibold whitespace-nowrap">{r.edition === "all" ? "All editions" : r.edition}</td>
                          <td className="px-2 py-1.5">{r.category === "all" ? "All" : r.category}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.ad_type}</td>
                          {NUMS.map((c) => (
                            <td key={c.key} className="px-2 py-1.5 text-right">
                              {c.types.includes(r.ad_type)
                                ? <input type="number" min={0} step={c.step} value={r[c.key] ?? ""} aria-label={`${c.label} for ${r.edition} ${r.category}`} className={cellCls(r.flags[c.key])}
                                    onChange={(e) => edit(r.uid, { [c.key]: e.target.value === "" ? (c.key === "min_lines" || c.key === "min_sq_cm" ? null : 0) : Number(e.target.value) } as Partial<ImportRow>, c.key)} />
                                : <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-slate-500">{r.source}{errs.length > 0 && <span className="mt-0.5 block font-semibold text-red-700 dark:text-red-300">{errs[0]}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {notes.length > 0 && (
            <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
              <summary className="cursor-pointer font-semibold">Notes &amp; items not imported ({notes.length})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </details>
          )}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void apply()} disabled={!included.length || blocked || !!busy} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Apply &amp; Save Rates ({included.length})
              </button>
              {blocked && <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Fix the highlighted rows (or untick them) to continue.</span>}
              {!blocked && included.length > 0 && <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Saved rows update matching {paper.name} rates and go live in the booking calculator at once.</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

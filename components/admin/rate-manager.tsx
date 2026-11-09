"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Pencil, Save, Search, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { CONFLICT_KEY, RATE_COLUMNS, sampleRows, validateRows, type RateRow, type RowResult } from "@/lib/rates";
import { createClient } from "@/lib/supabase/client";
import { loadRates } from "@/lib/use-rates";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const NUM_FIELDS = ["base_rate", "extra_line_rate", "sq_cm_rate", "color_surcharge_percent"] as const;
const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700";

/** Excel header → canonical column key ("Base Rate", "base-rate" → base_rate). */
const headerKey = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * Rate sheet upload + rate list. With `paper`, everything is scoped to that publication: the template is pre-filled for
 * it, a blank newspaper_name is filled in, rows for other publications are rejected, and only its rates are listed.
 */
export function RateManager({ paper, focus }: { paper?: string; focus?: "upload" | "rates" }) {
  const toast = useToast();
  const sb = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLElement>(null);

  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [paperFilter, setPaperFilter] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await loadRates(); // also refreshes the live booking calculator
    if (rows) setRates(rows);
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (focus === "rates") listRef.current?.scrollIntoView({ block: "start" }); }, [focus, loading]);

  // ── Template ────────────────────────────────────────────────────────────────────────────────────────────────────
  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(sampleRows(paper), { header: [...RATE_COLUMNS] });
    ws["!cols"] = RATE_COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "rates");
    const notes = XLSX.utils.aoa_to_sheet([
      ["Column", "Notes"],
      ["newspaper_name", "Exactly as shown in IntelliAd (e.g. The Hindu)"],
      ["edition", "Edition name, or all"],
      ["category", "Category id (matrimonial, property, recruitment, public-notice, name-change, obituary, remembrance, tender, business) or all"],
      ["ad_type", "classified-text | classified-display | commercial-display"],
      ["base_rate", "Classified text: price for the minimum lines"],
      ["extra_line_rate", "Classified text: price per extra line"],
      ["sq_cm_rate", "Display ads: price per cm²"],
      ["color_surcharge_percent", "Extra % for colour (e.g. 25)"],
    ]);
    notes["!cols"] = [{ wch: 26 }, { wch: 110 }];
    XLSX.utils.book_append_sheet(wb, notes, "help");
    XLSX.writeFile(wb, `intelliad-rate-template${paper ? `-${paper.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.xlsx`);
  }

  // ── Parse ───────────────────────────────────────────────────────────────────────────────────────────────────────
  async function handleFile(file: File | undefined) {
    if (!file) return;
    setResults(null); setParseError(""); setUploadError(""); setFileName(file.name);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setParseError("Please choose an .xlsx, .xls or .csv file.");
    if (file.size > MAX_BYTES) return setParseError("That file is larger than 5 MB.");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) return setParseError("The workbook has no sheets.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
      if (!rows.length) return setParseError("No data rows found under the header row.");
      if (rows.length > MAX_ROWS) return setParseError(`Too many rows (${rows.length}); the limit is ${MAX_ROWS} per upload.`);
      const normalised = rows.map((r) => {
        const o = Object.fromEntries(Object.entries(r).map(([k, v]) => [headerKey(k), v]));
        if (paper && !String(o.newspaper_name ?? "").trim()) o.newspaper_name = paper; // blank → this publication
        return o;
      });
      const have = new Set(Object.keys(normalised[0]));
      const missing = RATE_COLUMNS.filter((c) => !have.has(c) && !(paper && c === "newspaper_name"));
      if (missing.length) return setParseError(`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template for the expected headers.`);
      const res = validateRows(normalised);
      // Scoped upload: never let a sheet touch another publication's rates.
      setResults(paper ? res.map((r) => (r.row && r.row.newspaper_name !== paper ? { line: r.line, errors: [`This row is for ${r.row.newspaper_name}, not ${paper}`] } : r)) : res);
    } catch (e) {
      console.warn("[rates] could not read file", e);
      setParseError("Couldn't read that file. Make sure it's a valid Excel or CSV file.");
    }
  }

  const valid = useMemo(() => (results ?? []).filter((r) => r.row).map((r) => r.row!), [results]);
  const invalid = useMemo(() => (results ?? []).filter((r) => r.errors.length), [results]);

  // ── Bulk upsert ─────────────────────────────────────────────────────────────────────────────────────────────────
  async function commit() {
    if (!sb || !valid.length) return;
    setSaving(true); setUploadError("");
    try {
      for (let i = 0; i < valid.length; i += 500) {
        const chunk = valid.slice(i, i + 500).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
        const { error } = await sb.from("publication_rates").upsert(chunk, { onConflict: CONFLICT_KEY });
        if (error) throw error;
      }
      toast(`${valid.length} rate${valid.length === 1 ? "" : "s"} saved${invalid.length ? `, ${invalid.length} skipped` : ""}`);
      setResults(null); setFileName("");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      setUploadError(/row-level security|permission|jwt|42501/i.test(msg) ? "Not allowed: this account isn't an admin in Supabase (app_metadata.role must be \"admin\"), or you need to sign out and in again." : /does not exist|schema cache/i.test(msg) ? "The publication_rates table doesn't exist yet. Run supabase/schema.sql in the Supabase SQL editor." : msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Active list: filter / edit / delete ─────────────────────────────────────────────────────────────────────────
  const scoped = useMemo(() => (paper ? rates.filter((r) => r.newspaper_name === paper) : rates), [rates, paper]);
  const papers = useMemo(() => [...new Set(rates.map((r) => r.newspaper_name))].sort(), [rates]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return scoped.filter((r) => (!paperFilter || r.newspaper_name === paperFilter) && (!s || [r.newspaper_name, r.edition, r.category, r.ad_type].some((v) => v.toLowerCase().includes(s))));
  }, [scoped, q, paperFilter]);

  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState("");

  function startEdit(r: RateRow) {
    setEditId(r.id ?? null); setRowError("");
    setDraft(Object.fromEntries(NUM_FIELDS.map((f) => [f, String(r[f])])));
  }
  async function saveEdit(r: RateRow) {
    const patch: Record<string, number> = {};
    for (const f of NUM_FIELDS) {
      const n = Number(draft[f]);
      if (!Number.isFinite(n) || n < 0) return setRowError(`${f} must be a number, 0 or more.`);
      patch[f] = n;
    }
    if (patch.color_surcharge_percent > 500) return setRowError("color_surcharge_percent can't exceed 500.");
    if (r.ad_type === "classified-text" ? !(patch.base_rate > 0) : !(patch.sq_cm_rate > 0)) return setRowError(r.ad_type === "classified-text" ? "base_rate must be above 0." : "sq_cm_rate must be above 0.");
    const { error } = await sb!.from("publication_rates").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", r.id!);
    if (error) return setRowError(error.message);
    setEditId(null); toast("Rate updated"); await refresh();
  }
  async function remove(r: RateRow) {
    if (!window.confirm(`Delete the ${r.ad_type} rate for ${r.newspaper_name} / ${r.edition} / ${r.category}? Bookings will fall back to default rates for it.`)) return;
    const { error } = await sb!.from("publication_rates").delete().eq("id", r.id!);
    if (error) return setRowError(error.message);
    toast("Rate deleted"); await refresh();
  }

  return (
    <div>
      {!paper && <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Rate Card Manager</h1>}
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{paper ? `Upload ${paper} rates from Excel or CSV; other publications are never touched. ` : "Upload publication rates from Excel. "}Saved rates apply to the live booking calculator straight away; anything not covered keeps using the built-in default rates.</p>
      {!sb && <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Supabase isn't configured (.env.local), so rates can't be saved.</p>}

      <section className={cn(card, "mt-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Upload rates</h2>
          <Button variant="secondary" size="sm" onClick={() => void downloadTemplate()}><Download className="h-4 w-4" aria-hidden="true" /> Download template (.xlsx)</Button>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Choose or drop an Excel file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
          className={cn("mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors", dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-300 hover:border-blue-400 dark:border-slate-600")}
        >
          <FileSpreadsheet className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fileName || "Drag & drop an .xlsx file here, or click to browse"}</p>
          <p className="text-xs text-slate-500">.xlsx, .xls or .csv · up to 5 MB · first sheet is read</p>
          <input ref={inputRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {parseError && <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{parseError}</p>}

        {results && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{valid.length} valid</span>
              {invalid.length > 0 && <span className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{invalid.length} with errors (will be skipped)</span>}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setResults(null); setFileName(""); }}>Cancel</Button>
                <Button size="sm" disabled={saving || !valid.length || !sb} onClick={() => void commit()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />} Upload {valid.length} rate{valid.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
            {uploadError && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{uploadError}</p>}
            <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>
                  <th className="px-2 py-2">Row</th>{RATE_COLUMNS.map((c) => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}<th className="px-2 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.line} className={cn("border-t border-slate-200 align-top dark:border-slate-700", r.errors.length && "bg-red-50 dark:bg-red-500/10")}>
                      <td className="px-2 py-1.5 font-mono">{r.line}</td>
                      {r.row ? RATE_COLUMNS.map((c) => <td key={c} className="px-2 py-1.5">{String(r.row![c])}</td>) : <td colSpan={RATE_COLUMNS.length} className="px-2 py-1.5 text-slate-500">—</td>}
                      <td className="px-2 py-1.5">{r.errors.length ? <ul className="list-disc pl-4 text-red-700 dark:text-red-300">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul> : <span className="text-emerald-700 dark:text-emerald-300">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section ref={listRef} className={cn(card, "mt-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Active rates <span className="text-sm font-normal text-slate-500">({shown.length}{shown.length !== scoped.length ? ` of ${scoped.length}` : ""})</span></h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input aria-label="Search rates" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48 pl-8" /></div>
            {!paper && <Select aria-label="Filter by newspaper" value={paperFilter} onChange={(e) => setPaperFilter(e.target.value)} className="w-48">
              <option value="">All newspapers</option>{papers.map((p) => <option key={p}>{p}</option>)}
            </Select>}
          </div>
        </div>
        {rowError && <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{rowError}</p>}
        <div className="mt-4 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>
              {RATE_COLUMNS.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}<th className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500"><Loader2 className="mx-auto h-4 w-4 animate-spin" aria-label="Loading" /></td></tr>}
              {!loading && !shown.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">{scoped.length ? "No rates match." : "No rates saved yet. Upload a file above. Until then, built-in default rates are used."}</td></tr>}
              {shown.map((r) => {
                const editing = editId === r.id;
                return (
                  <tr key={r.id ?? `${r.newspaper_name}|${r.edition}|${r.category}|${r.ad_type}`} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2">{r.newspaper_name}</td><td className="px-3 py-2">{r.edition}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2">{r.ad_type}</td>
                    {NUM_FIELDS.map((f) => (
                      <td key={f} className="px-3 py-2">
                        {editing ? <Input aria-label={f} type="number" min={0} step="0.01" value={draft[f]} onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))} className="h-8 w-24 px-2 text-sm" /> : r[f]}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {editing ? (<>
                        <button type="button" aria-label="Save" onClick={() => void saveEdit(r)} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50"><Save className="h-4 w-4" /></button>
                        <button type="button" aria-label="Cancel" onClick={() => { setEditId(null); setRowError(""); }} className="rounded p-1.5 text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                      </>) : (<>
                        <button type="button" aria-label="Edit" onClick={() => startEdit(r)} className="rounded p-1.5 text-blue-700 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                        <button type="button" aria-label="Delete" onClick={() => void remove(r)} className="rounded p-1.5 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

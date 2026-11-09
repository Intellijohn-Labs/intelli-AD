"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { saveRates } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { newspapers } from "@/data/newspapers";
import { downloadProtectedTemplate } from "@/lib/rate-template";
import { getActiveRates, HEADER_ERROR, RATE_COLUMNS, headersValid, validateRows, type RowResult } from "@/lib/rates";
import { loadRates } from "@/lib/use-rates";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;
const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700";

/** Template download + strict upload for ONE newspaper. Rows for other newspapers are rejected. */
export function RateManager({ paper: paperName }: { paper: string }) {
  const toast = useToast();
  const paper = newspapers.find((n) => n.name === paperName)!;
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setResults(null); setParseError(""); setUploadError(""); setFileName(file.name);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setParseError("Please choose the .xlsx template you downloaded.");
    if (file.size > MAX_BYTES) return setParseError("That file is larger than 5 MB.");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets["rates"] ?? wb.Sheets[wb.SheetNames[0]];
      if (!sheet) return setParseError(HEADER_ERROR);
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: false });
      if (!grid.length || !headersValid(grid[0])) return setParseError(HEADER_ERROR); // strict: no renamed, added, removed or reordered headers
      const body = grid.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      if (!body.length) return setParseError("No data rows found under the header row.");
      if (body.length > MAX_ROWS) return setParseError(`Too many rows (${body.length}); the limit is ${MAX_ROWS} per upload.`);
      const objects = body.map((r) => Object.fromEntries(RATE_COLUMNS.map((c, i) => [c, r[i]])));
      const res = validateRows(objects);
      // One newspaper per sheet: never let a file touch another publication's rates.
      setResults(res.map((r) => (r.row && r.row.newspaper_name !== paper.name ? { line: r.line, errors: [`This row is for ${r.row.newspaper_name}, not ${paper.name}`] } : r)));
    } catch (e) {
      console.warn("[rates] could not read file", e);
      setParseError("Couldn't read that file. Upload the .xlsx template you downloaded.");
    }
  }

  const valid = (results ?? []).filter((r) => r.row).map((r) => r.row!);
  const empty = (results ?? []).filter((r) => r.skipped).length;
  const invalid = (results ?? []).filter((r) => r.errors.length);

  async function commit() {
    if (!valid.length) return;
    setSaving(true); setUploadError("");
    try {
      for (let i = 0; i < valid.length; i += 500) {
        const res = await saveRates(valid.slice(i, i + 500));
        if (!res.ok) { setUploadError(res.message + (res.errors[0] ? ` (${res.errors[0].errors[0]})` : "")); return; }
      }
      toast(`${valid.length} rate${valid.length === 1 ? "" : "s"} saved${invalid.length ? `, ${invalid.length} skipped` : ""}`);
      setResults(null); setFileName("");
      await loadRates();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Couldn't save the rates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Download the protected template for {paper.name}, fill in the yellow rate cells, and upload it. Other publications are never touched; saved rates go live in the booking calculator immediately.</p>
      <section className={cn(card, "mt-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload rate sheet</h2>
          <Button variant="secondary" size="sm" onClick={() => void downloadProtectedTemplate(paper, getActiveRates() ?? [])}><Download className="h-4 w-4" aria-hidden="true" /> Download protected template</Button>
        </div>
        <div
          role="button" tabIndex={0} aria-label="Choose or drop the Excel template"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
          className={cn("mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors", dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-300 hover:border-blue-400 dark:border-slate-600")}
        >
          <FileSpreadsheet className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fileName || "Drag & drop the .xlsx template here, or click to browse"}</p>
          <p className="text-xs text-slate-500">Headers must match the template exactly · up to 5 MB</p>
          <input ref={inputRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {parseError && <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{parseError}</p>}

        {results && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{valid.length} with rates</span>
              {empty > 0 && <span className="text-slate-500">{empty} empty (ignored)</span>}
              {invalid.length > 0 && <span className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{invalid.length} with errors (will be skipped)</span>}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setResults(null); setFileName(""); }}>Cancel</Button>
                <Button size="sm" disabled={saving || !valid.length} onClick={() => void commit()}>
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
                  {results.filter((r) => !r.skipped).map((r) => (
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
    </div>
  );
}

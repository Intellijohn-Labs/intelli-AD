"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, Save } from "lucide-react";
import { CourierLoader } from "@/components/admin/courier-loader";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAiSettings, type AiSettingsState } from "@/app/admin/settings/ai/actions";
import { replacePublicationRates } from "@/app/admin/actions";
import { useToast } from "@/components/ui/toast";
import { newspapers } from "@/data/newspapers";
import { mapExtraction, type ImportExtra, type ImportField, type ImportRow, type RateExtraction } from "@/lib/rate-import";
import { RATE_COLUMNS, ROW_EXTRA_COLUMNS, validateRows } from "@/lib/rates";
import { loadRates } from "@/lib/use-rates";
import { cn } from "@/lib/utils";

const MAX_BYTES = 4 * 1024 * 1024;
const NUMS: { key: ImportField; label: string; types: ImportRow["ad_type"][]; step: string }[] = [
  { key: "min_lines", label: "Min lines", types: ["classified-text"], step: "1" },
  { key: "base_rate", label: "Base ₹", types: ["classified-text"], step: "0.01" },
  { key: "extra_line_rate", label: "Extra line ₹", types: ["classified-text"], step: "0.01" },
  { key: "bold_heading_rate", label: "Bold ₹", types: ["classified-text"], step: "0.01" },
  { key: "border_rate", label: "Box ₹", types: ["classified-text"], step: "0.01" },
  { key: "word_rate", label: "₹ / word", types: ["classified-text"], step: "0.01" },
  { key: "eng_word_rate", label: "Eng ₹ / word", types: ["classified-text"], step: "0.01" },
  { key: "caps_word_rate", label: "Caps ₹ / word", types: ["classified-text"], step: "0.01" },
  { key: "heading_line_rate", label: "Heading ₹ / line", types: ["classified-text"], step: "0.01" },
  { key: "min_words", label: "Min words", types: ["classified-text"], step: "1" },
  { key: "min_sq_cm", label: "Min cm²", types: ["classified-display", "commercial-display"], step: "0.01" },
  { key: "sq_cm_rate", label: "₹ / cm²", types: ["classified-display", "commercial-display"], step: "0.01" },
  { key: "color_sq_cm_rate", label: "Colour ₹ / cm²", types: ["classified-display", "commercial-display"], step: "0.01" },
  { key: "color_surcharge_percent", label: "Colour +% (info)", types: ["classified-display", "commercial-display"], step: "0.01" },
];
const card = "rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900";
const fmtSize = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);

/** Admin: upload a newspaper's tariff PDF, review the extracted rates in an editable table, then save them to the live rate book. */
export function RatePdfImporter({ paperId }: { paperId: string }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"" | "reading" | "saving">("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{ ex: RateExtraction; provider: string; model: string } | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [extras, setExtras] = useState<ImportExtra[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [notes, setNotes] = useState<string[]>([]);
  const paper = newspapers.find((n) => n.id === paperId)!;
  const [ai, setAi] = useState<AiSettingsState | null>(null);
  const [engine, setEngine] = useState<"claude" | "gemini">("claude");
  useEffect(() => { void getAiSettings().then((s) => { if (s) { setAi(s); setEngine(s.config.provider); } }); }, []);

  // Progress: real upload progress fills 0–20%; after that the bar eases toward 96% while the sheet is being read, then snaps to 100%.
  const [pct, setPct] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const prog = useRef({ start: 0, uploadedAt: 0, uploadFrac: 0, done: false });
  useEffect(() => {
    if (busy !== "reading") return;
    const id = setInterval(() => {
      const p = prog.current, now = Date.now();
      setElapsed((now - p.start) / 1000);
      if (p.done) return;
      let target: number;
      if (!p.uploadedAt) target = p.uploadFrac * 20;
      else { const t = (now - p.uploadedAt) / 1000; target = 20 + 76 * (1 - Math.exp(-t / 10)); } // 20→96%: ~54% at 6 s, ~77% at 14 s, holds near 96%
      setPct((cur) => Math.min(96, Math.max(cur, cur + (target - cur) * 0.25))); // smoothed, never goes backwards
    }, 100);
    return () => clearInterval(id);
  }, [busy]);

  const remap = (ex: RateExtraction) => { const m = mapExtraction(paper, ex); setRows(m.rows); setExtras(m.extras); setNotes(m.notes); setConfirming(false); };

  async function extract() {
    if (!file) return;
    setError(""); setMeta(null); setRows([]); setExtras([]); setNotes([]); setBusy("reading"); setPct(0); setElapsed(0); setFinishing(false);
    prog.current = { start: Date.now(), uploadedAt: 0, uploadFrac: 0, done: false };
    const fd = new FormData();
    fd.append("file", file);
    fd.append("publicationId", paperId);
    fd.append("provider", engine === "claude" ? "anthropic" : "gemini");
    // XMLHttpRequest (not fetch) so the upload itself reports real progress.
    const result = await new Promise<{ ok: boolean; body: Record<string, unknown> }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/rates/parse-pdf");
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) prog.current.uploadFrac = e.loaded / e.total; };
      xhr.upload.onload = () => { prog.current.uploadFrac = 1; prog.current.uploadedAt = Date.now(); };
      xhr.onload = () => { let body: Record<string, unknown> = {}; try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ } resolve({ ok: xhr.status >= 200 && xhr.status < 300, body: { ...body, _status: xhr.status } }); };
      xhr.onerror = () => resolve({ ok: false, body: { error: "Couldn't reach the server. Check your connection and try again." } });
      xhr.ontimeout = () => resolve({ ok: false, body: { error: "The request timed out. Try a smaller PDF." } });
      xhr.timeout = 70_000;
      xhr.send(fd);
    });
    const j = result.body as { extraction?: RateExtraction; truncated?: boolean; provider?: string; model?: string; error?: string; _status?: number };
    if (!result.ok || !j.extraction) { prog.current.done = true; setError(j.error ?? `Couldn't read the PDF (${j._status ?? "error"}).`); setBusy(""); return; }
    prog.current.done = true;
    setPct(100); setFinishing(true); // snap to 100% with a checkmark, then reveal the table
    await new Promise((r) => setTimeout(r, 700));
    setTruncated(!!j.truncated);
    setMeta({ ex: j.extraction, provider: j.provider ?? engine, model: j.model ?? "" });
    remap(j.extraction);
    setFinishing(false); setBusy("");
  }

  const included = rows.filter((r) => r.include);
  // Same validation the server applies on save, shown per row before anything is written.
  const problems = useMemo(() => {
    const res = validateRows(included.map((r) => Object.fromEntries([...RATE_COLUMNS, ...ROW_EXTRA_COLUMNS].map((c) => [c, r[c as keyof ImportRow]]))));
    return new Map(included.map((r, i) => [r.uid, res[i].errors]));
  }, [included]);
  const blocked = [...problems.values()].some((e) => e.length);

  const edit = (uid: string, patch: Partial<ImportRow>, field?: ImportField) =>
    setRows((rs) => rs.map((r) => {
      if (r.uid !== uid) return r;
      const flags = { ...r.flags };
      if (field) delete flags[field]; // edited by the admin = verified
      const next = { ...r, ...patch, flags };
      // Keep the informational colour % in step; pricing uses the exact printed colour rate.
      if ((field === "sq_cm_rate" || field === "color_sq_cm_rate") && next.sq_cm_rate > 0 && (next.color_sq_cm_rate ?? 0) >= next.sq_cm_rate) next.color_surcharge_percent = Math.round(((next.color_sq_cm_rate as number) / next.sq_cm_rate - 1) * 10000) / 100;
      return next;
    }));

  async function apply() {
    if (!included.length || blocked) return;
    setBusy("saving"); setError(""); setConfirming(false);
    try {
      const raw = included.map((r) => Object.fromEntries([...RATE_COLUMNS, ...ROW_EXTRA_COLUMNS].map((c) => [c, r[c as keyof ImportRow]])));
      const res = await replacePublicationRates({
        newspaperName: paper.name,
        mode,
        rows: raw,
        extras: extras.filter((x) => x.include).map((x) => ({ kind: x.kind, name: x.name, data: x.data })),
        meta: { fileName: file?.name ?? "", effectiveDate: meta?.ex.effectiveDate ?? null, engine: meta ? `${meta.provider}:${meta.model}` : "" },
      });
      if (!res.ok) { setError(res.message); return; }
      toast(res.message);
      if (res.warning) setError(res.warning);
      setMeta(null); setRows([]); setExtras([]); setNotes([]); setFile(null);
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
      <h2 id="pdf-import-h" className="font-serif text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Import Official Rate Card · {paper.name}</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Drop in {paper.name}&rsquo;s tariff sheet and we&rsquo;ll pull out the rates. Nothing goes live until you&rsquo;ve checked every number below.</p>

      <div role="radiogroup" aria-label="Parser" className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Parser:</span>
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {(["claude", "gemini"] as const).map((e) => {
            const configured = ai ? ai.keys[e].configured : true;
            return (
              <button key={e} type="button" role="radio" aria-checked={engine === e} disabled={!!busy} onClick={() => setEngine(e)}
                className={cn("rounded-md px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50", engine === e ? "bg-[#2563EB] text-white shadow-[inset_0_-1px_0_rgba(0,0,0,.18)]" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700")}>
                {e === "claude" ? "Claude" : "Gemini"}
                {!configured && <span className="ml-1.5 text-[10px] font-normal opacity-80">no key</span>}
              </button>
            );
          })}
        </div>
      </div>
      {ai && !ai.keys[engine].configured && <p className="mt-1.5 text-xs text-[#1D4ED8] dark:text-amber-300">There&rsquo;s no {engine === "claude" ? "Claude" : "Gemini"} key saved yet. Add one in AI Settings, or pick the other parser.</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
        <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3", file ? "border-[#2563EB]/60 bg-white dark:bg-slate-800" : "border-slate-300 bg-[#F1F5F9] dark:border-slate-600 dark:bg-slate-800/60")}>
          <input ref={fileRef} id="rate-pdf-file" type="file" accept="application/pdf,.pdf" disabled={!!busy} className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setError("");
              if (f && !/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { setError("That doesn\u2019t look like a PDF."); setFile(null); return; }
              if (f && f.size > MAX_BYTES) { setError(`That PDF is ${(f.size / 1048576).toFixed(1)} MB; the limit is 4 MB. Compress it or upload only the rate pages.`); setFile(null); return; }
              setFile(f);
            }} />
          {file ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-10 w-9 shrink-0 place-items-center rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] text-[9px] font-black tracking-wider text-[#2563EB] shadow-[1px_1px_0_#E2E8F0] dark:border-slate-600 dark:bg-slate-900">PDF</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{file.name}</span><span className="block text-xs text-slate-500">{fmtSize(file.size)} · ready to extract</span></span>
            </div>
          ) : (
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No sheet in the tray yet</p><p className="text-xs text-slate-500">PDF only, up to 4 MB.</p></div>
          )}
          <label htmlFor="rate-pdf-file" className={cn("cursor-pointer rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-800 shadow-[0_1px_0_#D6D3D1] hover:bg-slate-50 focus-within:outline-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50", !!busy && "pointer-events-none opacity-50")}>{file ? "Change PDF" : "Browse PDF"}</label>
        </div>
        <button type="button" onClick={() => void extract()} disabled={!file || !!busy} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_0_#000] hover:bg-[#1E293B] active:translate-y-px active:shadow-none disabled:opacity-50">
          {busy === "reading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />} {busy === "reading" ? "Reading…" : "Extract Rates"}
        </button>
      </div>
      {busy === "reading" && <div className="mt-3"><CourierLoader pct={pct} finishing={finishing} /><p className="mt-1.5 text-xs text-slate-500 tabular-nums">{elapsed.toFixed(0)}s so far · usually 10–25 seconds</p></div>}
      {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}

      {meta && (
        <div className="mt-5 space-y-4">
          {truncated && <p role="alert" className="flex items-start gap-2 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />The read was cut short, so the last rows may be missing. Compare the table with the PDF, or upload fewer pages and extract again.</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span>Read by <b>{meta.provider === "claude" ? "Claude" : "Gemini"}</b> <em className="text-slate-500">(numbers look off? switch parser above and extract again)</em></span>
            <span>Effective date: <b>{meta.ex.effectiveDate ?? "not found"}</b></span>
            <span>GST: <b>{meta.ex.gstIncluded === true ? "included" : meta.ex.gstIncluded === false ? "extra" : "not stated"}</b></span>
            <span>Confidence: <b>{meta.ex.confidence != null ? `${Math.round(meta.ex.confidence * (meta.ex.confidence <= 1 ? 100 : 1))}%` : "n/a"}</b></span>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">No rates could be matched to {paper.name}&rsquo;s editions and categories. See the notes below, or check you picked the right publication.</p>
          ) : (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-block h-2.5 w-2.5 rounded-sm border border-red-500 bg-red-100 align-middle" /> missing &nbsp; <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-500 bg-amber-100 align-middle" /> uncertain / derived (check against the PDF). Editing a cell marks it as checked. {flagged > 0 && <b className="text-amber-800 dark:text-amber-300">{flagged} cell{flagged === 1 ? "" : "s"} to verify.</b>}
              </p>
              <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[1400px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>
                    <th className="px-2 py-2">Use</th><th className="px-2 py-2">Edition</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Ad type</th>
                    {NUMS.map((c) => <th key={c.key} className="px-2 py-2 text-right whitespace-nowrap">{c.label}</th>)}<th className="px-2 py-2">Source</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r) => {
                      const errs = r.include ? problems.get(r.uid) ?? [] : [];
                      return (
                        <tr key={r.uid} className={cn("border-t border-slate-200 align-top dark:border-slate-700", !r.include && "opacity-45", errs.length > 0 && "bg-red-50/60 dark:bg-red-950/20")}>
                          <td className="px-2 py-1.5"><input type="checkbox" checked={r.include} onChange={(e) => edit(r.uid, { include: e.target.checked })} aria-label={`Include ${r.edition} ${r.category} ${r.ad_type}`} className="h-4 w-4 accent-[#2563EB]" /></td>
                          <td className="px-2 py-1.5 font-semibold whitespace-nowrap">{r.edition === "all" ? "All editions" : r.edition}</td>
                          <td className="px-2 py-1.5">{r.category === "all" ? "All" : r.category}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.ad_type}</td>
                          {NUMS.map((c) => (
                            <td key={c.key} className="px-2 py-1.5 text-right">
                              {c.types.includes(r.ad_type)
                                ? <input type="number" min={0} step={c.step} value={r[c.key] ?? ""} aria-label={`${c.label} for ${r.edition} ${r.category}`} className={cellCls(r.flags[c.key])}
                                    onChange={(e) => edit(r.uid, { [c.key]: e.target.value === "" ? (c.key === "min_lines" || c.key === "min_sq_cm" || c.key === "color_sq_cm_rate" || c.key === "word_rate" || c.key === "eng_word_rate" || c.key === "caps_word_rate" || c.key === "heading_line_rate" || c.key === "min_words" ? null : 0) : Number(e.target.value) } as Partial<ImportRow>, c.key)} />
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

          {extras.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">Page premiums, combo packages &amp; add-ons</h3>
              <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr><th className="px-2 py-2">Use</th><th className="px-2 py-2">Item</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Printed values (editable)</th></tr></thead>
                  <tbody>
                    {extras.map((x) => (
                      <tr key={x.uid} className={cn("border-t border-slate-200 align-top dark:border-slate-700", !x.include && "opacity-45")}>
                        <td className="px-2 py-1.5"><input type="checkbox" checked={x.include} aria-label={`Include ${x.label}`} className="h-4 w-4 accent-[#2563EB]" onChange={(e) => setExtras((xs) => xs.map((y) => y.uid === x.uid ? { ...y, include: e.target.checked } : y))} /></td>
                        <td className="px-2 py-1.5 font-semibold">{x.label}</td>
                        <td className="px-2 py-1.5 text-slate-500">{x.source}</td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap gap-2">
                            {(x.kind === "page_premium" ? [["percent", "+ %"], ["rate_per_sq_cm", "B&W ₹ / cm²"], ["color_rate_per_sq_cm", "Colour ₹ / cm²"]] : x.kind === "addon" ? [["tint_percent", "Tint %"], ["underline_percent", "Underline %"], ["box_percent", "Box %"], ["box_fee", "Box ₹"]] : []).map(([k, lab]) => (
                              <label key={k} className="flex items-center gap-1">{lab}
                                <input type="number" min={0} step="0.01" value={(x.data[k] as number | null) ?? ""} className="w-20 rounded border border-slate-300 px-1.5 py-1 text-right tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                  onChange={(e) => setExtras((xs) => xs.map((y) => y.uid === x.uid ? { ...y, data: { ...y.data, [k]: e.target.value === "" ? null : Number(e.target.value) } } : y))} />
                              </label>
                            ))}
                            {x.kind === "addon" && Array.isArray(x.data.highlighter) && <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">Highlighter: {(x.data.highlighter as { min: number; max: number | null; fee: number }[]).map((h) => `${h.min}${h.max == null ? "+" : h.max !== h.min ? `–${h.max}` : ""} ed. ₹${h.fee}`).join(" · ")}</span>}
                            {x.kind === "combo" && ((x.data.rates as { ad_type: string; category: string; sq_cm_rate: number; color_sq_cm_rate?: number | null; word_rate?: number | null; caps_word_rate?: number | null; heading_line_rate?: number | null }[]) ?? []).map((r) => <span key={r.ad_type + r.category} className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{r.ad_type === "classified-text" ? `classified text: ₹${r.word_rate ?? "?"}/word${r.caps_word_rate ? ` · caps ₹${r.caps_word_rate}` : ""}${r.heading_line_rate ? ` · heading ₹${r.heading_line_rate}/line` : ""}` : `${r.category === "all" ? "all" : r.category} · ${r.ad_type === "commercial-display" ? "display" : "classified display"}: ₹${r.sq_cm_rate}/cm²${r.color_sq_cm_rate ? ` · colour ₹${r.color_sq_cm_rate}` : ""}`}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                {!confirming ? (
                  <button type="button" onClick={() => setConfirming(true)} disabled={!included.length || blocked || !!busy} className="inline-flex items-center gap-2 rounded-md bg-[#059669] px-4 py-2 text-sm font-bold text-white hover:bg-[#047857] disabled:opacity-50">
                    {busy === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Apply &amp; Save Rates ({included.length})
                  </button>
                ) : (
                  <div role="alertdialog" aria-label="Confirm import mode" className="w-full max-w-2xl space-y-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                    <fieldset className="space-y-1.5">
                      <legend className="font-semibold">How should these {included.length} rows be saved for {paper.name}?</legend>
                      <label className="flex cursor-pointer items-start gap-2"><input type="radio" name="import-mode" className="mt-1 accent-[#059669]" checked={mode === "merge"} onChange={() => setMode("merge")} />
                        <span><b>Merge / Update matching rows (keep existing ad types)</b><span className="block text-xs opacity-80">Adds new rows and updates rows with the same edition, category and ad type. Nothing else is deleted, so Display and Classified PDFs can be uploaded one after the other.</span></span></label>
                      <label className="flex cursor-pointer items-start gap-2"><input type="radio" name="import-mode" className="mt-1 accent-[#059669]" checked={mode === "replace"} onChange={() => setMode("replace")} />
                        <span><b>Replace all rates for this publication</b><span className="block text-xs opacity-80">Deletes every other existing {paper.name} rate (old, seed and dummy ones included) and its page premiums, combos and add-ons.</span></span></label>
                    </fieldset>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void apply()} className="rounded-md bg-[#059669] px-3 py-1 text-xs font-bold text-white hover:bg-[#047857]">{mode === "merge" ? "Yes, merge & save" : "Yes, replace & save"}</button>
                      <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-amber-500 px-3 py-1 text-xs font-bold">Cancel</button>
                    </div>
                  </div>
                )}
                {blocked && <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Fix the highlighted rows (or untick them) to continue.</span>}
              </div>
              {!blocked && included.length > 0 && <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Rows you approve go live in the booking calculator at once (merge keeps other existing rows; replace removes them). Unticked rows are not saved.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

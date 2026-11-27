"use client";

import Link from "next/link";
import { FolderUp, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { MAX_TEMPLATE_BYTES, MEDIA_TYPES, mediaTypeOf, TEMPLATE_ACCEPT, TEMPLATE_BUCKET, TEMPLATE_CATEGORIES, TEMPLATE_KINDS, titleFromFilename, type CustomTemplate, type TemplateCategory, type TemplateKind } from "@/lib/custom-templates";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900";
const lbl = "mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-100";
const field = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const btn = "btn-fx inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#D12014] px-4 text-sm font-bold text-white hover:bg-[#A91400] disabled:opacity-60";

interface Meta { kind: TemplateKind; category: TemplateCategory; greetingFormat: string; title: string; description?: string }

/** Uploads one file straight to Storage through a signed URL, then records it. Throws a readable message. */
async function publish(file: File, m: Meta): Promise<CustomTemplate> {
  const contentType = mediaTypeOf(file);
  if (!MEDIA_TYPES[contentType]) throw new Error("Use PNG, JPG, WEBP, MP4 or MOV.");
  if (file.size > MAX_TEMPLATE_BYTES) throw new Error("Files can be up to 16 MB.");
  if (MEDIA_TYPES[contentType].media === "video" && m.kind !== "greeting") throw new Error("Videos can only be Greeting templates.");
  const r1 = await fetch("/api/admin/templates/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType, size: file.size }) });
  const j1 = await r1.json().catch(() => ({}));
  if (!r1.ok) throw new Error(j1.error ?? "Couldn't prepare the upload.");
  const sb = createClient();
  if (!sb) throw new Error("Supabase isn't configured.");
  const up = await sb.storage.from(TEMPLATE_BUCKET).uploadToSignedUrl(j1.path, j1.token, file, { contentType });
  if (up.error) throw new Error("Upload failed. Check your connection and try again.");
  const r2 = await fetch("/api/admin/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: m.title, description: m.description ?? "", kind: m.kind, category: m.category, greetingFormat: m.greetingFormat, path: j1.path }) });
  const j2 = await r2.json().catch(() => ({}));
  if (!r2.ok) throw new Error(j2.error ?? "Couldn't save the template.");
  return j2.template as CustomTemplate;
}

const isVideo = (f: File) => MEDIA_TYPES[mediaTypeOf(f)]?.media === "video";
function Thumb({ src, video, className }: { src: string; video: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return video ? <video src={src} muted playsInline preload="metadata" className={className} /> : <img src={src} alt="" draggable={false} className={className} />;
}

interface Row { key: string; file: File; url: string; title: string; keep: boolean; problem: string | null; state: "idle" | "up" | "done" | "error"; error?: string }

export function CompanyTemplates() {
  const toast = useToast();
  const [list, setList] = useState<CustomTemplate[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/templates", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setLoadError(j.error ?? "Couldn't load templates."); setList([]); return; }
    setLoadError(j.error ?? ""); setList(j.templates ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  // ── single upload ──
  const [s, setS] = useState<Meta>({ kind: "invitation", category: "wedding", greetingFormat: "Dear {Name}, {Place}", title: "" });
  const [sFile, setSFile] = useState<File | null>(null), [sBusy, setSBusy] = useState(false), [sError, setSError] = useState("");
  const sUrl = useMemo(() => (sFile ? URL.createObjectURL(sFile) : ""), [sFile]);
  useEffect(() => () => { if (sUrl) URL.revokeObjectURL(sUrl); }, [sUrl]);
  const sRef = useRef<HTMLInputElement>(null);
  const submitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sFile) { setSError("Choose an image or video."); return; }
    if (!s.title.trim()) { setSError("Enter a title."); return; }
    setSError(""); setSBusy(true);
    try { const t = await publish(sFile, s); setList((l) => [t, ...(l ?? [])]); setSFile(null); setS((v) => ({ ...v, title: "" })); toast("Template published. It's live in the client studio."); }
    catch (err) { setSError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setSBusy(false); }
  };

  // ── bulk upload ──
  const [b, setB] = useState<Omit<Meta, "title">>({ kind: "invitation", category: "wedding", greetingFormat: "Dear {Name}, {Place}" });
  const [rows, setRows] = useState<Row[]>([]), [running, setRunning] = useState(false), [drag, setDrag] = useState(false);
  const dirRef = useRef<HTMLInputElement>(null), filesRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = dirRef.current; if (el) { el.setAttribute("webkitdirectory", ""); el.setAttribute("directory", ""); } }, []);
  const rowsRef = useRef(rows); rowsRef.current = rows;
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.url)), []);
  const problemOf = useCallback((f: File, kind: TemplateKind): string | null => {
    const t = mediaTypeOf(f);
    if (!MEDIA_TYPES[t]) return "Not a PNG, JPG, WEBP, MP4 or MOV";
    if (f.size > MAX_TEMPLATE_BYTES) return "Over 16 MB";
    if (MEDIA_TYPES[t].media === "video" && kind !== "greeting") return "Videos need the Greeting type";
    return null;
  }, []);
  const addFiles = (fl: FileList | File[] | null) => {
    const files = Array.from(fl ?? []).filter((f) => !!MEDIA_TYPES[mediaTypeOf(f)] && !f.name.startsWith("."));
    if (!files.length) { toast("No PNG, JPG, WEBP, MP4 or MOV files found there."); return; }
    setRows((cur) => [...cur, ...files.map((f) => ({ key: `${f.name}-${f.size}-${crypto.randomUUID()}`, file: f, url: URL.createObjectURL(f), title: titleFromFilename(f.name), keep: true, problem: problemOf(f, b.kind), state: "idle" as const }))]);
  };
  // The type chosen for the batch decides which videos are allowed.
  useEffect(() => { setRows((cur) => cur.map((r) => ({ ...r, problem: problemOf(r.file, b.kind) }))); }, [b.kind, problemOf]);
  const patchRow = (key: string, p: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const ready = rows.filter((r) => r.keep && !r.problem && r.state !== "done");
  const done = rows.filter((r) => r.state === "done").length, failed = rows.filter((r) => r.state === "error").length;
  const clearRows = () => { rows.forEach((r) => URL.revokeObjectURL(r.url)); setRows([]); };
  const uploadAll = async () => {
    const queue = [...ready];
    if (!queue.length) return;
    setRunning(true);
    let ok = 0;
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        patchRow(r.key, { state: "up", error: undefined });
        try { const t = await publish(r.file, { ...b, title: r.title.trim() || titleFromFilename(r.file.name) }); setList((l) => [t, ...(l ?? [])]); patchRow(r.key, { state: "done" }); ok++; }
        catch (err) { patchRow(r.key, { state: "error", error: err instanceof Error ? err.message : "Failed" }); }
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
    toast(ok ? `${ok} template${ok === 1 ? "" : "s"} published to the client studio.` : "Nothing was published. See the errors below.");
  };

  // ── existing grid ──
  const [fKind, setFKind] = useState<"all" | TemplateKind>("all"), [fCat, setFCat] = useState<"all" | TemplateCategory>("all"), [busy, setBusy] = useState<string | null>(null);
  const shown = (list ?? []).filter((t) => (fKind === "all" || t.kind === fKind) && (fCat === "all" || t.category === fCat));
  const toggle = async (t: CustomTemplate) => {
    setList((l) => (l ?? []).map((x) => (x.id === t.id ? { ...x, is_active: !t.is_active } : x))); // optimistic
    const r = await fetch("/api/admin/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, is_active: !t.is_active }) });
    if (!r.ok) { setList((l) => (l ?? []).map((x) => (x.id === t.id ? { ...x, is_active: t.is_active } : x))); toast("Couldn't change that template."); }
  };
  const remove = async (t: CustomTemplate) => {
    if (!window.confirm(`Delete "${t.title}"? This also removes its file and can't be undone.`)) return;
    setBusy(t.id);
    const r = await fetch("/api/admin/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) });
    setBusy(null);
    if (r.ok) setList((l) => (l ?? []).filter((x) => x.id !== t.id)); else toast("Couldn't delete that template.");
  };

  const kindSel = (v: TemplateKind, on: (k: TemplateKind) => void, id: string) => (
    <select id={id} className={field} value={v} onChange={(e) => on(e.target.value as TemplateKind)}>{TEMPLATE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
  );
  const catSel = (v: TemplateCategory, on: (c: TemplateCategory) => void, id: string) => (
    <select id={id} className={field} value={v} onChange={(e) => on(e.target.value as TemplateCategory)}>{TEMPLATE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Company Templates</h1>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Designs you publish here appear straight away in the client Invitation &amp; Greeting studio (Step 1), under the matching category. Images work for both types; videos are Greeting templates. The built-in designs (shown or hidden, not uploaded) are managed on <Link href="/admin/invitations" className="font-bold text-[#D12014] underline">Built-in designs</Link>.</p>
      </div>

      <section className={card} aria-labelledby="single-h">
        <h2 id="single-h" className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Upload one template</h2>
        <form onSubmit={submitSingle} className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="t-title" className={lbl}>Template title</label><input id="t-title" className={field} value={s.title} maxLength={80} onChange={(e) => setS({ ...s, title: e.target.value })} placeholder="Royal Gold Wedding" /></div>
          <div><label htmlFor="t-kind" className={lbl}>Type</label>{kindSel(s.kind, (kind) => setS({ ...s, kind }), "t-kind")}</div>
          <div><label htmlFor="t-cat" className={lbl}>Category</label>{catSel(s.category, (category) => setS({ ...s, category }), "t-cat")}</div>
          <div><label htmlFor="t-fmt" className={lbl}>Default greeting line</label><input id="t-fmt" className={field} value={s.greetingFormat} maxLength={120} onChange={(e) => setS({ ...s, greetingFormat: e.target.value })} placeholder="Dear {Name}, {Place}" /></div>
          <div className="sm:col-span-2">
            <label htmlFor="t-file" className={lbl}>Image (PNG / JPG / WEBP) or video (MP4 / MOV), up to 16 MB</label>
            <input id="t-file" ref={sRef} type="file" accept={TEMPLATE_ACCEPT} onChange={(e) => { const f = e.target.files?.[0] ?? null; setSFile(f); if (f && !s.title) setS((v) => ({ ...v, title: titleFromFilename(f.name) })); }} className="block w-full text-sm text-slate-800 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white dark:text-slate-100 dark:file:bg-white dark:file:text-slate-900" />
            {sFile && <Thumb src={sUrl} video={isVideo(sFile)} className="mt-2 h-40 rounded-lg border border-slate-200 object-contain dark:border-slate-700" />}
          </div>
          {sError && <p role="alert" className="text-sm font-semibold text-red-800 sm:col-span-2 dark:text-red-200">{sError}</p>}
          <div className="sm:col-span-2"><button type="submit" disabled={sBusy} className={btn}>{sBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}{sBusy ? "Publishing…" : "Upload & Publish"}</button></div>
        </form>
      </section>

      <section className={card} aria-labelledby="bulk-h">
        <h2 id="bulk-h" className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Bulk upload a folder</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="b-kind" className={lbl}>Type for all</label>{kindSel(b.kind, (kind) => setB({ ...b, kind }), "b-kind")}</div>
          <div><label htmlFor="b-cat" className={lbl}>Category for all</label>{catSel(b.category, (category) => setB({ ...b, category }), "b-cat")}</div>
          <div><label htmlFor="b-fmt" className={lbl}>Default greeting line</label><input id="b-fmt" className={field} value={b.greetingFormat} maxLength={120} onChange={(e) => setB({ ...b, greetingFormat: e.target.value })} /></div>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          className={cn("mt-3 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center", drag ? "border-[#D12014] bg-red-50 dark:bg-red-500/10" : "border-slate-300 dark:border-slate-600")}>
          <FolderUp className="h-8 w-8 text-[#D12014]" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Drop files here, or pick a whole folder</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => dirRef.current?.click()} className={btn}>Choose folder</button>
            <button type="button" onClick={() => filesRef.current?.click()} className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5">Choose files</button>
          </div>
          <input ref={dirRef} type="file" multiple className="sr-only" aria-label="Choose a folder of templates" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={filesRef} type="file" multiple accept={TEMPLATE_ACCEPT} className="sr-only" aria-label="Choose template files" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {rows.length > 0 && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" aria-live="polite">{running || done || failed ? `${done} of ${rows.filter((r) => r.keep && !r.problem).length} published${failed ? `, ${failed} failed` : ""}` : `${ready.length} ready to publish`}</p>
              <button type="button" onClick={() => void uploadAll()} disabled={running || ready.length === 0} className={btn}>{running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}Upload &amp; Publish All</button>
              <button type="button" onClick={clearRows} disabled={running} className="text-sm font-bold text-[#D12014] underline disabled:opacity-50">Clear list</button>
            </div>
            {(running || done > 0) && <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((100 * (done + failed)) / Math.max(1, rows.filter((r) => r.keep && !r.problem).length))}><div className="h-full bg-[#D12014] transition-all" style={{ width: `${(100 * (done + failed)) / Math.max(1, rows.filter((r) => r.keep && !r.problem).length)}%` }} /></div>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {rows.map((r) => (
                <li key={r.key} className={cn("rounded-lg border p-2", r.state === "done" ? "border-emerald-400" : r.state === "error" || r.problem ? "border-red-400" : "border-slate-200 dark:border-slate-700", !r.keep && "opacity-50")}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded bg-slate-100 dark:bg-white/5">
                    <Thumb src={r.url} video={isVideo(r.file)} className="h-full w-full object-cover" />
                    {r.state === "up" && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" /></div>}
                    {r.state === "done" && <span className="absolute top-1 right-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Published</span>}
                  </div>
                  <input aria-label={`Title for ${r.file.name}`} className={cn(field, "mt-2 h-9")} value={r.title} maxLength={80} disabled={running || r.state === "done"} onChange={(e) => patchRow(r.key, { title: e.target.value })} />
                  <label className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100"><input type="checkbox" checked={r.keep} disabled={running || r.state === "done"} onChange={(e) => patchRow(r.key, { keep: e.target.checked })} className="h-4 w-4 accent-[#D12014]" />Include</label>
                  {(r.problem || r.error) && <p role="alert" className="mt-1 text-[11px] font-semibold text-red-800 dark:text-red-200">{r.problem ?? r.error}</p>}
                  <button type="button" aria-label={`Remove ${r.file.name} from the list`} disabled={running} onClick={() => { URL.revokeObjectURL(r.url); setRows((c) => c.filter((x) => x.key !== r.key)); }} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-red-700 dark:text-slate-300"><X className="h-3 w-3" aria-hidden="true" />Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={card} aria-labelledby="all-h">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="all-h" className="text-lg font-bold text-slate-900 dark:text-white">Your templates {list ? `(${list.length})` : ""}</h2>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by type" className={cn(field, "w-auto")} value={fKind} onChange={(e) => setFKind(e.target.value as "all" | TemplateKind)}><option value="all">All types</option>{TEMPLATE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
            <select aria-label="Filter by category" className={cn(field, "w-auto")} value={fCat} onChange={(e) => setFCat(e.target.value as "all" | TemplateCategory)}><option value="all">All categories</option>{TEMPLATE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </div>
        </div>
        {loadError && <p role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">{loadError}</p>}
        {list === null ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-label="Loading" /> : shown.length === 0 ? <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">No templates here yet.</p> : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((t) => (
              <li key={t.id} className={cn("rounded-lg border border-slate-200 p-2 dark:border-slate-700", !t.is_active && "opacity-70")} data-template-id={t.id}>
                <div className="aspect-[3/4] overflow-hidden rounded bg-slate-100 dark:bg-white/5"><Thumb src={t.media_url} video={t.media_type === "video"} className="h-full w-full object-cover" /></div>
                <p className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white" title={t.title}>{t.title}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{TEMPLATE_KINDS.find((k) => k.id === t.kind)?.label} · {TEMPLATE_CATEGORIES.find((c) => c.id === t.category)?.label} · {t.media_type}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button type="button" role="switch" aria-checked={t.is_active} aria-label={`${t.title}: ${t.is_active ? "active" : "hidden"}`} onClick={() => void toggle(t)} className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                    <span className={cn("relative h-5 w-9 rounded-full transition-colors", t.is_active ? "bg-emerald-600" : "bg-slate-400")}><span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", t.is_active ? "left-[18px]" : "left-0.5")} /></span>
                    {t.is_active ? "Active" : "Hidden"}
                  </button>
                  <button type="button" onClick={() => void remove(t)} disabled={busy === t.id} aria-label={`Delete ${t.title}`} className="rounded-md p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10">{busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

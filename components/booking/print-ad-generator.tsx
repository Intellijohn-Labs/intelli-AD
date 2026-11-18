"use client";

import { ImagePlus, Loader2, Printer, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { canvasToPng, renderPrintAd } from "@/lib/print-ad-render";
import { EMPTY_COPY, normalizeCopy, PRINT_CATEGORIES, PRINT_TEMPLATES, printCategoryFor, type MemorialFrame, type PhotoShape, type PrintAdCopy, type PrintCategory, type PrintTemplateId } from "@/lib/print-ad";
import { cn } from "@/lib/utils";
import type { FileMeta } from "@/lib/types";

const inp = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-[#D12014] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const lab = "mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200";

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/** "Print-Ready Newspaper Ad Generator": AI-structured copy typeset in authentic print templates, exported as a 300 dpi PNG. */
export function PrintAdGenerator({ open, onClose, categoryId, initialText, colorMode, widthCm, heightCm, photo, onUse }: {
  open: boolean;
  onClose: () => void;
  categoryId?: string | null;
  initialText: string;
  colorMode: "bw" | "color";
  widthCm: number;
  heightCm: number;
  photo: FileMeta | null;
  onUse: (file: File, meta: FileMeta) => void;
}) {
  const toast = useToast();
  const [category, setCategory] = useState<PrintCategory>(printCategoryFor(categoryId));
  const [language, setLanguage] = useState<"ml" | "en">("ml");
  const [details, setDetails] = useState(initialText);
  const [w, setW] = useState(widthCm);
  const [h, setH] = useState(heightCm);
  const [copy, setCopy] = useState<PrintAdCopy>(EMPTY_COPY);
  const [template, setTemplate] = useState<PrintTemplateId>(printCategoryFor(categoryId) === "obituary" ? "memorial" : "reverse");
  const [frame, setFrame] = useState<MemorialFrame>("traditional");
  const [shape, setShape] = useState<PhotoShape>("circle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [overflow, setOverflow] = useState(false);
  const run = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fresh state each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const cat = printCategoryFor(categoryId);
    setCategory(cat); setTemplate(cat === "obituary" ? "memorial" : "reverse");
    setDetails(initialText); setW(widthCm); setH(heightCm); setCopy(EMPTY_COPY); setError(""); setPreview("");
    setPhotoUrl(photo && photo.type.startsWith("image/") ? (photo.previewUrl ?? photo.url ?? null) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const hasCopy = !!(copy.headline || copy.bodyParagraph || copy.bulletPoints.length || copy.footerBox || copy.topBadge);
  const ok = Number.isFinite(w) && Number.isFinite(h) && w >= 2 && h >= 2;

  // Live preview (low dpi), re-typeset whenever the copy, template or size changes.
  useEffect(() => {
    if (!open || !hasCopy || !ok) return;
    const mine = ++run.current;
    const t = setTimeout(async () => {
      const img = template === "memorial" && photoUrl ? await loadImg(photoUrl) : null;
      const dpi = Math.max(40, Math.min(150, (520 / w) * 2.54));
      const r = await renderPrintAd({ copy, template, widthCm: w, heightCm: h, dpi, frame, photo: img, photoShape: shape, color: colorMode === "color" });
      if (mine !== run.current) return;
      setPreview(r.canvas.toDataURL("image/png")); setOverflow(r.overflow);
    }, 150);
    return () => clearTimeout(t);
  }, [open, copy, template, frame, shape, photoUrl, w, h, hasCopy, ok, colorMode]);

  const generate = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/ai/generate-print-ad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ details, category, language, widthCm: w, heightCm: h }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.copy) { setError(j.error ?? "The AI couldn't format this ad. You can still type the fields below by hand."); return; }
      setCopy(normalizeCopy(j.copy));
    } catch { setError("Couldn't reach the AI service. You can still type the fields below by hand."); }
    finally { setBusy(false); }
  }, [details, category, language, w, h]);

  if (!open || typeof document === "undefined") return null;
  const set = (patch: Partial<PrintAdCopy>) => setCopy((c) => ({ ...c, ...patch }));

  const use = async () => {
    setExporting(true);
    try {
      const img = template === "memorial" && photoUrl ? await loadImg(photoUrl) : null;
      const r = await renderPrintAd({ copy, template, widthCm: w, heightCm: h, dpi: 300, frame, photo: img, photoShape: shape, color: colorMode === "color" });
      const blob = await canvasToPng(r.canvas, r.dpi);
      const file = new File([blob], `print-ad-${template}-${r.dpi}dpi.png`, { type: "image/png" });
      onUse(file, { name: file.name, size: file.size, type: file.type, previewUrl: URL.createObjectURL(file) });
      toast(r.dpi === 300 ? "Print-ready 300 dpi PNG added as your ad artwork." : `Added as your ad artwork (${r.dpi} dpi: the size is very large).`);
      onClose();
    } catch (e) { toast(e instanceof Error ? e.message : "Couldn't export the design."); }
    finally { setExporting(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-stone-950/75 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="pad-title" className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 id="pad-title" className="text-base font-bold text-slate-900 dark:text-white">Print-Ready Newspaper Ad Generator</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">AI formats your details, then sets them in an authentic print layout at exactly {w} × {h} cm. Every word is typeset, never drawn by AI, so Malayalam stays correct.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lab} htmlFor="pad-cat">Category</label>
                <select id="pad-cat" className={inp} value={category} onChange={(e) => { const c = e.target.value as PrintCategory; setCategory(c); setTemplate(c === "obituary" ? "memorial" : template === "memorial" ? "reverse" : template); }}>
                  {PRINT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select></div>
              <div><label className={lab} htmlFor="pad-lang">Language</label>
                <select id="pad-lang" className={inp} value={language} onChange={(e) => setLanguage(e.target.value as "ml" | "en")}><option value="ml">Malayalam (മലയാളം)</option><option value="en">English</option></select></div>
              <div><label className={lab} htmlFor="pad-w">Width (cm)</label><input id="pad-w" type="number" min={2} step={0.5} className={inp} value={Number.isFinite(w) ? w : ""} onChange={(e) => setW(parseFloat(e.target.value))} /></div>
              <div><label className={lab} htmlFor="pad-h">Height (cm)</label><input id="pad-h" type="number" min={2} step={0.5} className={inp} value={Number.isFinite(h) ? h : ""} onChange={(e) => setH(parseFloat(e.target.value))} /></div>
            </div>
            <div>
              <label className={lab} htmlFor="pad-details">Your details (any language, rough notes are fine)</label>
              <textarea id="pad-details" rows={5} className={inp} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Sales executives wanted, 5 vacancies, Degree, ₹18,000, walk-in 12 Dec, Kochi, 98xxxxxx" />
            </div>
            <button type="button" onClick={() => void generate()} disabled={busy || details.trim().length < 3 || !ok} className="inline-flex items-center gap-1.5 rounded-full bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} {busy ? "Formatting…" : hasCopy ? "Regenerate copy" : "Generate print copy"}
            </button>
            {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">{error}</p>}

            <fieldset className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <legend className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Edit the text (updates the proof live)</legend>
              <div><label className={lab} htmlFor="pad-badge">Top badge</label><input id="pad-badge" className={inp} value={copy.topBadge} onChange={(e) => set({ topBadge: e.target.value })} /></div>
              <div><label className={lab} htmlFor="pad-head">Headline</label><input id="pad-head" className={inp} value={copy.headline} onChange={(e) => set({ headline: e.target.value })} /></div>
              <div><label className={lab} htmlFor="pad-sub">Subheadline</label><input id="pad-sub" className={inp} value={copy.subheadline} onChange={(e) => set({ subheadline: e.target.value })} /></div>
              <div><label className={lab} htmlFor="pad-bul">Bullet points (one per line)</label><textarea id="pad-bul" rows={4} className={inp} value={copy.bulletPoints.join("\n")} onChange={(e) => set({ bulletPoints: e.target.value.split("\n").map((l) => l.replace(/^\s*[-•▪■]\s*/, "")).filter((l, i, a) => l.trim() || i < a.length - 1) })} /></div>
              <div><label className={lab} htmlFor="pad-body">Body paragraph</label><textarea id="pad-body" rows={3} className={inp} value={copy.bodyParagraph} onChange={(e) => set({ bodyParagraph: e.target.value })} /></div>
              <div><label className={lab} htmlFor="pad-foot">Footer box (contact / venue / funeral timing)</label><textarea id="pad-foot" rows={2} className={inp} value={copy.footerBox} onChange={(e) => set({ footerBox: e.target.value })} /></div>
            </fieldset>
          </div>

          <div className="space-y-3">
            <div role="radiogroup" aria-label="Template" className="grid gap-2 sm:grid-cols-3">
              {PRINT_TEMPLATES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={template === t.id} onClick={() => setTemplate(t.id)} className={cn("rounded-lg border p-2 text-left text-xs transition-colors", template === t.id ? "border-[#D12014] bg-[#D12014]/10 ring-1 ring-[#D12014]" : "border-slate-300 hover:border-slate-400 dark:border-slate-600")}>
                  <span className="block font-bold text-slate-900 dark:text-white">{t.label}</span>
                  <span className="block text-slate-600 dark:text-slate-300">{t.note}</span>
                </button>
              ))}
            </div>
            {template === "memorial" && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
                <select aria-label="Frame" className={cn(inp, "w-auto")} value={frame} onChange={(e) => setFrame(e.target.value as MemorialFrame)}>
                  <option value="traditional">Traditional frame</option><option value="christian">Christian (cross) frame</option><option value="minimal">Minimal frame</option>
                </select>
                <select aria-label="Photo shape" className={cn(inp, "w-auto")} value={shape} onChange={(e) => setShape(e.target.value as PhotoShape)}>
                  <option value="circle">Circular portrait</option><option value="rect">Rectangular portrait</option>
                </select>
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><ImagePlus className="h-3.5 w-3.5" aria-hidden="true" /> {photoUrl ? "Change photo" : "Add portrait"}</button>
                {photoUrl && <button type="button" onClick={() => setPhotoUrl(null)} className="text-slate-600 underline dark:text-slate-300">Remove</button>}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoUrl(URL.createObjectURL(f)); e.target.value = ""; }} />
              </div>
            )}
            <div className="flex min-h-[320px] items-center justify-center rounded-lg bg-stone-200 p-3 dark:bg-stone-700">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Print ad proof" className="max-h-[62vh] max-w-full border border-stone-400 bg-white shadow-lg" style={{ aspectRatio: `${w} / ${h}` }} />
              ) : (
                <p className="max-w-xs text-center text-sm text-stone-700 dark:text-stone-200">Generate print copy (or type into the fields) and your ad appears here at the exact {w} × {h} cm shape.</p>
              )}
            </div>
            {overflow && <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">The text is very long for this box, so it is set small. Shorten the text or enlarge the size.</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-300">Exports a 300 dpi PNG and places it in your ad artwork slot and the Live Newspaper Proof.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="button" onClick={() => void use()} disabled={!hasCopy || !ok || exporting} className="inline-flex items-center gap-1.5 rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400] disabled:opacity-50">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />} {exporting ? "Rendering 300 dpi…" : "Use This Design"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

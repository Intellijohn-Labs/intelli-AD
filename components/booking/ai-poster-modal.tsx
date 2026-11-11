"use client";

import { Loader2, RefreshCw, Sparkles, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { nearestAspect, POSTER_STYLES, type PosterStyleId } from "@/lib/obituary-art";
import type { FileMeta } from "@/lib/types";

type Slot = { state: "idle" } | { state: "loading" } | { state: "ready"; mime: string; data: string } | { state: "error"; message: string };
const IDLE: Record<PosterStyleId, Slot> = { classic: { state: "idle" }, honored: { state: "idle" }, memoriam: { state: "idle" } };

/** Downscales the portrait to <= 1024 px JPEG so the request stays small. Returns null when there is no readable photo. */
async function photoPayload(photo: FileMeta | null): Promise<{ mime: "image/jpeg"; data: string } | null> {
  const src = photo?.previewUrl ?? photo?.url;
  if (!src) return null;
  const blob = await (await fetch(src)).blob();
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return { mime: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1] };
}

/** "✨ AI Poster Designer": three finished obituary ad designs from the notice text and the portrait; one can replace the ad artwork. */
export function AiPosterModal({ open, onClose, text, category, language, widthCm, heightCm, photo, onUse }: {
  open: boolean;
  onClose: () => void;
  text: string;
  category: "obituary" | "remembrance";
  language: "ml" | "en";
  widthCm: number;
  heightCm: number;
  photo: FileMeta | null;
  onUse: (file: File, meta: FileMeta) => void;
}) {
  const toast = useToast();
  const [slots, setSlots] = useState<Record<PosterStyleId, Slot>>(IDLE);
  const [zoom, setZoom] = useState<PosterStyleId | null>(null);
  const run = useRef(0);
  const busy = Object.values(slots).some((s) => s.state === "loading");

  useEffect(() => { if (open) { run.current++; setSlots(IDLE); setZoom(null); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (zoom) setZoom(null); else onClose(); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, zoom, onClose]);

  if (!open || typeof document === "undefined") return null;

  const set = (id: PosterStyleId, s: Slot) => setSlots((cur) => ({ ...cur, [id]: s }));
  const aspect = nearestAspect(widthCm, heightCm);

  const one = async (id: PosterStyleId, ph: Awaited<ReturnType<typeof photoPayload>>, mine: number) => {
    set(id, { state: "loading" });
    try {
      const res = await fetch("/api/ai/generate-obituary-art", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ styleId: id, text, category, language, aspect, widthCm, heightCm, photo: ph ?? undefined }) });
      const j = await res.json().catch(() => ({}));
      if (mine !== run.current) return;
      if (!res.ok || !j.data) set(id, { state: "error", message: j.error ?? "Couldn't design this style." });
      else set(id, { state: "ready", mime: j.mime, data: j.data });
    } catch { if (mine === run.current) set(id, { state: "error", message: "Couldn't reach the AI designer. Check your connection." }); }
  };

  const generate = async (only?: PosterStyleId) => {
    if (!text.trim()) { toast.error("ആദ്യം മാറ്റർ തയ്യാറാക്കുക (Fill in the notice details first)"); return; }
    const mine = ++run.current;
    let ph: Awaited<ReturnType<typeof photoPayload>> = null;
    try { ph = await photoPayload(photo); } catch { toast.error("Couldn't read the photo; designing without it."); }
    await Promise.all((only ? [only] : POSTER_STYLES.map((s) => s.id)).map((id) => one(id, ph, mine)));
  };

  const use = (id: PosterStyleId) => {
    const s = slots[id];
    if (s.state !== "ready") return;
    const bytes = Uint8Array.from(atob(s.data), (c) => c.charCodeAt(0));
    const ext = s.mime.includes("jpeg") ? "jpg" : "png";
    const file = new File([bytes], `obituary-poster-${id}.${ext}`, { type: s.mime });
    onUse(file, { name: file.name, size: file.size, type: file.type, previewUrl: URL.createObjectURL(file) });
    onClose();
  };

  const src = (s: Slot) => (s.state === "ready" ? `data:${s.mime};base64,${s.data}` : "");
  const anyReady = Object.values(slots).some((s) => s.state === "ready");

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-stone-950/75 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="poster-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 id="poster-title" className="text-base font-bold text-slate-900 dark:text-white">✨ AI പോസ്റ്റർ ഡിസൈനർ (Obituary Poster Generator)</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">മാറ്ററും ഫോട്ടോയും ഉപയോഗിച്ച് 3 ഡിസൈനുകൾ ഉണ്ടാക്കുന്നു ({widthCm} × {heightCm} cm, {aspect}).</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => generate()} disabled={busy} aria-busy={busy}
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_14px_rgba(124,58,237,0.5)] disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} ✨ AI പോസ്റ്റർ നിർമ്മിക്കുക (Generate 3 Ad Styles)
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-300">{photo ? "അപ്‌ലോഡ് ചെയ്ത ഫോട്ടോ ഉപയോഗിക്കും." : "ഫോട്ടോ ഇല്ല: ഫോട്ടോ ഇല്ലാതെ അലങ്കാര ഡിസൈൻ ഉണ്ടാക്കും."} ഓരോ ഡിസൈനും ഉണ്ടാക്കാൻ അര മിനിറ്റോളം എടുക്കും.</span>
          </div>
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            AI വരച്ച അക്ഷരങ്ങളിൽ തെറ്റുകൾ വരാം. തിരഞ്ഞെടുക്കുന്നതിനുമുമ്പ് പേര്, തീയതി, സമയം, സ്ഥലം എന്നിവ വലുതാക്കി കൃത്യമായി പരിശോധിക്കുക. തെറ്റുണ്ടെങ്കിൽ വീണ്ടും ഉണ്ടാക്കുക അല്ലെങ്കിൽ സാധാരണ ബിൽഡർ ഉപയോഗിക്കുക. (AI-drawn lettering can contain mistakes: zoom in and check every name, date, time and place before choosing.)
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {POSTER_STYLES.map((st) => {
              const s = slots[st.id];
              return (
                <div key={st.id} className="flex flex-col rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{st.ml}</p>
                  <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-300">{st.en} · {st.note}</p>
                  <div className="relative w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: aspect.replace(":", " / ") }}>
                    {s.state === "ready" && (
                      <button type="button" onClick={() => setZoom(st.id)} aria-label={`Expand ${st.en}`} className="group absolute inset-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src(s)} alt={`${st.en} obituary design`} className="h-full w-full object-contain" />
                        <span className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ZoomIn className="h-4 w-4" aria-hidden="true" /></span>
                      </button>
                    )}
                    {s.state === "loading" && <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"><Loader2 className="h-6 w-6 animate-spin text-violet-600" aria-hidden="true" /></div>}
                    {s.state === "error" && <p className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs font-medium text-rose-700 dark:text-rose-300">{s.message}</p>}
                    {s.state === "idle" && <p className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-slate-400">ഡിസൈൻ ഇവിടെ കാണാം</p>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => use(st.id)} disabled={s.state !== "ready"} className="flex-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40">Use This Design / ഈ ഡിസൈൻ തിരഞ്ഞെടുക്കുക</button>
                    {(s.state === "ready" || s.state === "error") && <button type="button" onClick={() => generate(st.id)} disabled={busy} aria-label={`Regenerate ${st.en}`} className="rounded-full border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                  </div>
                </div>
              );
            })}
          </div>
          {anyReady && <p className="text-xs text-slate-500 dark:text-slate-300">തിരഞ്ഞെടുത്താൽ ഈ ചിത്രം പരസ്യ ആർട്ട്‌വർക്കായി (Upload mode) മാറും. പഴയ ബിൽഡറിലേക്ക് മടങ്ങാൻ "Build from template" തിരഞ്ഞെടുക്കാം.</p>}
        </div>
      </div>

      {zoom && slots[zoom].state === "ready" && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4" onMouseDown={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(slots[zoom])} alt="Expanded design" className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl" />
          <button type="button" aria-label="Close preview" className="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-slate-800" onClick={() => setZoom(null)}><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}

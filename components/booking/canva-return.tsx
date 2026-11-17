"use client";

import { CheckCircle2, ClipboardPaste, FileUp, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { useI18n } from "@/context/language-context";
import { cn } from "@/lib/utils";

const MAX_MB = 25;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const okType = (f: File) => /^(image\/(png|jpe?g)|application\/pdf)$/i.test(f.type) || /\.(png|jpe?g|pdf)$/i.test(f.name);

/** Canva-style badge: turquoise-to-violet circle with a white "C" mark, drawn as inline SVG so it stays crisp at any size. */
export function CanvaMark({ className, size = 24 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} role="img" aria-label="Canva" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`cv-${id}`} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#00C4CC" /><stop offset="0.55" stopColor="#4F6BED" /><stop offset="1" stopColor="#7D2AE8" /></linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#cv-${id})`} />
      <path d="M31.2 29.4c-1.5 3.1-4.2 5.1-7.6 5.1-4.9 0-8.4-4-8.4-9.3 0-5.6 3.7-10.2 8.9-10.2 3.2 0 5.5 1.7 6.2 4.2.3 1.2-.4 2-1.4 2-.8 0-1.3-.5-1.7-1.4-.6-1.4-1.6-2.1-3.1-2.1-3.1 0-5.1 3.3-5.1 7.3 0 3.5 1.8 6 4.7 6 2 0 3.5-1 4.6-3.2.4-.8 1-1.1 1.7-.8.8.3 1 1.1.6 2.4z" fill="#fff" />
    </svg>
  );
}

/** Canva "create a design" link pre-sized to the ad (Canva takes width, height and units in the query string). */
export function canvaUrl(widthCm: number, heightCm: number) {
  const r = (n: number) => String(Math.round(n * 100) / 100);
  return `https://www.canva.com/design?create&width=${r(widthCm)}&height=${r(heightCm)}&units=cm`;
}

/**
 * "Edit in Canva": opens Canva in a new tab at the ad's print size and shows a focused "Return from Canva" card.
 * No Canva account link or API is involved: the designer comes back with a copied image (Paste Copied Design or Ctrl/Cmd+V)
 * or a downloaded PNG / JPG / PDF (drag and drop or file picker), and `onAttach` makes it the ad artwork.
 */
export function CanvaReturn({ widthCm, heightCm, onAttach, disabled = false }: { widthCm: number; heightCm: number; onAttach: (file: File) => void; /** True until a photo / artwork has been uploaded. */ disabled?: boolean }) {
  const { t } = useI18n();
  const w = Number.isFinite(widthCm) && widthCm > 0 ? widthCm : 8;
  const h = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 10;
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "hint"; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileId = useId();
  const panel = useRef<HTMLDivElement>(null);

  const attach = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!okType(file)) return setMsg({ kind: "err", text: t("Only PNG, JPG or PDF files are supported.") });
    if (file.size > MAX_MB * 1024 * 1024) return setMsg({ kind: "err", text: t("File is larger than {mb} MB.", { mb: MAX_MB }) });
    onAttach(file);
    setMsg({ kind: "ok", text: t("Design attached. Your proof preview has been updated.") });
  }, [onAttach, t]);

  // Ctrl+V / Cmd+V anywhere on the page while the helper is open.
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      const img = files.find((f) => f.type.startsWith("image/")) ?? files.find(okType);
      if (img) { e.preventDefault(); attach(img.name ? img : new File([img], "canva-design.png", { type: img.type })); }
      else if (!(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) setMsg({ kind: "err", text: t("No image found on the clipboard. In Canva, choose Share → Copy (or select the design and press Ctrl+C) first.") });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => { window.removeEventListener("paste", onPaste); document.removeEventListener("keydown", onKey); };
  }, [open, attach, t]);

  async function pasteButton() {
    setMsg(null);
    if (!navigator.clipboard?.read) return setMsg({ kind: "hint", text: t("Your browser can't read the clipboard from a button. Press Ctrl+V (Cmd+V on Mac) on this page instead.") });
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((x) => x.startsWith("image/"));
        if (type) { const blob = await item.getType(type); return attach(new File([blob], `canva-design.${type.split("/")[1]?.replace("jpeg", "jpg") || "png"}`, { type })); }
      }
      setMsg({ kind: "err", text: t("No image found on the clipboard. In Canva, choose Share → Copy (or select the design and press Ctrl+C) first.") });
    } catch {
      setMsg({ kind: "hint", text: t("Clipboard access was blocked. Press Ctrl+V (Cmd+V on Mac) on this page instead, or drop the downloaded file below.") });
    }
  }

  const size = `${Math.round(w * 100) / 100} × ${Math.round(h * 100) / 100} cm`;
  const btn = "inline-flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1 pr-4 pl-1.5 text-sm font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all dark:border-[#35363B] dark:bg-[#131416]";
  return (
    <>
      {disabled ? (
        <button type="button" disabled aria-disabled="true" title={t("Upload a photo or artwork first")} className={cn(btn, "cursor-not-allowed opacity-50 grayscale")}>
          <CanvaMark size={28} /> {t("Edit in Canva")}
        </button>
      ) : (
        <a href={canvaUrl(w, h)} target="_blank" rel="noopener noreferrer" onClick={() => { setMsg(null); setOpen(true); }} className={cn(btn, "hover:-translate-y-px hover:border-[#7D2AE8]/50 hover:shadow-[0_6px_16px_-8px_rgba(125,42,232,0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D2AE8]")}>
          <CanvaMark size={28} /> {t("Edit in Canva")}
        </a>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0A0B0D]/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="canva-return-h" className="w-full max-w-lg rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xl outline-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="canva-return-h" className="flex items-center gap-2 text-lg font-bold text-slate-900"><CanvaMark size={22} />{t("Return from Canva")}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t("1. Design at {size} in Canva → 2. Copy image (Ctrl+C) or Download, then click Paste Copied Design below.", { size })}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("Close")} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <button type="button" onClick={() => void pasteButton()} className={cn(buttonStyles({ variant: "primary" }), "mt-4 w-full bg-[#D12014] hover:bg-[#A91400] dark:bg-[#D12014]")}>
              <ClipboardPaste className="h-4 w-4" aria-hidden="true" /> {t("Paste Copied Design")}
            </button>
            <p className="mt-1.5 text-center text-xs text-slate-500">{t("or press Ctrl+V / Cmd+V anywhere on this page")}</p>

            <div className="my-4 flex items-center gap-3 text-xs font-semibold text-slate-400"><span className="h-px flex-1 bg-slate-200" />{t("OR")}<span className="h-px flex-1 bg-slate-200" /></div>

            <label
              htmlFor={fileId}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); attach(e.dataTransfer.files[0]); }}
              className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:outline-2 focus-within:outline-[#D12014]", dragging ? "border-[#D12014] bg-[#D12014]/5" : "border-slate-300 bg-slate-50 hover:border-slate-400")}
            >
              <FileUp className="h-5 w-5 text-[#D12014]" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-800">{t("Drop the downloaded PNG, JPG or PDF here, or click to browse")}</span>
              <span className="text-xs text-slate-500">{t("Up to {mb} MB", { mb: MAX_MB })}</span>
              <input id={fileId} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
            </label>

            <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
              {msg && (
                <p className={cn("flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm", msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : msg.kind === "err" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800")}>
                  {msg.kind === "ok" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}{msg.text}
                </p>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className={buttonStyles({ variant: "secondary", size: "sm" })}>{msg?.kind === "ok" ? t("Done") : t("Close")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

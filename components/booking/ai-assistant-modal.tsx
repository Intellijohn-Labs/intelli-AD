"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/toast";

interface Suggestion { id: number; style_name: string; text: string }

const PLACEHOLDER = "ഉദാ: അജയ് 26 വയസ്സ്, ഹിന്ദു ഈഴവ, സോഫ്റ്റ്‌വെയർ എൻജിനീയർ, അനുയോജ്യരായ പെൺകുട്ടികളുടെ മാതാപിതാക്കളിൽ നിന്ന് ആലോചന ക്ഷണിക്കുന്നു. ഫോൺ: 9876543210";
const NOTES = [
  "ചുരുങ്ങിയ ശൈലി: ആവശ്യമായ വിവരങ്ങൾ നിലനിർത്തി വരികൾ കുറച്ച് ചെലവ് ലാഭിക്കുന്നു",
  "പരമ്പരാഗത കേരള പത്ര ശൈലിയിലുള്ള ഔപചാരിക പദപ്രയോഗം",
  "എല്ലാ വിവരങ്ങളും വൃത്തിയായി ക്രമീകരിച്ച പൂർണ്ണ രൂപം",
];

const lineCount = (t: string, cpl: number) => t.split(/\r?\n/).reduce((n, l) => n + Math.max(1, Math.ceil(l.length / Math.max(1, cpl))), 0);

/** Dedicated AI prompt dialog: rough details in, three print-ready styles out. Portaled above the sticky chrome. */
export function AiAssistantModal({ open, onClose, initialText, category, newspaper, language, charsPerLine, onUse }: {
  open: boolean;
  onClose: () => void;
  initialText: string;
  category: string;
  newspaper: string;
  language: "ml" | "en";
  charsPerLine: number;
  onUse: (text: string) => void;
}) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<Suggestion[]>([]);
  const area = useRef<HTMLTextAreaElement | null>(null);

  // Each time the dialog opens, start from whatever is already in the ad box.
  useEffect(() => {
    if (!open) return;
    setPrompt(initialText);
    setOptions([]);
    setTimeout(() => area.current?.focus(), 50);
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

  if (!open || typeof document === "undefined") return null;

  const generate = async () => {
    if (!prompt.trim()) { toast.error("ദയവായി കുറച്ചു വിവരങ്ങൾ ടൈപ്പ് ചെയ്യുക (Please enter rough ad details first)"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate-ad-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roughText: prompt, category, newspaper, language }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(j.suggestions)) { toast.error(j.error ?? "Couldn't generate suggestions right now."); return; }
      setOptions(j.suggestions);
    } catch { toast.error("Couldn't reach the AI assistant. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  const baseLines = lineCount(prompt, charsPerLine);

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-stone-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ai-modal-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 id="ai-modal-title" className="text-base font-bold text-slate-900 dark:text-white">✨ AI പരസ്യ സഹായി (Newspaper Ad Generator)</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">പരസ്യത്തിൽ വരേണ്ട വിവരങ്ങൾ മലയാളത്തിലോ മംഗ്ലീഷിലോ ലളിതമായി ടൈപ്പ് ചെയ്യുക (Enter rough details/bullet points in Malayalam, Manglish, or English).</p>
          <textarea ref={area} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} maxLength={1500} placeholder={PLACEHOLDER} aria-label="Rough ad details"
            className="w-full rounded-lg border border-slate-300 bg-white p-3 font-serif text-sm text-slate-900 focus:border-violet-500 focus:outline focus:outline-1 focus:outline-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <button type="button" onClick={generate} disabled={busy} aria-busy={busy}
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_14px_rgba(124,58,237,0.5)] disabled:opacity-70">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} മാതൃകകൾ ഉണ്ടാക്കുക (Generate 3 Styles)
          </button>

          <div className="space-y-2" aria-live="polite">
            {busy && [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
            {!busy && options.map((o, i) => {
              const lines = lineCount(o.text, charsPerLine);
              const savedChars = prompt.trim().length - o.text.length;
              const savedLines = baseLines - lines;
              return (
                <div key={o.id} className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-violet-800 dark:text-violet-200">{o.style_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-300">{NOTES[i] ?? ""}</p>
                    </div>
                    <button type="button" onClick={() => { onUse(o.text); onClose(); }} className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700">Use This / ഈ മാറ്റർ ചേർക്കുക</button>
                  </div>
                  <p className="whitespace-pre-wrap font-serif text-sm text-slate-800 dark:text-slate-100">{o.text}</p>
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {o.text.length} characters · ~{lines} line{lines === 1 ? "" : "s"}
                    {i === 0 && savedChars > 0 && <span className="ml-1 text-emerald-600 dark:text-emerald-400">· {savedChars} fewer characters{savedLines > 0 ? `, ~${savedLines} line${savedLines === 1 ? "" : "s"} saved` : ""} than your draft</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

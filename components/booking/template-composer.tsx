"use client";

import { Check, Copy, Eraser, Loader2, PhoneCall, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/context/language-context";
import { CONTACT_SNIPPET, templatesForCategory, type TemplateLang } from "@/data/ad-templates";
import type { ParagraphSpacing } from "@/lib/paragraphs";
import type { CategoryId } from "@/lib/types";
import { findPlaceholders } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { ParagraphField } from "./paragraph-field";

const DEFAULT_PLACEHOLDER = "ഇവിടെ വിവരങ്ങൾ ഖണ്ഡികകളായി ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ മുകളിലുള്ള മാതൃകകളിൽ ക്ലിക്ക് ചെയ്യുക...";

/**
 * "Ad Content & Templates" box: one-click bilingual drafts for the chosen category, helper actions, and the editable
 * paragraph box with live counts. The text is the booking's ad text, so the proof and checkout follow every edit.
 */
export function TemplateComposer({
  categoryId,
  value,
  onChange,
  error,
  charsPerLine,
  maxChars,
  spacing,
  onSpacing,
  extra,
  hint,
  newspaper,
  categoryLabel,
}: {
  categoryId: CategoryId | null;
  value: string;
  onChange: (text: string) => void;
  error?: string;
  charsPerLine: number;
  maxChars?: number;
  spacing?: ParagraphSpacing;
  onSpacing?: (s: ParagraphSpacing) => void;
  extra?: ReactNode;
  hint?: string;
  newspaper?: string;
  categoryLabel?: string;
}) {
  const { lang: siteLang } = useI18n();
  const toast = useToast();
  const [lang, setLang] = useState<TemplateLang>(siteLang === "ml" ? "ml" : "en");
  const [activeId, setActiveId] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const templates = templatesForCategory(categoryId);
  const placeholders = findPlaceholders(value);
  const active = templates.find((t) => t.id === activeId) ?? templates[0];

  // A different category has different drafts: forget the previous pick.
  useEffect(() => setActiveId(null), [categoryId]);

  const apply = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setActiveId(id);
    onChange(tpl.text[lang]);
  };
  const insertContact = () => onChange(value.trim() ? `${value.replace(/\s+$/g, "")}\n${CONTACT_SNIPPET[lang]}` : CONTACT_SNIPPET[lang]);
  const copySample = async () => {
    if (!active) return;
    try { await navigator.clipboard.writeText(active.text[lang]); toast("Sample copied"); } catch { toast("Could not copy. Select the text and copy it manually."); }
  };

  // The assistant button only shows once the server confirms an API key is active for the chosen provider.
  const [aiReady, setAiReady] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/ai/status", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (live) setAiReady(j?.isConfigured === true); }).catch(() => { if (live) setAiReady(false); });
    return () => { live = false; };
  }, []);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOptions, setAiOptions] = useState<{ id: number; style_name: string; text: string }[]>([]);
  const suggest = async () => {
    if (!value.trim()) { toast.error("ദയവായി കുറച്ചു വിവരങ്ങൾ ടൈപ്പ് ചെയ്യുക (Please enter rough ad details first)"); return; }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/generate-ad-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roughText: value, category: categoryLabel ?? "", newspaper: newspaper ?? "", language: lang }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(j.suggestions)) { toast.error(j.error ?? "Couldn't generate suggestions right now."); return; }
      setAiOptions(j.suggestions);
    } catch { toast.error("Couldn't reach the AI assistant. Check your connection and try again."); }
    finally { setAiBusy(false); }
  };

  const link = "inline-flex items-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600";
  return (
    <div className="rounded-2xl border-2 border-blue-500/20 bg-white p-5 shadow-sm dark:border-blue-500/30 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ad Content &amp; Templates / പരസ്യ വിവരങ്ങളും മാതൃകകളും</h3>
        </div>
        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label="Template language">
          {(["ml", "en"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition-all", lang === l ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-300")}>
              {l === "ml" ? "മലയാളം" : "English"}
            </button>
          ))}
        </div>
      </div>

      {templates.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Ready-made templates">
          {templates.map((tpl) => (
            <button key={tpl.id} type="button" aria-pressed={activeId === tpl.id} onClick={() => apply(tpl.id)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600", activeId === tpl.id ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700")}>
              {activeId === tpl.id && <Check className="h-3 w-3" aria-hidden="true" />}
              {tpl.label[lang]}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-300">Choose a category in step 1 to see ready-made drafts.</p>
      )}

      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-300">Edit or paste your paragraphs below. Replace every [BRACKET].</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button type="button" onClick={insertContact} className={cn(link, "text-blue-600 hover:underline dark:text-blue-400")}><PhoneCall className="h-3 w-3" aria-hidden="true" /> {lang === "ml" ? "+ ഫോൺ നമ്പർ ചേർക്കുക" : "+ Insert contact"} / ഫോൺ നമ്പർ ചേർക്കുക</button>
          {active && <button type="button" onClick={copySample} className={cn(link, "text-slate-500 hover:text-blue-600 dark:text-slate-300")}><Copy className="h-3 w-3" aria-hidden="true" /> Copy sample</button>}
          {aiReady && <button type="button" onClick={suggest} disabled={aiBusy} aria-busy={aiBusy}
            className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-violet-600 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-[0_0_14px_rgba(124,58,237,0.55)] transition-shadow hover:shadow-[0_0_22px_rgba(124,58,237,0.8)] disabled:opacity-70">
            {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />} ✨ AI സഹായി (AI Suggestions)
          </button>}
          <button type="button" onClick={() => { onChange(""); setActiveId(null); }} className={cn(link, "text-slate-500 hover:text-rose-500 dark:text-slate-300")}><Eraser className="h-3 w-3" aria-hidden="true" /> Clear text</button>
        </div>
      </div>

      <ParagraphField
        id="ad-text"
        label="Ad text"
        required
        rows={6}
        value={value}
        onChange={onChange}
        error={error}
        hint={hint}
        placeholder={DEFAULT_PLACEHOLDER}
        charsPerLine={charsPerLine}
        maxChars={maxChars}
        spacing={spacing}
        onSpacing={onSpacing}
        extra={extra}
        textClassName="font-serif text-sm"
        textareaRef={(el) => { area.current = el; }}
      />

      {(aiBusy || aiOptions.length > 0) && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {aiBusy ? [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />) : aiOptions.map((o) => (
            <div key={o.id} className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-violet-800 dark:text-violet-200">{o.style_name}</span>
                <button type="button" onClick={() => { onChange(o.text); setAiOptions([]); }} className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white hover:bg-violet-700">Use This / തിരഞ്ഞെടുക്കുക</button>
              </div>
              <p className="whitespace-pre-wrap font-serif text-sm text-slate-800 dark:text-slate-100">{o.text}</p>
            </div>
          ))}
          {!aiBusy && <button type="button" onClick={() => setAiOptions([])} className="text-xs text-slate-500 hover:underline">Dismiss suggestions</button>}
        </div>
      )}

      {placeholders.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10" role="status">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Replace these [ ] placeholders with your details before continuing / ഈ [ ] ഭാഗങ്ങൾ നിങ്ങളുടെ വിവരങ്ങൾ കൊണ്ട് മാറ്റുക. Click one to select it, then type.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {placeholders.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const el = area.current;
                  const i = value.indexOf(p);
                  if (!el || i < 0) return;
                  el.focus();
                  el.setSelectionRange(i, i + p.length); // the next keystroke replaces it
                }}
                className="rounded-full border border-amber-400 bg-white px-2.5 py-0.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-600 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-500/20"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

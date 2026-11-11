"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AI_IMAGE_MODELS, AI_MODELS, AI_PROVIDER_LABEL, type AiProvider } from "@/lib/ai-config";
import { saveAiSettings, type AiSettingsState, type KeyInfo } from "./actions";

const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900";
const sel = "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function KeyField({ id, label, env, info, value, onChange, onClear, cleared }: { id: string; label: string; env: string; info: KeyInfo; value: string; onChange: (v: string) => void; onClear: () => void; cleared: boolean }) {
  const [show, setShow] = useState(false);
  const saved = info.configured && !cleared;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label} <span className="font-mono text-xs font-normal text-slate-500">({env})</span></label>
      <div className="flex gap-2">
        <input id={id} type={show ? "text" : "password"} autoComplete="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={saved ? `•••••••• saved (ends ${info.hint}${info.source === "env" ? ", from server env" : ""}) — paste to replace` : "Paste API key"} className={`${sel} font-mono`} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide key" : "Show key"} className="rounded border border-slate-300 px-3 dark:border-slate-700">
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {info.source === "db" && <button type="button" onClick={onClear} className="mt-1 text-xs text-rose-600 hover:underline">{cleared ? "Will be removed on save (undo: click Save after typing a key)" : "Remove stored key"}</button>}
    </div>
  );
}

function Status({ name, env, ok }: { name: string; env: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p><p className="font-mono text-xs text-slate-500">{env}</p></div>
      <span className={ok ? "inline-flex items-center gap-1 text-xs font-bold text-emerald-600" : "inline-flex items-center gap-1 text-xs font-bold text-rose-600"}>
        {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
        {ok ? "Configured" : "Not Configured"}
      </span>
    </div>
  );
}

export function AiSettingsForm({ initial }: { initial: AiSettingsState }) {
  const toast = useToast();
  const router = useRouter();
  const [provider, setProvider] = useState<AiProvider>(initial.config.provider);
  const [model, setModel] = useState(initial.config.model);
  const [imageModel, setImageModel] = useState(initial.config.imageModel);
  const [temp, setTemp] = useState(initial.config.temperature);
  const [gKey, setGKey] = useState("");
  const [cKey, setCKey] = useState("");
  const [gClear, setGClear] = useState(false);
  const [cClear, setCClear] = useState(false);
  const [pending, start] = useTransition();

  const pick = (p: AiProvider) => { setProvider(p); setModel(AI_MODELS[p][0].id); };
  const save = () => start(async () => {
    const r = await saveAiSettings({ provider, model, temperature: temp, imageModel, geminiKey: gKey, claudeKey: cKey, clearGemini: gClear && !gKey, clearClaude: cClear && !cKey });
    if (r.ok) { setGKey(""); setCKey(""); setGClear(false); setCClear(false); toast(r.message); router.refresh(); }
    else toast.error(r.message);
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-serif text-2xl font-black text-slate-900 dark:text-white">AI Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Powers the “AI സഹായി” ad-copy suggestions in the booking flow. Enter API keys below, or set them as server environment variables.</p>
      </div>
      <section className={`${card} space-y-2`} aria-label="Connection status">
        <Status name="Google Gemini" env="GEMINI_API_KEY" ok={initial.keys.gemini.configured} />
        <Status name="Anthropic Claude" env="ANTHROPIC_API_KEY" ok={initial.keys.claude.configured} />
      </section>
      <section className={`${card} space-y-4`}>
        <div>
          <label htmlFor="ai-provider" className="mb-1 block text-sm font-semibold">Active provider</label>
          <select id="ai-provider" className={sel} value={provider} onChange={(e) => pick(e.target.value as AiProvider)}>
            {(Object.keys(AI_PROVIDER_LABEL) as AiProvider[]).map((p) => <option key={p} value={p}>{AI_PROVIDER_LABEL[p]}</option>)}
          </select>
          {!(provider === "gemini" ? initial.keys.gemini.configured : initial.keys.claude.configured) && <p className="mt-1 text-xs text-amber-700">This provider’s key isn’t configured, so suggestions will fail until it is.</p>}
        </div>
        <div>
          <label htmlFor="ai-model" className="mb-1 block text-sm font-semibold">Model</label>
          <select id="ai-model" className={sel} value={model} onChange={(e) => setModel(e.target.value)}>
            {AI_MODELS[provider].map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ai-temp" className="mb-1 flex justify-between text-sm font-semibold"><span>Temperature</span><span className="font-mono">{temp.toFixed(2)}</span></label>
          <input id="ai-temp" type="range" min={0} max={1} step={0.05} value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="w-full" />
          <p className="text-xs text-slate-500">Lower is more literal and consistent (default 0.3). Applies to Gemini only; current Claude models don’t accept a temperature.</p>
        </div>
        <KeyField id="gemini-key" label="Gemini API key" env="GEMINI_API_KEY" info={initial.keys.gemini} value={gKey} onChange={setGKey} onClear={() => setGClear((v) => !v)} cleared={gClear} />
        <KeyField id="claude-key" label="Anthropic API key" env="ANTHROPIC_API_KEY" info={initial.keys.claude} value={cKey} onChange={setCKey} onClear={() => setCClear((v) => !v)} cleared={cClear} />
        <p className="text-xs text-slate-500">Keys are stored server-side in a table only the service role can read and are never sent back to this page. A key saved here takes priority over the server environment variable.</p>
        <div>
          <label htmlFor="ai-image-model" className="mb-1 block text-sm font-semibold">Obituary poster model (Gemini image)</label>
          <select id="ai-image-model" className={sel} value={imageModel} onChange={(e) => setImageModel(e.target.value)}>
            {AI_IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <p className={`mt-1 text-xs ${initial.keys.gemini.configured ? "text-emerald-700" : "text-amber-700"}`}>
            {initial.keys.gemini.configured ? "✓ Gemini is configured: the “AI പോസ്റ്റർ നിർമ്മിക്കുക” button is available to customers in the Obituary builder." : "Gemini isn’t configured: add a Gemini API key above to enable the obituary poster designer (it always uses Gemini, whichever provider is active for ad copy)."} Imagen isn’t offered because it can’t take the uploaded portrait.
          </p>
        </div>
        <Button type="button" onClick={save} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}Save settings</Button>
        {!initial.serviceRole && <p className="text-xs text-amber-700">SUPABASE_SERVICE_ROLE_KEY isn’t set on the server, so saving will fail.</p>}
      </section>
    </div>
  );
}

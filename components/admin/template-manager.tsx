"use client";

import { AlertTriangle, ArchiveRestore, Loader2, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { CUSTOM_TEMPLATE_ID, sampleFor, TEMPLATES as ALL_TEMPLATES, type TemplateCategory, type WeddingTemplate } from "@/lib/wedding";
import { renderWeddingCard } from "@/lib/wedding-render";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | TemplateCategory; label: string }[] = [
  { id: "all", label: "All" }, { id: "wedding", label: "Wedding" }, { id: "birthday", label: "Birthday" },
  { id: "housewarming", label: "Housewarming" }, { id: "baby", label: "Baby & Kids" }, { id: "events", label: "Events" }, { id: "inauguration", label: "Inauguration" },
];
/** The "Your own card" placeholder has no design of its own to enable or hide. */
const TEMPLATES = ALL_TEMPLATES.filter((t) => t.id !== CUSTOM_TEMPLATE_ID);
const CATEGORY_LABEL: Record<TemplateCategory, string> = { wedding: "Wedding", birthday: "Birthday", housewarming: "Housewarming", baby: "Baby & Kids", events: "Events", inauguration: "Inauguration" };

type Flags = { enabled: boolean; deleted: boolean };

/** Admin grid of every invitation template: enable / disable, delete (soft) and restore. Changes apply to the studio within seconds. */
export function TemplateManager({ initialDisabled, initialDeleted, available }: { initialDisabled: string[]; initialDeleted: string[]; available: boolean }) {
  const toast = useToast();
  const [flags, setFlags] = useState<Record<string, Flags>>(() => {
    const m: Record<string, Flags> = {};
    for (const t of TEMPLATES) m[t.id] = { enabled: !initialDisabled.includes(t.id), deleted: initialDeleted.includes(t.id) };
    return m;
  });
  const [filter, setFilter] = useState<"all" | TemplateCategory>("all");
  const [q, setQ] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const rendering = useRef(false);

  // Live thumbnails: the same renderer the studio uses, one template at a time with sample text.
  useEffect(() => {
    if (rendering.current) return;
    rendering.current = true;
    let live = true;
    void (async () => {
      for (const t of TEMPLATES) {
        if (!live) return;
        try {
          const c = await renderWeddingCard({ template: t, details: { ...sampleFor(t.defaultEvent), lang: "en" }, width: 260 });
          if (live) setThumbs((cur) => ({ ...cur, [t.id]: c.toDataURL("image/jpeg", 0.8) }));
        } catch { /* a thumbnail failing never blocks management */ }
      }
    })();
    return () => { live = false; rendering.current = false; };
  }, []);

  const save = async (t: WeddingTemplate, change: Partial<Flags>, ok: string) => {
    const before = flags[t.id];
    setFlags((f) => ({ ...f, [t.id]: { ...f[t.id], ...change } })); // optimistic
    setBusy(t.id);
    try {
      const res = await fetch("/api/admin/invitations/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: t.id, ...change }) });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
      toast(ok);
    } catch (e) {
      setFlags((f) => ({ ...f, [t.id]: before }));
      toast.error(e instanceof Error ? e.message : "Couldn't save the change.");
    } finally { setBusy(null); }
  };

  const deletedCount = TEMPLATES.filter((t) => flags[t.id].deleted).length;
  const activeCount = TEMPLATES.filter((t) => !flags[t.id].deleted && flags[t.id].enabled).length;
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TEMPLATES.filter((t) => flags[t.id].deleted === showDeleted
      && (filter === "all" || t.category === filter)
      && (!needle || `${t.name} ${t.id} ${t.ml} ${t.tagline}`.toLowerCase().includes(needle)));
  }, [flags, filter, q, showDeleted]);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-white">Invitation Templates</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Turn designs off or remove them from the Invitation Cards Studio. Cards guests already received keep working. {activeCount} of {TEMPLATES.length} templates are live.</p>

      {!available && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Changes can&apos;t be saved yet: set SUPABASE_SERVICE_ROLE_KEY and run the invitation_template_settings SQL from supabase/schema.sql.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">Search templates</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or id" className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-[#D12014] focus:ring-1 focus:ring-[#D12014] dark:border-slate-600 dark:bg-[#0A0B0D] dark:text-white" />
        </label>
        <button type="button" onClick={() => setShowDeleted((s) => !s)} aria-pressed={showDeleted} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold", showDeleted ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-100")}>
          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> {showDeleted ? "Back to templates" : `Restore deleted (${deletedCount})`}
        </button>
      </div>
      <div role="tablist" aria-label="Template categories" className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={cn("shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap", filter === f.id ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-100")}>{f.label}</button>
        ))}
      </div>

      {showDeleted && <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Deleted templates. Restore one to put it back in the studio.</p>}
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((t) => {
          const f = flags[t.id], pending = busy === t.id;
          return (
            <li key={t.id} className={cn("flex flex-col rounded-xl border bg-white p-2.5 shadow-[0_1px_0_rgba(24,24,27,.04)] dark:bg-[#131416]", f.deleted ? "border-dashed border-slate-300 dark:border-slate-600" : "border-[#E2E8F0] dark:border-slate-700")}>
              <div className={cn("aspect-[1080/1500] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5", (!f.enabled || f.deleted) && "opacity-50 grayscale")}>
                {thumbs[t.id]
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[t.id]} alt={`${t.name} template`} draggable={false} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{CATEGORY_LABEL[t.category]}</span>
                {t.premium && <span className="rounded-full bg-[#B8860B]/15 px-2 py-0.5 text-[10px] font-bold text-[#7A5A00] dark:text-[#E3BE5C]">Premium</span>}
                {f.deleted
                  ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Deleted</span>
                  : <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", f.enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200")}>{f.enabled ? "Active" : "Disabled"}</span>}
              </div>
              <p className="mt-1.5 text-sm leading-tight font-bold text-slate-900 dark:text-white">{t.name}</p>
              <p className="font-mono text-[11px] break-all text-slate-500 dark:text-slate-400">{t.id}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                {f.deleted ? (
                  <button type="button" disabled={pending} onClick={() => void save(t, { deleted: false }, `Restored “${t.name}”.`)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#0A0B0D] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#17181C] disabled:opacity-60 dark:bg-[#D12014] dark:hover:bg-[#E83E32]"><ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> Restore</button>
                ) : (
                  <>
                    <button type="button" role="switch" aria-checked={f.enabled} aria-label={`${f.enabled ? "Disable" : "Enable"} ${t.name}`} disabled={pending} onClick={() => void save(t, { enabled: !f.enabled }, f.enabled ? `Disabled “${t.name}”.` : `Enabled “${t.name}”.`)}
                      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60", f.enabled ? "bg-emerald-600" : "bg-slate-400 dark:bg-slate-600")}>
                      <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", f.enabled && "translate-x-5")} />
                    </button>
                    <button type="button" disabled={pending} aria-label={`Delete ${t.name}`} onClick={() => { if (confirm("Delete this template from the studio?")) void save(t, { deleted: true }, `Deleted “${t.name}”. You can restore it from “Restore deleted”.`); }} className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">{showDeleted ? "No deleted templates." : "No templates match."}</p>}
    </div>
  );
}

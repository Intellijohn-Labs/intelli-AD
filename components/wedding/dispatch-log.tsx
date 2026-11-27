"use client";

import { Loader2, Play, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clock } from "@/lib/invitation-cooldown";
import { TEMPLATES } from "@/lib/wedding";
import { CooldownPill } from "./cooldown-pill";
import { cn } from "@/lib/utils";

type Status = "sent" | "queued" | "failed";
interface Row { kind: "image" | "video"; videoUrl: string | null; id: string; guestName: string; phone: string; status: Status; templateId: string | null; createdAt: string; sentAt: string | null; reason: string }
interface Counts { total: number; sent: number; queued: number; failed: number }
type Tab = "all" | Status;

const POLL_MS = 5000;
const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const PILL: Record<Status, string> = {
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  queued: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
};
const LABEL: Record<Status, string> = { sent: "Sent", queued: "Queued", failed: "Failed" };
const templateName = (id: string | null) => (id ? TEMPLATES.find((t) => t.id === id)?.name ?? id : "—");

/**
 * The signed-in user's WhatsApp dispatch history (invitation_dispatches), independent of the guest list so it survives clearing it.
 * Refreshes by itself every few seconds while anything is still queued; `refreshKey` bumps it right after the studio sends.
 */
export function DispatchLog({ refreshKey, cooldownLeft, onReplied, hasReplied }: { refreshKey: number; cooldownLeft: (phone: string) => number; onReplied: (phone: string) => void; hasReplied: (phone: string) => boolean }) {
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ total: 0, sent: 0, queued: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<Set<string> | "all" | null>(null);
  const [note, setNote] = useState("");
  const [watching, setWatching] = useState<Row | null>(null); // rendered guest video open in the preview modal
  const [confirmClear, setConfirmClear] = useState(false), [deleting, setDeleting] = useState<Set<string> | "all" | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const mine = ++seq.current;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/invitations/dispatches${tab === "all" ? "" : `?status=${tab}`}`, { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { rows?: Row[]; counts?: Counts; error?: string };
      if (mine !== seq.current) return; // a newer request superseded this one
      if (res.redirected || !(res.headers.get("content-type") ?? "").includes("json")) { setError("Sign in to see your dispatch history."); setRows((r) => r ?? []); return; } // signed out: the proxy sent us to the login page
      if (!res.ok) { setError(j.error ?? "Couldn't load the dispatch log."); setRows((r) => r ?? []); return; }
      setError(null); setRows(j.rows ?? []); setCounts(j.counts ?? { total: 0, sent: 0, queued: 0, failed: 0 });
    } catch { if (mine === seq.current) setError("Couldn't reach the server."); }
    finally { if (mine === seq.current) setLoading(false); }
  }, [tab]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  // Poll while something is still queued (n8n / Waau report back later); pause in background tabs.
  useEffect(() => {
    if (counts.queued === 0 || error) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(true); }, POLL_MS);
    return () => clearInterval(t);
  }, [counts.queued, error, load]);

  const retry = async (ids: string[], phones: Record<string, string> = {}) => {
    for (let i = 0; i < ids.length; i += 5) {
      const res = await fetch("/api/invitations/dispatches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ids.slice(i, i + 5), repliedIds: ids.slice(i, i + 5).filter((id) => phones[id] && hasReplied(phones[id])) }) });
      if (!res.ok) { const j = (await res.json().catch(() => ({}))) as { error?: string }; throw new Error(j.error ?? "Retry failed."); }
    }
  };
  const retryOne = async (id: string) => {
    setRetrying(new Set([id])); setNote("");
    try { await retry([id], { [id]: rows?.find((x) => x.id === id)?.phone ?? "" }); setNote("Retry requested."); } catch (e) { setNote(e instanceof Error ? e.message : "Retry failed."); }
    setRetrying(null); await load(true);
  };
  const retryAll = async () => {
    setRetrying("all"); setNote("");
    try {
      const res = await fetch("/api/invitations/dispatches?status=failed", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { rows?: Row[] };
      const all = j.rows ?? [], ready = all.filter((r) => cooldownLeft(r.phone) === 0), cooling = all.length - ready.length;
      const ids = ready.map((r) => r.id);
      if (ids.length) await retry(ids, Object.fromEntries(ready.map((r) => [r.id, r.phone])));
      setNote(`${ids.length ? `Retried ${ids.length} failed dispatch${ids.length === 1 ? "" : "es"}.` : "Nothing to retry right now."}${cooling ? ` Skipped ${cooling} in cooldown timer.` : ""}`);
    } catch (e) { setNote(e instanceof Error ? e.message : "Retry failed."); }
    setRetrying(null); await load(true);
  };

  const drop = (r: Row) => { // keeps the cards and filter counts in step with what was just removed
    setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id));
    setCounts((c) => ({ ...c, total: Math.max(0, c.total - 1), [r.status]: Math.max(0, c[r.status] - 1) }));
  };
  const deleteOne = async (r: Row) => {
    setDeleting(new Set([r.id])); setNote("");
    try {
      const res = await fetch(`/api/invitations/dispatches?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Couldn't delete that entry.");
      drop(r); setNote(`Removed ${r.guestName}'s entry.`);
    } catch (e) { setNote(e instanceof Error ? e.message : "Couldn't delete that entry."); }
    setDeleting(null); await load(true);
  };
  const clearLog = async () => {
    setDeleting("all"); setNote(""); setConfirmClear(false);
    try {
      const res = await fetch(`/api/invitations/dispatches?${tab === "all" ? "all=true" : `status=${tab}`}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string; deleted?: number };
      if (!res.ok) throw new Error(j.error ?? "Couldn't clear the log.");
      setNote(`Cleared ${j.deleted ?? 0} ${tab === "all" ? "" : `${LABEL[tab].toLowerCase()} `}entr${j.deleted === 1 ? "y" : "ies"}.`);
    } catch (e) { setNote(e instanceof Error ? e.message : "Couldn't clear the log."); }
    setDeleting(null); await load(true);
  };
  const inTab = tab === "all" ? counts.total : counts[tab];
  useEffect(() => { setConfirmClear(false); }, [tab]);

  const card = (label: string, value: number, cls: string, i = 0) => (
    <div className={cn("reveal-scale rounded-lg border px-3 py-2.5", cls)} style={{ "--i": i } as React.CSSProperties}><dt className="text-[11px] font-bold tracking-wide uppercase opacity-80">{label}</dt><dd className="text-2xl font-black tabular-nums">{value}</dd></div>
  );

  return (
    <section aria-label="Dispatch log" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#131416]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Dispatch Log</h3>
        <div className="flex items-center gap-2">
          {counts.failed > 0 && (
            <button type="button" onClick={() => void retryAll()} disabled={retrying !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10">
              {retrying === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />} Retry failed ({counts.failed})
            </button>
          )}
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /> Refresh
          </button>
          {confirmClear ? (
            <span role="alertdialog" aria-label="Confirm clearing the log" className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-bold text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              Clear {inTab} {tab === "all" ? "" : `${LABEL[tab].toLowerCase()} `}entr{inTab === 1 ? "y" : "ies"}?
              <button type="button" onClick={() => void clearLog()} data-clear-confirm className="rounded-md bg-red-700 px-2 py-0.5 text-white hover:bg-red-800">Yes, clear</button>
              <button type="button" onClick={() => setConfirmClear(false)} className="rounded-md px-2 py-0.5 hover:bg-red-100 dark:hover:bg-red-500/20">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} disabled={inTab === 0 || deleting !== null || loading} data-clear-log className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5">
              {deleting === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} {tab === "all" ? "Clear Log" : `Clear ${LABEL[tab]}`}
            </button>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Every WhatsApp invitation you have sent through Waau Panel, newest first.{counts.queued > 0 ? " Checking again every few seconds while some are queued." : ""}</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
        {card("Total", counts.total, "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-white/5 dark:text-white", 0)}
        {card("Sent", counts.sent, "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200", 1)}
        {card("Queued", counts.queued, "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200", 2)}
        {card("Failed", counts.failed, "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200", 3)}
      </dl>

      <div role="tablist" aria-label="Filter dispatches" className="mt-3 flex flex-wrap gap-1.5">
        {(["all", "sent", "queued", "failed"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-full border px-3 py-1 text-xs font-bold", tab === t ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5")}>
            {t === "all" ? "All" : LABEL[t]}<span className="ml-1 opacity-80">{t === "all" ? counts.total : counts[t]}</span>
          </button>
        ))}
      </div>

      {note && <p role="status" className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{note}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">{error}</p>}

      {rows === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</p>
      ) : rows.length === 0 ? (
        !error && <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">{tab === "all" ? "No WhatsApp dispatches yet." : `No ${LABEL[tab].toLowerCase()} dispatches.`}</p>
      ) : (
        <div className="relative mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold tracking-wide text-slate-600 uppercase dark:bg-white/5 dark:text-slate-300">
              <tr><th className="px-3 py-2">Guest</th><th className="px-3 py-2">Template</th><th className="px-3 py-2">When</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200 align-top dark:border-slate-700">
                  <td className="px-3 py-2"><div className="font-semibold text-slate-900 dark:text-white">{r.guestName}{r.kind === "video" && <span className="ml-1.5 rounded bg-[#D12014] px-1.5 py-0.5 align-middle text-[9px] font-extrabold tracking-wide text-white">VIDEO</span>}</div><div className="text-xs text-slate-600 tabular-nums dark:text-slate-300">+{r.phone}</div>{cooldownLeft(r.phone) > 0 && <div className="mt-1"><CooldownPill leftMs={cooldownLeft(r.phone)} onReplied={() => onReplied(r.phone)} /></div>}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200">{templateName(r.templateId)}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-slate-700 dark:text-slate-200">{when.format(new Date(r.sentAt ?? r.createdAt))}</td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold", PILL[r.status])}>{LABEL[r.status]}</span>
                    {r.status === "failed" && r.reason && <p className="mt-1 max-w-xs text-xs font-medium text-red-700 dark:text-red-300">{r.reason}</p>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.kind === "video" && r.videoUrl && <button type="button" onClick={() => setWatching(r)} aria-label={`Preview video for ${r.guestName}`} className="mr-1.5 inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5"><Play className="h-3 w-3" aria-hidden="true" /> Preview</button>}
                    {r.status === "failed" && (
                      <button type="button" onClick={() => void retryOne(r.id)} disabled={retrying !== null || cooldownLeft(r.phone) > 0} title={cooldownLeft(r.phone) > 0 ? `In cooldown: ${clock(cooldownLeft(r.phone))} left (max 2 per 24 hours)` : undefined} aria-label={`Retry ${r.guestName}`} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5">
                        {retrying instanceof Set && retrying.has(r.id) ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3 w-3" aria-hidden="true" />} Retry
                      </button>
                    )}
                    <button type="button" onClick={() => void deleteOne(r)} disabled={deleting !== null} aria-label={`Delete log entry for ${r.guestName}`} title="Remove this entry" data-delete-row className="ml-1.5 inline-flex items-center rounded-md border border-slate-300 p-1.5 text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-red-500/10">
                      {deleting instanceof Set && deleting.has(r.id) ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3 w-3" aria-hidden="true" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {watching?.videoUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-stone-950/75 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setWatching(null); }} onKeyDown={(e) => { if (e.key === "Escape") setWatching(null); }}>
          <div role="dialog" aria-modal="true" aria-label={`Video for ${watching.guestName}`} className="flex max-h-[94vh] w-full max-w-md flex-col gap-2 rounded-2xl bg-white p-3 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Video for {watching.guestName}</h3><button type="button" aria-label="Close" onClick={() => setWatching(null)} className="rounded-md p-1 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"><X className="h-4 w-4" /></button></div>
            <video src={watching.videoUrl} controls autoPlay playsInline className="max-h-[78vh] w-full rounded-lg bg-black" />
          </div>
        </div>
      )}
    </section>
  );
}

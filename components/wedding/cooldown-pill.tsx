"use client";

import { clock, clockFull, COOLDOWN_HINT } from "@/lib/invitation-cooldown";

/**
 * Amber "wait before sending again" badge with the live countdown (the parent re-renders it every second). `onReplied` adds a small link for
 * the manual override: the user confirms the guest replied on WhatsApp, which lifts Meta's per-number cap for that number.
 */
export function CooldownPill({ leftMs, onReplied, className }: { leftMs: number; onReplied?: () => void; className?: string }) {
  if (leftMs <= 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className ?? ""}`}>
      <span title={`${COOLDOWN_HINT} (${clockFull(leftMs)} left)`} role="timer" aria-label={`Cooldown, ${clockFull(leftMs)} left. Maximum 2 per 24 hours.`} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-amber-800 tabular-nums dark:bg-amber-500/20 dark:text-amber-200">
        <span aria-hidden="true">⏳</span> Cooldown {clock(leftMs)} <span className="font-semibold opacity-80">· Max 2/24h</span>
      </span>
      {onReplied && <button type="button" onClick={onReplied} className="text-[11px] font-semibold text-slate-600 underline underline-offset-2 hover:text-[#D12014] dark:text-slate-300">Guest replied?</button>}
    </span>
  );
}

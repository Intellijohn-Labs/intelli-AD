"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useBooking } from "@/lib/booking-store";
import { MULTI_DAY_TIERS, multiDayPct } from "@/lib/pricing";
import { cn, parseISODate, toISODate } from "@/lib/utils";
import { DatePicker } from "./date-picker";

type Mode = "single" | "consecutive" | "custom";
const MODES: { id: Mode; ml: string; en: string }[] = [
  { id: "single", ml: "ഏകദിനം", en: "Single Day" },
  { id: "consecutive", ml: "തുടർച്ചയായ ദിവസങ്ങൾ", en: "Consecutive Days" },
  { id: "custom", ml: "പ്രത്യേക തീയതികൾ", en: "Custom Multiple Dates" },
];
const DURATIONS = [2, 3, 5, 7];
const MAX_DATES = 31;

const chipDate = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(parseISODate(iso));
const addDays = (iso: string, n: number) => { const d = parseISODate(iso); d.setDate(d.getDate() + n); return toISODate(d); };

/**
 * Publication dates card: one day, a run of consecutive days, or hand-picked dates. Every date must still be open
 * (cut-off and print days respected). The booking state keeps all dates; the quote prices each insertion and applies
 * the multi-day discount tiers.
 */
export function MultiDateScheduler({ now, earliest, max, isDisabled, isNonPrint }: {
  now: Date;
  earliest: string;
  max: string;
  isDisabled: (iso: string) => boolean;
  isNonPrint?: (iso: string) => boolean;
}) {
  const { state, update } = useBooking();
  const dates = state.insertionDates?.length ? state.insertionDates : state.releaseDate ? [state.releaseDate] : [];
  const mode: Mode = state.scheduleMode ?? "single";
  const [days, setDays] = useState(Math.max(2, Math.min(7, dates.length || 2)));
  const [note, setNote] = useState<string | null>(null);

  const commit = (list: string[], m: Mode = mode) => {
    const sorted = [...new Set(list)].sort();
    update({ insertionDates: sorted, releaseDate: sorted[0] ?? null, scheduleMode: m });
  };

  /** The next `n` open dates starting at `start` (days a paper doesn't print or that have closed are skipped). */
  const run = (start: string, n: number) => {
    const out: string[] = [];
    for (let i = 0; i < 60 && out.length < n; i++) {
      const iso = addDays(start, i);
      if (iso > max) break;
      if (!isDisabled(iso)) out.push(iso);
    }
    setNote(out.length < n ? `Only ${out.length} open date${out.length === 1 ? "" : "s"} available from ${chipDate(start)}.` : null);
    return out;
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setNote(null);
    if (m === "single") commit(dates.slice(0, 1), m);
    else if (m === "consecutive") commit(dates[0] ? run(dates[0], days) : [], m);
    else commit(dates, m);
  };

  const pickDay = (iso: string) => {
    setNote(null);
    if (mode === "single") commit([iso]);
    else if (mode === "consecutive") commit(run(iso, days));
    else if (dates.includes(iso)) commit(dates.filter((d) => d !== iso));
    else if (dates.length >= MAX_DATES) setNote(`You can pick up to ${MAX_DATES} dates.`);
    else commit([...dates, iso]);
  };

  const pickDuration = (n: number) => {
    setDays(n);
    commit(dates[0] ? run(dates[0], n) : [], "consecutive");
  };

  const pct = multiDayPct(dates.length);

  return (
    <section aria-labelledby="sched-h" className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-white/15 dark:bg-[#0F1D3D]">
      <h3 id="sched-h" className="font-bold">പ്രസിദ്ധീകരണ തീയതികളും ഷെഡ്യൂളും / Publication Dates &amp; Repeat</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">ഒരേ പരസ്യം ഒന്നിലധികം ദിവസങ്ങളിൽ നൽകാം. 3 ദിവസത്തിൽ കൂടുതൽ ബുക്ക് ചെയ്യുമ്പോൾ പ്രത്യേക ഇളവുകൾ ലഭ്യമാണ്.</p>

      <div role="radiogroup" aria-label="Schedule mode" className="mt-4 grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => switchMode(m.id)}
            className={cn("rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-blue-600", mode === m.id ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 hover:border-navy-400")}>
            <span className="block font-bold">{m.ml}</span>
            <span className="block text-xs text-zinc-600 dark:text-zinc-300">{m.en}</span>
          </button>
        ))}
      </div>

      {mode === "consecutive" && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Pick the start date, then how many days</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((n) => {
              const off = multiDayPct(n);
              return (
                <button key={n} type="button" aria-pressed={days === n} onClick={() => pickDuration(n)}
                  className={cn("rounded-full border px-3 py-1 text-sm font-semibold transition-colors", days === n ? "border-navy-800 bg-navy-800 text-white" : "border-zinc-300 hover:border-navy-400")}>
                  {n} Days{off ? ` (${off}% OFF)` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <DatePicker value={dates[0] ?? null} values={mode === "single" ? undefined : dates} onChange={pickDay} now={now} earliest={earliest} max={max} isDisabled={isDisabled} isNonPrint={isNonPrint} />
        {mode === "custom" && <p className="mt-2 text-xs text-zinc-500">Click a date to add it; click it again to remove it.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-live="polite">
        <span className="rounded-full bg-navy-800 px-3 py-1 text-xs font-bold text-white">Total Insertions: {dates.length} {dates.length === 1 ? "day" : "days"}</span>
        {pct > 0 && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">{pct}% multi-day discount</span>}
        {dates.map((d) => (
          <span key={d} className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 py-0.5 pr-1 pl-3 text-xs font-semibold dark:border-white/20 dark:bg-white/5">
            {chipDate(d)}
            <button type="button" aria-label={`Remove ${chipDate(d)}`} onClick={() => commit(dates.filter((x) => x !== d), mode === "consecutive" ? "custom" : mode)} className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-white/15"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      {dates.length < 3 && <p className="mt-2 text-xs text-zinc-500">Book {MULTI_DAY_TIERS[MULTI_DAY_TIERS.length - 1].minDays}+ days to start saving: 3 days 5%, 5 days 10%, 7 days 15%.</p>}
      {note && <p role="alert" className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{note}</p>}
    </section>
  );
}

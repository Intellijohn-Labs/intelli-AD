"use client";

import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useBooking } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { earliestRelease, formatClock, formatCountdown, isBookable, latestRelease, paperCutoffs } from "@/lib/cutoff";
import { validateStep3 } from "@/lib/validation";
import { formatDate, formatDateTime, parseISODate } from "@/lib/utils";
import { getNewspaper } from "@/data/newspapers";
import { printsOn } from "@/lib/rates";
import { useRatesVersion } from "@/lib/use-rates";
import { DatePicker } from "./date-picker";
import { StepNav } from "./step-nav";

export function Step3Schedule() {
  const { state, update } = useBooking();
  const { t, pn } = useI18n();
  useRatesVersion(); // print days / cut-offs may arrive after first render
  const [now, setNow] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paperIds = useMemo(() => Object.keys(state.selection).filter((k) => state.selection[k].length), [state.selection]);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const earliest = now ? earliestRelease(paperIds, state.adType, now) : null;
  const max = now ? latestRelease(now) : null;

  // Drop a previously chosen date that has since closed.
  useEffect(() => {
    if (now && state.releaseDate && !isBookable(state.releaseDate, paperIds, state.adType, now)) update({ releaseDate: null });
  }, [now, state.releaseDate, paperIds, state.adType, update]);

  if (!now || !earliest || !max) return <p className="text-sm text-zinc-500">{t("Loading schedule…")}</p>;

  const cutoffs = state.releaseDate ? paperCutoffs(state.releaseDate, paperIds, state.adType, now) : [];
  const nextDay = paperCutoffs(earliest, paperIds, state.adType, now);

  return (
    <div>
      <p className="mb-5 text-sm text-zinc-600">{t("Dates close at each publication's cut-off. Your ad runs on the date you pick if every selected paper is still open.")}</p>

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <DatePicker value={state.releaseDate} onChange={(iso) => update({ releaseDate: iso })} now={now} earliest={earliest} max={max} isDisabled={(iso) => !isBookable(iso, paperIds, state.adType, now)} isNonPrint={(iso) => paperIds.some((id) => { const p = getNewspaper(id); return !!p && !printsOn(p.name, parseISODate(iso)); })} />

        <div className="space-y-4">
          <div className="rounded-md border border-amber-300/80 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/20 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <Clock className="h-4 w-4" aria-hidden="true" /> {t("Earliest print: {date}", { date: formatDate(earliest) })}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-900">
              {nextDay.map((c) => (
                <li key={c.paper.id}>
                  {t("{paper}: book by {time} ({left})", { paper: pn(c.paper), time: formatDateTime(c.cutoff), left: formatCountdown(c.msLeft, t) })}
                </li>
              ))}
            </ul>
          </div>

          {state.releaseDate ? (
            <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/70">
              <p className="mb-2 font-bold">{t("Cut-offs for {date}", { date: formatDate(state.releaseDate) })}</p>
              <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
                {cutoffs.map((c) => (
                  <li key={c.paper.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-semibold">{pn(c.paper)}</span>
                      <span className="block text-xs text-zinc-500">
                        {t("{n} day(s) prior · {time}", { n: c.rule.daysBefore, time: formatClock(c.rule.time) })}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block">{formatDateTime(c.cutoff)}</span>
                      <Badge tone={c.status === "closing" ? "amber" : "green"}>{formatCountdown(c.msLeft, t)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{t("Select a date to see the exact cut-off for each publication.")}</p>
          )}
        </div>
      </div>

      <StepNav
        error={error}
        onBack={() => update({ step: 2 })}
        onNext={() => {
          const err = validateStep3(state, new Date());
          setError(err);
          if (!err) update({ step: 4 });
        }}
      />
    </div>
  );
}

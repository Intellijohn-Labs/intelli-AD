"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/context/language-context";
import { cn, parseISODate, toISODate } from "@/lib/utils";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_ML = ["തി", "ചൊ", "ബു", "വ്യാ", "വെ", "ശ", "ഞാ"];

export function DatePicker({
  value,
  onChange,
  now,
  isDisabled,
  earliest,
  max,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  now: Date;
  isDisabled: (iso: string) => boolean;
  earliest: string;
  max: string;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "ml" ? "ml-IN" : "en-IN";
  const [view, setView] = useState(() => {
    const d = value ? parseISODate(value) : parseISODate(earliest);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(view);
  const offset = (view.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const todayISO = toISODate(now);
  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(view.getFullYear(), view.getMonth(), i + 1))),
  ];
  const shift = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));
  const maxView = parseISODate(max);

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="font-headline font-bold" aria-live="polite">
          {monthLabel}
        </p>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" disabled={view >= new Date(maxView.getFullYear(), maxView.getMonth(), 1)} className="rounded-md p-2 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-700">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-zinc-500">
        {(lang === "ml" ? DOW_ML : DOW).map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e${i}`} />;
          const disabled = isDisabled(iso) || iso > max;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(parseISODate(iso)) + (iso === earliest ? " (earliest available)" : "") + (disabled ? " (closed)" : "")}
              onClick={() => onChange(iso)}
              className={cn(
                "relative aspect-square rounded-lg text-sm font-medium transition-colors",
                selected ? "bg-navy-800 text-white" : disabled ? "text-zinc-300 line-through" : "hover:bg-navy-100 dark:hover:bg-zinc-700",
                iso === earliest && !selected && "ring-2 ring-edition/70",
                iso === todayISO && !selected && "font-bold text-navy-700",
              )}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-edition/70" aria-hidden="true" /> {t("Earliest date you can still book")}
      </p>
    </div>
  );
}

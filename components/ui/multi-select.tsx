"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { controlStyles } from "./field";

export interface MultiOption {
  value: string;
  label: string;
  group?: string;
}

/** Disclosure-style multi-select with grouped checkboxes. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  label,
  disabled,
}: {
  options: MultiOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  label: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  const summary =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? options.filter((o) => value.includes(o.value)).map((o) => o.label).join(", ")
        : t("{n} editions selected", { n: value.length });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${summary}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(controlStyles, "flex items-center justify-between text-left disabled:opacity-50", value.length === 0 && "text-zinc-400")}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} role="group" aria-label={label} className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex justify-between px-2 pb-1 text-xs font-semibold">
            <button type="button" className="text-navy-700 hover:underline dark:text-navy-300" onClick={() => onChange(options.map((o) => o.value))}>
              {t("Select all")}
            </button>
            <button type="button" className="text-zinc-500 hover:underline" onClick={() => onChange([])}>
              {t("Clear")}
            </button>
          </div>
          {groups.map((g) => (
            <div key={g}>
              {g && <p className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{g}</p>}
              {options
                .filter((o) => (o.group ?? "") === g)
                .map((o) => {
                  const on = value.includes(o.value);
                  return (
                    <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-navy-50 dark:hover:bg-zinc-800">
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(o.value)} />
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded border", on ? "border-navy-700 bg-navy-700 text-white" : "border-zinc-400")}>
                        {on && <Check className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      {o.label}
                    </label>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

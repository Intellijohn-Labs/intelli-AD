"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Field, Textarea } from "@/components/ui/field";
import { applySpacing, SPACING_OPTIONS, type ParagraphSpacing } from "@/lib/paragraphs";
import { cn, countWords, wrapText } from "@/lib/utils";

/**
 * Multi-paragraph writing box: grows as you type or paste (scrolls past `maxHeight`), Enter makes a new paragraph
 * without submitting, and live word / character / print-line counts sit underneath. Pass `spacing` + `onSpacing`
 * to offer the Tight / Normal / Double-spaced control.
 */
export function ParagraphField({
  id,
  label,
  required,
  hint,
  error,
  value,
  onChange,
  placeholder,
  rows = 6,
  maxHeight = 420,
  charsPerLine = 28,
  maxChars,
  spacing,
  onSpacing,
  extra,
  className,
  textClassName,
  textareaRef,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxHeight?: number;
  charsPerLine?: number;
  maxChars?: number;
  spacing?: ParagraphSpacing;
  onSpacing?: (s: ParagraphSpacing) => void;
  extra?: ReactNode;
  className?: string;
  textClassName?: string;
  /** Gives the parent the underlying textarea (e.g. to select a placeholder). */
  textareaRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Auto-expand: reset, then fit to content.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, maxHeight)}px`;
  }, [value, maxHeight]);

  const words = countWords(value);
  const chars = value.replace(/\s+$/g, "").length;
  const lines = wrapText(applySpacing(value, spacing ?? "normal"), charsPerLine).length;
  const over = maxChars !== undefined && chars > maxChars;

  return (
    <div className={className}>
      <Field id={id} label={label} required={required} error={error} hint={hint}>
        <Textarea
          ref={(el) => { ref.current = el; textareaRef?.(el); }}
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          spellCheck
          aria-invalid={!!error}
          aria-describedby={`${id}-${error ? "error" : "hint"} ${id}-metrics`}
          onChange={(e) => onChange(e.target.value)}
          className={cn("resize-none overflow-y-auto leading-relaxed [scrollbar-width:thin] scroll-smooth", textClassName)}
        />
      </Field>
      <div id={`${id}-metrics`} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-slate-200" aria-live="polite">
        <span className={cn("font-semibold", over && "text-red-700 dark:text-red-200")}>
          {words} {words === 1 ? "word" : "words"} · {chars}{maxChars ? `/${maxChars}` : ""} characters
        </span>
        <span>Approx. {lines} {lines === 1 ? "line" : "lines"} in print</span>
        {extra}
      </div>
      {onSpacing && (
        <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Paragraph spacing">
          <span className="text-xs font-semibold text-zinc-700 dark:text-slate-100">Paragraph spacing</span>
          <div className="flex rounded-lg border border-zinc-300 p-0.5 text-xs font-semibold dark:border-slate-700">
            {SPACING_OPTIONS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={(spacing ?? "normal") === o.id} title={o.hint} onClick={() => onSpacing(o.id)}
                className={cn("rounded-md px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600", (spacing ?? "normal") === o.id ? "bg-blue-600 text-white" : "text-zinc-600 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-white/10")}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

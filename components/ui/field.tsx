"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/context/language-context";
import type { ComponentProps, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const controlStyles =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 aria-[invalid=true]:border-red-600 dark:border-slate-700 dark:bg-[#121B1E] dark:text-[#FFFFFF] dark:placeholder:text-slate-300 dark:focus:border-[#34D399] dark:focus:outline-[#34D399]/40";

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-[#FFFFFF]">
        {label}
        {required && <span className="ml-0.5 text-edition" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-zinc-500 dark:text-[#FAFAFA]">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-700 dark:text-red-200">
      {t(message)}
    </p>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlStyles, "resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlStyles, "select-chevron", className)} {...props} />;
}

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 dark:border-slate-800/80 dark:bg-[#121B1E]">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-zinc-800 dark:text-[#FFFFFF]">
          {label}
        </label>
        {description && <p className="text-xs text-zinc-500 dark:text-[#FAFAFA]">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-teal-600 dark:bg-emerald-400" : "bg-slate-300",
        )}
      >
        <motion.span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm" animate={{ x: checked ? 20 : 0 }} transition={{ duration: 0.15, ease: "easeOut" }} />
      </button>
    </div>
  );
}

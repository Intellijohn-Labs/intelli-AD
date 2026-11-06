"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/context/language-context";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const controlStyles =
  "w-full rounded border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0F172A] focus:outline focus:outline-1 focus:outline-[#0F172A]/50 aria-[invalid=true]:border-red-600 dark:border-[#3a3b41] dark:bg-[#121316] dark:text-[#eaeaea] dark:placeholder:text-zinc-500 dark:focus:border-[#eaeaea] dark:focus:outline-[#eaeaea]/50";

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
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        {label}
        {required && <span className="ml-0.5 text-edition" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
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

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
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
    <div className="flex items-center justify-between gap-4 rounded border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/60">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {label}
        </label>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded transition-colors",
          checked ? "bg-[#0F172A] dark:bg-[#eaeaea]" : "bg-zinc-300",
        )}
      >
        <motion.span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-sm bg-white shadow-sm dark:bg-[#0F172A]" animate={{ x: checked ? 20 : 0 }} transition={{ duration: 0.15, ease: "easeOut" }} />
      </button>
    </div>
  );
}

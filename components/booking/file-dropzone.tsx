"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useId, useState } from "react";
import { cn, formatBytes } from "@/lib/utils";
import type { FileMeta } from "@/lib/types";
import { FieldError } from "@/components/ui/field";
import { useI18n } from "@/context/language-context";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function FileDropzone({
  label,
  hint,
  required,
  value,
  onChange,
  error,
  maxMb = 25,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  value: FileMeta | null | undefined;
  onChange: (f: FileMeta | null) => void;
  error?: string;
  maxMb?: number;
}) {
  const { t } = useI18n();
  const id = useId();
  const [localError, setLocalError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  const accept = (file?: File) => {
    if (!file) return;
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!okType) return setLocalError(t("Only PDF, JPG or PNG files are supported."));
    if (file.size > maxMb * 1024 * 1024) return setLocalError(t("File is larger than {mb} MB.", { mb: maxMb }));
    setLocalError(undefined);
    onChange({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    });
  };

  const err = localError ?? error;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        {label} {required ? <span className="text-edition">*</span> : <span className="font-normal text-zinc-500">{t("(optional)")}</span>}
      </p>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-500/20 px-3 py-2.5">
          <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-200" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{value.name}</p>
            <p className="text-xs text-zinc-500">{formatBytes(value.size)}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="rounded p-1.5 text-zinc-500 hover:bg-white hover:text-red-700 dark:text-red-200" aria-label={t("Remove {name}", { name: value.name })}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors focus-within:outline-2 focus-within:outline-navy-500",
            dragging ? "border-navy-500 bg-navy-50" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-zinc-800/50",
            err && "border-red-400",
          )}
        >
          <Upload className="h-5 w-5 text-navy-600" aria-hidden="true" />
          <span className="text-sm font-medium text-navy-800 dark:text-zinc-100">{t("Click to upload or drag a file here")}</span>
          <span className="text-xs text-zinc-500">{hint ?? t("PDF, JPG or PNG up to {mb} MB", { mb: maxMb })}</span>
          <input id={id} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => accept(e.target.files?.[0])} />
        </label>
      )}
      <FieldError message={err} />
    </div>
  );
}

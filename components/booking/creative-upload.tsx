"use client";

import { AlertTriangle, CheckCircle2, FileText, Trash2, Upload, XCircle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { FieldError } from "@/components/ui/field";
import { checkCreative, fileKind, inspectCreative, type CreativeCheck, type CreativeInfo } from "@/lib/display";
import type { FileMeta } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPT = ".pdf,.tif,.tiff,.jpg,.jpeg,.png,application/pdf,image/tiff,image/jpeg,image/png";
const MAX_MB = 50;

/**
 * Path 1: upload a finished, print-ready creative (PDF, TIFF or high-res JPG). The file is inspected in the
 * browser and compared to the booked size for aspect ratio and effective dpi.
 */
export function CreativeUpload({
  value,
  onChange,
  widthCm,
  heightCm,
  error,
}: {
  value: FileMeta | null | undefined;
  onChange: (f: FileMeta | null) => void;
  widthCm: number;
  heightCm: number;
  error?: string;
}) {
  const id = useId();
  const [info, setInfo] = useState<CreativeInfo | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string>();

  // Keep the analysis only while the file it belongs to is still attached.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!value) setInfo(null);
  }, [value]);

  const accept = async (file?: File) => {
    if (!file) return;
    if (!fileKind(file.name)) return setLocalError("Only PDF, TIFF or JPG files are supported.");
    if (file.size > MAX_MB * 1024 * 1024) return setLocalError(`File is larger than ${MAX_MB} MB.`);
    setLocalError(undefined);
    setInfo(await inspectCreative(file));
    onChange({ name: file.name, size: file.size, type: file.type, previewUrl: file.type.startsWith("image/") && !/tiff?$/i.test(file.type) ? URL.createObjectURL(file) : undefined });
  };

  const checks: CreativeCheck[] = info && widthCm > 0 && heightCm > 0 ? checkCreative(info, widthCm, heightCm) : [];
  const err = localError ?? error;

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Complete creative <span className="text-edition">*</span>
      </p>
      {value ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded border border-emerald-300 bg-emerald-50/80 px-3 py-2.5 dark:border-emerald-500/40 dark:bg-emerald-500/20">
            <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-200" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{value.name}</p>
              <p className="text-xs text-zinc-500">
                {formatBytes(value.size)}
                {info?.widthPx ? ` · ${info.widthPx} × ${info.heightPx} px` : ""}
                {info?.widthCm ? ` · page ${info.widthCm.toFixed(1)} × ${info.heightCm?.toFixed(1)} cm` : ""}
              </p>
            </div>
            <button type="button" onClick={() => onChange(null)} className="rounded p-1.5 text-zinc-500 hover:bg-white hover:text-red-700 dark:text-red-200" aria-label={`Remove ${value.name}`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {checks.length > 0 && (
            <ul className="space-y-1 text-xs" aria-live="polite" aria-label="Print-readiness checks">
              {checks.map((c, i) => {
                const Icon = c.level === "ok" ? CheckCircle2 : c.level === "warn" ? AlertTriangle : XCircle;
                return (
                  <li key={i} className={cn("flex items-start gap-1.5 rounded px-2 py-1.5", c.level === "ok" && "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200", c.level === "warn" && "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200", c.level === "error" && "bg-red-50 text-red-900 dark:bg-red-500/15 dark:text-red-200")}>
                    <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {c.message}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void accept(e.dataTransfer.files[0]); }}
          className={cn("flex cursor-pointer flex-col items-center gap-1 rounded border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:outline-2 focus-within:outline-navy-500", dragging ? "border-navy-500 bg-navy-50" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-zinc-800/50", err && "border-red-400")}
        >
          <Upload className="h-6 w-6 text-navy-600" aria-hidden="true" />
          <span className="text-sm font-medium text-navy-800 dark:text-zinc-100">Drag your print-ready file here, or click to browse</span>
          <span className="text-xs text-zinc-500">PDF, TIFF or high-resolution JPG · 300 dpi at {widthCm || "–"} × {heightCm || "–"} cm · up to {MAX_MB} MB</span>
          <input id={id} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => void accept(e.target.files?.[0])} />
        </label>
      )}
      <FieldError message={err} />
    </div>
  );
}

"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useId } from "react";
import type { FileMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Crop { zoom: number; x: number; y: number }

/** Portrait upload with a simple crop tool: zoom and pan sliders drive the same crop used in the print preview. */
export function PhotoCropper({
  photo,
  onPhoto,
  crop,
  onCrop,
  round,
}: {
  photo: FileMeta | null | undefined;
  onPhoto: (f: FileMeta | null) => void;
  crop: Crop;
  onCrop: (c: Crop) => void;
  round: boolean;
}) {
  const id = useId();
  const pick = (file?: File) => {
    if (!file) return;
    if (!/\.(jpe?g|png)$/i.test(file.name) || file.size > 15 * 1024 * 1024) return;
    onPhoto({ name: file.name, size: file.size, type: file.type, previewUrl: URL.createObjectURL(file) });
    onCrop({ zoom: 1, x: 50, y: 50 });
  };
  const slider = "h-1.5 w-full cursor-pointer accent-[#E11D48]";

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className={cn("relative h-[120px] w-24 shrink-0 overflow-hidden border-2 border-[#0F172A] bg-zinc-100", round && "h-24 rounded-full")} aria-label="Crop preview">
        {photo?.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.previewUrl} alt="Portrait crop preview" className="h-full w-full object-cover grayscale" style={cropStyle(crop)} />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">Portrait</span>
        )}
      </div>
      <div className="min-w-[200px] flex-1 space-y-2.5">
        {photo ? (
          <>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold">{photo.name}</span>
              <button type="button" onClick={() => onPhoto(null)} className="rounded p-1 text-zinc-500 hover:text-red-700" aria-label="Remove photo"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <label className="block text-xs font-semibold">Zoom {crop.zoom.toFixed(1)}×
              <input type="range" min={1} max={3} step={0.05} value={crop.zoom} onChange={(e) => onCrop({ ...crop, zoom: +e.target.value })} className={slider} />
            </label>
            <label className="block text-xs font-semibold">Move left / right
              <input type="range" min={0} max={100} value={crop.x} onChange={(e) => onCrop({ ...crop, x: +e.target.value })} className={slider} />
            </label>
            <label className="block text-xs font-semibold">Move up / down
              <input type="range" min={0} max={100} value={crop.y} onChange={(e) => onCrop({ ...crop, y: +e.target.value })} className={slider} />
            </label>
          </>
        ) : (
          <label htmlFor={id} className="flex cursor-pointer flex-col items-center gap-1 rounded border-2 border-dashed border-zinc-300 bg-white px-4 py-5 text-center hover:border-navy-400 focus-within:outline-2 focus-within:outline-navy-500 dark:bg-zinc-800/50">
            <ImagePlus className="h-5 w-5 text-navy-600" aria-hidden="true" />
            <span className="text-sm font-medium">Upload portrait photo</span>
            <span className="text-xs text-zinc-500">JPG or PNG · up to 15 MB · crop after upload</span>
            <input id={id} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        )}
      </div>
    </div>
  );
}

export function cropStyle(c: Crop) {
  return { objectPosition: `${c.x}% ${c.y}%`, transform: `scale(${c.zoom})`, transformOrigin: `${c.x}% ${c.y}%` } as const;
}

"use client";

import { ArrowDown, ArrowUp, Check, CaseSensitive, Image as ImageIcon, LayoutTemplate, Minus, Plus, Redo2, Shapes, Trash2, Type, Undo2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CardEditOverlay } from "./card-editor";
import { SectionToolbar } from "./section-toolbar";
import {
  EVENT_TITLE, FONT_STACKS, FONT_STYLES, greetingText, newId,
  type BlockId, type BlockKey, type CardLayer, type ElementKind, type EventConfig, type FontStyle, type LayerShape, type TextId, type TextStyle, type WeddingDetails, type WeddingTemplate,
} from "@/lib/wedding";
import { elementAspect, layerImageToDataUrl, loadImage, photoToDataUrl, renderWeddingCard, type CardZone, type GroupBox, type LayerBox } from "@/lib/wedding-render";
import { cn } from "@/lib/utils";

const CARD_W = 1080;
type Sel = { kind: "zone"; id: CardZone["id"] } | { kind: "layer"; id: string } | null;
type Tool = "text" | "images" | "elements" | "templates" | "fonts";
const TOOLS: { id: Tool; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type }, { id: "images", label: "Images", icon: ImageIcon }, { id: "elements", label: "Elements", icon: Shapes },
  { id: "templates", label: "Templates", icon: LayoutTemplate }, { id: "fonts", label: "Fonts", icon: CaseSensitive },
];
const BUILTIN: { id: TextId; label: string }[] = [
  { id: "guest", label: "Greeting" }, { id: "title", label: "Event title" }, { id: "blessing", label: "Blessing" }, { id: "names", label: "Names" }, { id: "parents", label: "Family line" },
  { id: "message", label: "Wording" }, { id: "datetime", label: "Date & time" }, { id: "venue", label: "Venue" }, { id: "verse", label: "Closing verse" },
];
const ELEMENTS: { kind: ElementKind; label: string; glyph: string; w: number }[] = [
  { kind: "divider-diamond", label: "Divider", glyph: "—◆—", w: 60 }, { kind: "divider-dots", label: "Dots", glyph: "• • •", w: 44 }, { kind: "frame-double", label: "Frame", glyph: "▭", w: 72 },
  { kind: "star", label: "Star", glyph: "★", w: 14 }, { kind: "heart", label: "Heart", glyph: "♥", w: 14 }, { kind: "flower", label: "Flower", glyph: "✿", w: 16 },
];
const btn = "h-8 min-w-8 rounded-md border border-slate-300 px-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10";
const fieldCls = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-[#D12014] focus:ring-1 focus:ring-[#D12014] dark:border-slate-600 dark:bg-[#0A0B0D] dark:text-slate-100";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const inField = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]");

/** Slider row: label, A− / slider / A+ and a value badge. */
function Range({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <span className="w-20 shrink-0 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step * 2, min, max))} className={btn}><Minus className="h-3.5 w-3.5" aria-hidden="true" /></button>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} className="h-1.5 min-w-0 flex-1 accent-[#D12014]" />
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step * 2, min, max))} className={btn}><Plus className="h-3.5 w-3.5" aria-hidden="true" /></button>
      <span className="w-12 shrink-0 rounded-md bg-slate-100 px-1 py-0.5 text-center text-[11px] font-bold tabular-nums text-slate-800 dark:bg-white/10 dark:text-slate-100">{Math.round(value)}{unit}</span>
    </div>
  );
}

/** Selection, drag and corner-resize handles for the custom layers (text boxes, images, elements) drawn on the card. */
function LayerOverlay({ layers, boxes, selectedId, onSelect, onChange, onDelete }: {
  layers: CardLayer[]; boxes: LayerBox[]; selectedId: string | null; onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<CardLayer>) => void; onDelete: (id: string) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const resize = useRef<{ id: string; sx: number; w0: number; size0: number } | null>(null);
  const pctAt = (e: React.PointerEvent) => { const r = frame.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, rect: r }; };
  const label = (l: CardLayer) => (l.type === "text" ? `Text box: ${l.text.slice(0, 24)}` : l.type === "image" ? "Image" : `Element: ${l.kind}`);
  return (
    <div ref={frame} className="pointer-events-none absolute inset-0">
      {layers.map((l) => {
        const b = boxes.find((x) => x.id === l.id);
        if (!b) return null;
        const on = selectedId === l.id;
        return (
          <div
            key={l.id} data-layer role="button" tabIndex={0} aria-label={label(l)} aria-pressed={on}
            onPointerDown={(e) => { e.stopPropagation(); onSelect(l.id); e.currentTarget.setPointerCapture(e.pointerId); const p = pctAt(e); drag.current = { id: l.id, dx: p.x - l.x, dy: p.y - l.y, sx: e.clientX, sy: e.clientY, moved: false }; }}
            onPointerMove={(e) => {
              const d0 = drag.current; if (!d0 || d0.id !== l.id) return;
              if (!d0.moved && Math.hypot(e.clientX - d0.sx, e.clientY - d0.sy) < 3) return;
              d0.moved = true; const p = pctAt(e);
              onChange(l.id, { x: Math.round(clamp(p.x - d0.dx, 0, 100) * 10) / 10, y: Math.round(clamp(p.y - d0.dy, 0, 100) * 10) / 10 });
            }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onDelete(l.id); return; }
              if (!e.key.startsWith("Arrow")) return;
              e.preventDefault(); const st = e.shiftKey ? 2 : 0.5;
              onChange(l.id, { x: clamp(l.x + (e.key === "ArrowRight" ? st : e.key === "ArrowLeft" ? -st : 0), 0, 100), y: clamp(l.y + (e.key === "ArrowDown" ? st : e.key === "ArrowUp" ? -st : 0), 0, 100) });
            }}
            className={cn("pointer-events-auto absolute touch-none cursor-move rounded-sm outline-offset-2", on ? "outline-2 outline-solid outline-[#D12014]" : "outline-1 outline-transparent hover:outline-dashed hover:outline-[#D12014]")}
            style={{ left: `${(b.x / CARD_W) * 100}%`, top: `${(b.y / 1500) * 100}%`, width: `${(b.w / CARD_W) * 100}%`, height: `${(b.h / 1500) * 100}%` }}
          >
            {on && (
              <span
                role="slider" aria-label="Resize: drag the corner" aria-valuenow={Math.round(l.w)} tabIndex={-1}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); resize.current = { id: l.id, sx: e.clientX, w0: l.w, size0: l.type === "text" ? l.size : 0 }; }}
                onPointerMove={(e) => {
                  const r0 = resize.current; if (!r0 || r0.id !== l.id) return;
                  // Calibrated on screen pixels (the same feel at any zoom): 0.4 % of the starting size per px, about 1 % per 2.5 px of drag.
                  const ratio = Math.max(0.1, 1 + (e.clientX - r0.sx) * 0.004);
                  if (l.type === "text") onChange(l.id, { w: Math.round(clamp(r0.w0 * ratio, 5, 100) * 10) / 10, size: Math.round(clamp(r0.size0 * ratio, 12, 260)) });
                  else onChange(l.id, { w: Math.round(clamp(r0.w0 * ratio, 4, 100) * 10) / 10 });
                }}
                onPointerUp={() => { resize.current = null; }} onPointerCancel={() => { resize.current = null; }}
                className="absolute -right-2 -bottom-2 z-20 h-4 w-4 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-[#D12014] shadow"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Canva-style fullscreen editor. It edits the very same details state as the normal Live preview and renders through the same canvas
 * renderer, so everything done here (text, images, elements, positions, sizes, colours) shows in the Live preview, persists in drafts and
 * appears identically in the JPEG sent to WhatsApp.
 */
export function StudioFullscreen(p: {
  d: WeddingDetails; rd: WeddingDetails; tpl: WeddingTemplate; cfg: EventConfig; previewGuest: { name: string; place: string };
  setD: Dispatch<SetStateAction<WeddingDetails>>; set: (patch: Partial<WeddingDetails>) => void;
  templates: WeddingTemplate[]; thumbs: Record<string, string>; onPickTemplate: (t: WeddingTemplate) => void;
  moveBadge: (x: number, y: number) => void; moveBlock: (key: Exclude<TextId, "guest">, x: number, y: number) => void;
  scaleText: (id: TextId, v: number) => void; setMaster: (v: number) => void;
  fontForBlock: (key: TextId, f: FontStyle | "") => void; fontForAll: (f: FontStyle) => void;
  styleText: (id: TextId, patch: { [K in keyof TextStyle]?: TextStyle[K] | null }) => void;
  layoutCustom: boolean; resetLayout: () => void; onClose: () => void;
}) {
  const { d, rd, tpl, cfg, previewGuest, setD, set, onClose } = p;
  const [sel, setSel] = useState<Sel>(null);
  const [tool, setTool] = useState<Tool>("text");
  const [zoom, setZoom] = useState(1);
  const [src, setSrc] = useState("");
  const [zones, setZones] = useState<CardZone[]>([]);
  const [groups, setGroups] = useState<GroupBox[]>([]);
  const [boxes, setBoxes] = useState<LayerBox[]>([]);
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 900 : window.innerHeight));
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const photoIdx = useRef(0);
  const layers = d.layers ?? [];

  // Fit the card to the viewport height (zoom multiplies it); render at the displayed size x device pixel ratio so it stays crisp.
  useEffect(() => { const on = () => setVh(window.innerHeight); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  const baseH = Math.max(320, vh - 56 - 48);
  const cardH = Math.round(baseH * zoom), cardW = Math.round(cardH * 0.72);
  const renderW = clamp(Math.round(cardW * Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1)), 560, 1600);

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null, img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const c = await renderWeddingCard({ template: tpl, details: rd, guest: previewGuest, photo: img, photo2: img2, width: renderW, onZones: (z) => { if (live) setZones(z); }, onGroups: (g) => { if (live) setGroups(g); }, onLayers: (b) => { if (live) setBoxes(b); } });
      if (live) setSrc(c.toDataURL("image/jpeg", 0.92));
    }, 60);
    return () => { live = false; clearTimeout(t); };
  }, [tpl, rd, d.photos, previewGuest, renderW]);

  // Undo / redo over the whole details state: layout, typography, colours and every layer come back together in one click.
  const present = useRef(d), past = useRef<WeddingDetails[]>([]), future = useRef<WeddingDetails[]>([]), lastPush = useRef(0), skip = useRef(false);
  const [, bump] = useState(0);
  useEffect(() => {
    if (skip.current) { skip.current = false; present.current = d; return; }
    if (d === present.current) return;
    // A burst of changes (a slider or a long drag) is one undo step: the state before the burst is saved once, when the burst starts.
    const now = Date.now();
    if (now - lastPush.current > 400) { past.current.push(present.current); if (past.current.length > 80) past.current.shift(); }
    lastPush.current = now;
    future.current = []; present.current = d; bump((n) => n + 1);
  }, [d]);
  const undo = useCallback(() => { const prev = past.current.pop(); if (!prev) return; future.current.push(present.current); skip.current = true; setD(prev); bump((n) => n + 1); }, [setD]);
  const redo = useCallback(() => { const nxt = future.current.pop(); if (!nxt) return; past.current.push(present.current); skip.current = true; setD(nxt); bump((n) => n + 1); }, [setD]);

  // Layer operations
  const upd = (id: string, patch: Partial<CardLayer>) => setD((cur) => ({ ...cur, layers: (cur.layers ?? []).map((l) => (l.id === id ? ({ ...l, ...patch } as CardLayer) : l)) }));
  const add = (l: CardLayer) => { setD((cur) => ({ ...cur, layers: [...(cur.layers ?? []), l] })); setSel({ kind: "layer", id: l.id }); };
  const del = (id: string) => { setD((cur) => ({ ...cur, layers: (cur.layers ?? []).filter((l) => l.id !== id) })); setSel(null); };
  const reorder = (id: string, dir: 1 | -1) => setD((cur) => { const a = [...(cur.layers ?? [])], i = a.findIndex((l) => l.id === id), j = i + dir; if (i < 0 || j < 0 || j >= a.length) return cur; [a[i], a[j]] = [a[j], a[i]]; return { ...cur, layers: a }; });
  const addText = () => add({ id: newId(), type: "text", x: 50, y: 50, w: 60, text: "Your text", size: 64, font: "", color: tpl.pal.ink, align: "center", ls: 0, lh: 1.25, opacity: 1, bold: true, italic: false });
  const addElement = (kind: ElementKind, w: number) => add({ id: newId(), type: "element", x: 50, y: 50, w, kind, color: tpl.pal.accent, opacity: 1 });
  const addImages = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 6)) {
      const u = await layerImageToDataUrl(f);
      if (u) add({ id: newId(), type: "image", x: 50, y: 50, w: 34, src: u, shape: "rounded", opacity: 1, border: 0, borderColor: "#ffffff", shadow: false });
    }
  };
  const putPhoto = async (f: File | undefined, i: number) => {
    if (!f) return;
    const u = await photoToDataUrl(f); if (!u) return;
    setD((cur) => { const ph = [...cur.photos]; ph[Math.min(i, ph.length)] = u; return { ...cur, photos: ph.slice(0, 4) }; });
  };
  const removePhoto = (i: number) => setD((cur) => ({ ...cur, photos: cur.photos.filter((_, j) => j !== i) }));

  // Keyboard: Esc (deselect, then exit), Delete (selected layer), Ctrl/Cmd+Z / Shift+Ctrl+Z (undo / redo)
  const selRef = useRef<Sel>(null); selRef.current = sel;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); if (selRef.current) setSel(null); else onClose(); return; }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !inField(e.target)) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y" && !inField(e.target)) { e.preventDefault(); redo(); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selRef.current?.kind === "layer" && !inField(e.target)) { e.preventDefault(); del(selRef.current.id); }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, undo, redo]);

  const selLayer = sel?.kind === "layer" ? layers.find((l) => l.id === sel.id) ?? null : null;
  const preview: Record<TextId, string> = useMemo(() => ({
    guest: greetingText(d, previewGuest), title: EVENT_TITLE[rd.eventType].en, blessing: rd.blessing || tpl.blessing[0], names: [rd.groom, rd.bride].filter(Boolean).join(" & "),
    parents: rd.groomParents || "Family line", message: rd.message || cfg.message.en, datetime: [rd.date, rd.time].filter(Boolean).join(" · ") || "Date & time", venue: rd.venue || "Venue", verse: rd.verse || "Closing verse",
  }), [d, rd, tpl, cfg, previewGuest]);

  const layerPanel = (l: CardLayer) => (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-900 dark:text-white"><span className="mr-1.5 rounded-full bg-[#D12014] px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">Editing</span>{l.type === "text" ? "Text box" : l.type === "image" ? "Image" : "Element"}</p>
      {l.type === "text" && (
        <>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Text
            <textarea rows={3} value={l.text} onChange={(e) => upd(l.id, { text: e.target.value })} className={`mt-0.5 resize-none ${fieldCls}`} />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Font
            <select value={l.font} onChange={(e) => upd(l.id, { font: e.target.value as FontStyle | "" })} className={`mt-0.5 ${fieldCls}`}>
              <option value="">Card font</option>
              {FONT_STYLES.filter((f) => f.id !== "default").map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <Range label="Font size" value={l.size} min={16} max={260} step={2} unit="px" onChange={(v) => upd(l.id, { size: v })} />
          <Range label="Box width" value={l.w} min={8} max={100} step={1} unit="%" onChange={(v) => upd(l.id, { w: v })} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Colour
              <input type="color" aria-label="Text colour" value={l.color} onChange={(e) => upd(l.id, { color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600" />
            </label>
            <span className="flex items-center gap-1" role="radiogroup" aria-label="Alignment">
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button" role="radio" aria-checked={l.align === a} aria-label={`Align ${a}`} onClick={() => upd(l.id, { align: a })} className={cn(btn, l.align === a && "border-[#D12014] bg-[#D12014]/5 text-[#A91400] dark:text-white")}>{a === "left" ? "⇤" : a === "right" ? "⇥" : "↔"}</button>
              ))}
            </span>
            <button type="button" aria-pressed={l.bold} onClick={() => upd(l.id, { bold: !l.bold })} className={cn(btn, l.bold && "border-[#D12014] bg-[#D12014]/5")}>B</button>
            <button type="button" aria-pressed={l.italic} onClick={() => upd(l.id, { italic: !l.italic })} className={cn(btn, "italic", l.italic && "border-[#D12014] bg-[#D12014]/5")}>I</button>
          </div>
          <Range label="Letter spacing" value={l.ls * 100} min={0} max={30} step={1} unit="" onChange={(v) => upd(l.id, { ls: v / 100 })} />
          <Range label="Line height" value={l.lh * 100} min={90} max={240} step={5} unit="%" onChange={(v) => upd(l.id, { lh: v / 100 })} />
          <Range label="Opacity" value={l.opacity * 100} min={10} max={100} step={5} unit="%" onChange={(v) => upd(l.id, { opacity: v / 100 })} />
        </>
      )}
      {l.type === "image" && (
        <>
          <Range label="Width" value={l.w} min={4} max={100} step={1} unit="%" onChange={(v) => upd(l.id, { w: v })} />
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Frame shape">
            <span className="w-20 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Frame</span>
            {([["circle", "Circle"], ["rounded", "Rounded"], ["rect", "Square"]] as [LayerShape, string][]).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={l.shape === v} onClick={() => upd(l.id, { shape: v })} className={cn(btn, "flex-1 text-[11px]", l.shape === v && "border-[#D12014] bg-[#D12014]/5 text-[#A91400] dark:text-white")}>{label}</button>
            ))}
          </div>
          <Range label="Border" value={l.border} min={0} max={30} step={1} unit="px" onChange={(v) => upd(l.id, { border: v })} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Border colour
              <input type="color" aria-label="Border colour" value={l.borderColor} onChange={(e) => upd(l.id, { borderColor: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600" />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={l.shadow} onChange={(e) => upd(l.id, { shadow: e.target.checked })} className="h-4 w-4 accent-[#D12014]" /> Shadow</label>
          </div>
          <Range label="Opacity" value={l.opacity * 100} min={10} max={100} step={5} unit="%" onChange={(v) => upd(l.id, { opacity: v / 100 })} />
        </>
      )}
      {l.type === "element" && (
        <>
          <Range label="Size" value={l.w} min={4} max={100} step={1} unit="%" onChange={(v) => upd(l.id, { w: v })} />
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Colour
            <input type="color" aria-label="Element colour" value={l.color} onChange={(e) => upd(l.id, { color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600" />
          </label>
          <Range label="Opacity" value={l.opacity * 100} min={10} max={100} step={5} unit="%" onChange={(v) => upd(l.id, { opacity: v / 100 })} />
        </>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700" role="group" aria-label="Layer order">
        <button type="button" onClick={() => reorder(l.id, 1)} className={cn(btn, "inline-flex items-center gap-1 text-xs")}><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> Bring forward</button>
        <button type="button" onClick={() => reorder(l.id, -1)} className={cn(btn, "inline-flex items-center gap-1 text-xs")}><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> Send backward</button>
        <button type="button" onClick={() => del(l.id)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-red-300 px-2.5 text-xs font-bold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete</button>
      </div>
    </div>
  );

  const layerName = (l: CardLayer) => (l.type === "text" ? l.text.slice(0, 28) || "Text box" : l.type === "image" ? "Image" : ELEMENTS.find((e) => e.kind === l.kind)?.label ?? "Element");

  return (
    <div role="dialog" aria-modal="true" aria-label="Fullscreen card studio" className="fixed inset-0 z-[60] flex flex-col bg-slate-100 text-slate-900 dark:bg-[#0B0C0E] dark:text-slate-100">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-[#131416]">
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold">{tpl.name}</h2>
        <button type="button" onClick={undo} disabled={!past.current.length} aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" className={btn}><Undo2 className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={redo} disabled={!future.current.length} aria-label="Redo" title="Redo (Shift+Ctrl/Cmd+Z)" className={btn}><Redo2 className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={p.resetLayout} disabled={!p.layoutCustom} className="px-1 text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-[#D12014] disabled:cursor-default disabled:opacity-40 disabled:no-underline disabled:hover:text-slate-600 dark:text-slate-300">Reset layout</button>
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-300 p-0.5 dark:border-slate-600" role="group" aria-label="Canvas zoom">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => clamp(Math.round((z - 0.1) * 10) / 10, 0.5, 2))} disabled={zoom <= 0.5} className="h-7 w-7 rounded-md text-sm font-bold hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/10">−</button>
          <button type="button" onClick={() => setZoom(1)} title="Reset zoom" className="h-7 min-w-12 rounded-md px-1 text-[11px] font-bold tabular-nums hover:bg-slate-100 dark:hover:bg-white/10">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => clamp(Math.round((z + 0.1) * 10) / 10, 0.5, 2))} disabled={zoom >= 2} className="h-7 w-7 rounded-md text-sm font-bold hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/10">+</button>
        </div>
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#D12014] px-4 text-sm font-bold text-white hover:bg-[#A91400]"><Check className="h-4 w-4" aria-hidden="true" /> Done<span className="hidden sm:inline"> · Exit fullscreen</span></button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: tool rail + drawer */}
        <nav aria-label="Tools" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-1.5 lg:w-[72px] lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 dark:border-slate-700 dark:bg-[#131416]">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tool === t.id} onClick={() => setTool(t.id)} className={cn("flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-bold lg:flex-none", tool === t.id ? "bg-[#D12014]/10 text-[#D12014]" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10")}>
              <t.icon className="h-5 w-5" aria-hidden="true" />{t.label}
            </button>
          ))}
        </nav>
        <aside aria-label={`${tool} panel`} className="max-h-44 shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-3 lg:max-h-none lg:w-72 lg:border-r lg:border-b-0 dark:border-slate-700 dark:bg-[#131416]">
          {tool === "text" && (
            <div className="space-y-3">
              <button type="button" onClick={addText} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#D12014] px-3 py-2 text-sm font-bold text-white hover:bg-[#A91400]"><Plus className="h-4 w-4" aria-hidden="true" /> Add Text Box</button>
              {layers.some((l) => l.type === "text") && (
                <div><p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Your text boxes</p>
                  <ul className="space-y-1">{layers.filter((l) => l.type === "text").map((l) => <li key={l.id}><button type="button" onClick={() => setSel({ kind: "layer", id: l.id })} className={cn("w-full truncate rounded-md border px-2.5 py-1.5 text-left text-xs", sel?.kind === "layer" && sel.id === l.id ? "border-[#D12014] bg-[#D12014]/5" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5")}>{layerName(l)}</button></li>)}</ul></div>
              )}
              <div><p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Card text</p>
                <ul className="space-y-1">{BUILTIN.map((b) => (
                  <li key={b.id}><button type="button" onClick={() => setSel({ kind: "zone", id: b.id })} className={cn("w-full rounded-md border px-2.5 py-1.5 text-left", sel?.kind === "zone" && sel.id === b.id ? "border-[#D12014] bg-[#D12014]/5" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5")}>
                    <span className="block text-[11px] font-bold">{b.label}</span><span className="block truncate text-xs text-slate-600 dark:text-slate-300">{preview[b.id]}</span></button></li>
                ))}</ul></div>
            </div>
          )}
          {tool === "images" && (
            <div className="space-y-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#D12014] px-3 py-2 text-sm font-bold text-white hover:bg-[#A91400]"><Upload className="h-4 w-4" aria-hidden="true" /> Upload image</button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" aria-label="Upload images to place on the card" onChange={(e) => { void addImages(e.target.files); e.target.value = ""; }} />
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Logos, QR codes or extra portraits. PNG keeps its transparent background; pick a circle, rounded or square frame in the inspector.</p>
              {layers.some((l) => l.type === "image") && (
                <ul className="grid grid-cols-3 gap-1.5">{layers.filter((l) => l.type === "image").map((l) => l.type === "image" && (
                  <li key={l.id}><button type="button" aria-label="Select image" onClick={() => setSel({ kind: "layer", id: l.id })} className={cn("aspect-square w-full overflow-hidden rounded-md border bg-slate-100 dark:bg-white/5", sel?.kind === "layer" && sel.id === l.id ? "border-[#D12014] ring-1 ring-[#D12014]" : "border-slate-200 dark:border-slate-700")}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={l.src} alt="" className="h-full w-full object-cover" /></button></li>
                ))}</ul>
              )}
              <div><p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Card photo slots</p>
                <ul className="grid grid-cols-3 gap-1.5">
                  {d.photos.map((ph, i) => (
                    <li key={i} className="relative aspect-square overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={ph} alt={`Couple photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)} className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 text-[11px] font-bold text-white hover:bg-[#D12014]">✕</button></li>
                  ))}
                  {d.photos.length < 4 && <li><button type="button" onClick={() => { photoIdx.current = d.photos.length; photoRef.current?.click(); }} className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-400 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">+ Photo</button></li>}
                </ul>
                <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Add a couple photo" onChange={(e) => { void putPhoto(e.target.files?.[0], photoIdx.current); e.target.value = ""; }} />
              </div>
            </div>
          )}
          {tool === "elements" && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Click to drop it on the card, then drag, resize or recolour it.</p>
              <ul className="grid grid-cols-2 gap-2">{ELEMENTS.map((e) => (
                <li key={e.kind}><button type="button" onClick={() => addElement(e.kind, e.w)} className="flex w-full flex-col items-center gap-1 rounded-lg border border-slate-200 px-2 py-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5"><span className="text-xl text-[#B8860B]" aria-hidden="true">{e.glyph}</span><span className="text-[11px] font-bold">{e.label}</span></button></li>
              ))}</ul>
              {layers.some((l) => l.type === "element") && (
                <ul className="space-y-1 pt-1">{layers.filter((l) => l.type === "element").map((l) => <li key={l.id}><button type="button" onClick={() => setSel({ kind: "layer", id: l.id })} className={cn("w-full rounded-md border px-2.5 py-1.5 text-left text-xs", sel?.kind === "layer" && sel.id === l.id ? "border-[#D12014] bg-[#D12014]/5" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5")}>{layerName(l)}</button></li>)}</ul>
              )}
            </div>
          )}
          {tool === "templates" && (
            <ul className="grid grid-cols-2 gap-2">{p.templates.map((t) => (
              <li key={t.id}><button type="button" aria-pressed={t.id === tpl.id} onClick={() => p.onPickTemplate(t)} className={cn("w-full rounded-lg border p-1 text-left", t.id === tpl.id ? "border-[#D12014] ring-1 ring-[#D12014]" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5")}>
                <div className="aspect-[1080/1500] w-full overflow-hidden rounded bg-slate-100 dark:bg-white/5">{p.thumbs[t.id] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.thumbs[t.id]} alt="" className="h-full w-full object-cover" /> : null}</div>
                <p className="mt-1 text-[10px] leading-tight font-bold">{t.name}</p></button></li>
            ))}</ul>
          )}
          {tool === "fonts" && (
            <div role="radiogroup" aria-label="Card font" className="space-y-1.5">
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Applies to all card text. Select a text on the card to give just that text its own font.</p>
              {FONT_STYLES.map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={(d.fontStyle ?? "default") === f.id} onClick={() => p.fontForAll(f.id)} className={cn("w-full rounded-lg border px-3 py-2 text-left", (d.fontStyle ?? "default") === f.id ? "border-[#D12014] bg-[#D12014]/5 ring-1 ring-[#D12014]" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5")}>
                  <span className="block truncate text-base" style={f.id === "default" ? undefined : { fontFamily: FONT_STACKS[f.id as Exclude<FontStyle, "default">] }}>{f.label}</span>
                  <span className="block truncate text-[11px] text-slate-600 dark:text-slate-300">{f.hint}</span></button>
              ))}
            </div>
          )}
        </aside>

        {/* Centre: canvas */}
        <main className="flex min-h-0 min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_center,#e8eaee,#d6d9df)] p-6 dark:bg-[radial-gradient(circle_at_center,#1a1c20,#0e0f12)]" onPointerDown={(e) => { if (!(e.target as HTMLElement).closest("[data-card-zone], [data-layer]")) setSel(null); }}>
          <div className="relative m-auto shrink-0 overflow-hidden rounded-md bg-white shadow-2xl ring-1 ring-black/10 select-none" style={{ width: cardW, height: cardH }} onContextMenu={(e) => e.preventDefault()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src && <img src={src} alt="Invitation card" draggable={false} className="pointer-events-none h-full w-full object-cover" />}
            {src && (
              <>
                <CardEditOverlay
                  zones={zones} groups={groups} details={d} selected={sel?.kind === "zone" ? sel.id : null} onSelect={(id) => setSel({ kind: "zone", id })}
                  onPickPhoto={(i) => { photoIdx.current = i; photoRef.current?.click(); }} onRemovePhoto={removePhoto} onMoveBadge={p.moveBadge} onMoveBlock={p.moveBlock} onScaleText={p.scaleText} onEditText={() => requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-section-toolbar] textarea, [data-section-toolbar] input:not([type=range]):not([type=color]):not([type=date])")?.focus())}
                />
                <LayerOverlay layers={layers} boxes={boxes} selectedId={sel?.kind === "layer" ? sel.id : null} onSelect={(id) => setSel({ kind: "layer", id })} onChange={upd} onDelete={del} />
              </>
            )}
          </div>
        </main>

        {/* Right: inspector */}
        <aside aria-label="Inspector" className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-3 lg:max-h-none lg:w-[340px] lg:border-t-0 lg:border-l dark:border-slate-700 dark:bg-[#131416]">
          {sel?.kind === "zone" ? (
            <SectionToolbar
              zone={sel.id} zones={zones} groups={groups} details={d} cfg={cfg} onChange={set} onStyle={p.styleText}
              onMoveBadge={p.moveBadge} onMoveBlock={p.moveBlock} onScale={p.scaleText} onMaster={p.setMaster} onFont={p.fontForBlock} onAllFont={p.fontForAll} onDone={() => setSel(null)}
            />
          ) : selLayer ? layerPanel(selLayer) : (
            <div className="space-y-3 text-sm">
              <p className="font-bold">Nothing selected</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Click any text, text box or image on the card to edit it here. Drag to move; drag the red corner dot to resize. Use the left tools to add text, images and decorations.</p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300"><li>Arrow keys nudge the selection</li><li>Delete removes a custom layer</li><li>Ctrl/Cmd+Z undoes, Esc deselects then exits</li></ul>
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <Range label="All text size" value={(d.contentScale ?? 1) * 100} min={50} max={250} step={5} unit="%" onChange={(v) => p.setMaster(v / 100)} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// elementAspect is re-exported for tests / tooling that need a layer's natural height.
export { elementAspect };

"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createBanner, deleteBanner, moveBanner, setBannerActive, type Banner, type BannerResult } from "@/app/admin/banner-actions";
import { Button } from "@/components/ui/button";
import { Input, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "promo-banners";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;
const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900";
const lbl = "mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-100";

type Placement = "login_page" | "home_top";
interface Spec {
  placement: Placement;
  folder: string;
  title: string;
  badge: string;
  note: string;
  /** Aspect of the preview / thumbnail boxes. */
  previewAspect: string;
  thumbAspect: string;
  empty: string;
  /** Returns a Malayalam error when the picked image has unsuitable dimensions. */
  check: (w: number, h: number) => string | null;
}

const SPECS: Spec[] = [
  {
    placement: "login_page",
    folder: "login",
    title: "Login Page Banners (ലോഗിൻ പേജ് പോസ്റ്ററുകൾ)",
    badge: "Recommended: 1080 × 1350 px (4:5) or 1080 × 1080 px (Square)",
    note: "കുറിപ്പ്: മൊബൈലിലും ലാപ്ടോപ്പിലും കൃത്യമായി കാണുന്നതിനായി ചിത്രങ്ങൾ 1080 × 1350 px അല്ലെങ്കിൽ സ്ക്വയർ (1080 × 1080 px) അനുപാതത്തിൽ അപ്‌ലോഡ് ചെയ്യുക. പ്രധാന വിവരങ്ങളും അക്ഷരങ്ങളും ചിത്രത്തിന്റെ മധ്യഭാഗത്ത് (Center Safe Zone) നൽകാൻ ശ്രദ്ധിക്കുക. ഫയൽ സൈസ് 5 MB-യിൽ കൂടരുത്.",
    previewAspect: "aspect-[4/3]",
    thumbAspect: "aspect-video",
    empty: "No login banners yet. The sign-in page shows no ad until you upload one and switch it on.",
    check: (w, h) => (w < 600 || h < 600 ? `ചിത്രത്തിന്റെ വലിപ്പം കുറവാണ് (${w} × ${h} px). കുറഞ്ഞത് 600 × 600 px വേണം; 1080 × 1350 px (4:5) അല്ലെങ്കിൽ 1080 × 1080 px ശുപാർശ ചെയ്യുന്നു.` : null),
  },
  {
    placement: "home_top",
    folder: "home",
    title: "Home Page Top Banner (ഹോം പേജ് ഹെഡർ പോസ്റ്ററുകൾ)",
    badge: "Recommended: 1920 × 400 px (Wide Banner) or 1200 × 300 px (4:1)",
    note: "കുറിപ്പ്: ഹോം പേജിന് മുകളിൽ വലത്തുനിന്ന് ഇടത്തോട്ട് സ്ക്രോൾ ചെയ്യുന്ന പോസ്റ്ററുകൾക്കായി വൈഡ് ബാനറുകൾ അപ്‌ലോഡ് ചെയ്യുക (5 MB-യിൽ താഴെ). ഫോണിലും ടാബിലും ലാപ്ടോപ്പിലും ക്ലിയർ ആയി കാണുന്നതിനായി ടെക്സ്റ്റുകൾ മധ്യഭാഗത്ത് നൽകുക.",
    previewAspect: "aspect-[4/1]",
    thumbAspect: "aspect-[4/1]",
    empty: "No home banners yet. The home page shows no banner strip until you upload one and switch it on.",
    check: (w, h) => (w < 800 || w / h < 2 ? `ഇത് വൈഡ് ബാനർ അല്ല (${w} × ${h} px). കുറഞ്ഞത് 800 px വീതിയും വീതി ഉയരത്തിന്റെ 2 മടങ്ങെങ്കിലും വേണം; 1920 × 400 px അല്ലെങ്കിൽ 1200 × 300 px (4:1) ശുപാർശ ചെയ്യുന്നു.` : null),
  },
];

export function BannerManager({ initial }: { initial: Banner[] }) {
  const [banners, setBanners] = useState(initial);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Ad Banners <span className="font-semibold text-slate-500">/ പ്രമോഷൻ പോസ്റ്ററുകൾ</span></h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage the posters of each page separately. Only banners switched on appear; with none active, that page shows no ad at all.</p>
      </div>
      {SPECS.map((spec) => (
        <PlacementCard key={spec.placement} spec={spec} all={banners} onChange={setBanners} />
      ))}
    </div>
  );
}

function PlacementCard({ spec, all, onChange }: { spec: Spec; all: Banner[]; onChange: (b: Banner[]) => void }) {
  const toast = useToast();
  const banners = all.filter((b) => b.placement === spec.placement);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [active, setActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = spec.placement;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const reject = (msg: string) => {
    setFile(null); setPreview(null);
    if (fileRef.current) fileRef.current.value = ""; // clear the picker so the same file can be re-chosen after fixing it
    setErr(msg);
    toast.error(msg);
  };

  function pick(f?: File) {
    setErr(null);
    if (!f) return;
    if (!EXT[f.type]) return reject("JPG, PNG അല്ലെങ്കിൽ WebP ചിത്രം മാത്രം തിരഞ്ഞെടുക്കുക. (Choose a JPG, PNG or WebP image.)");
    if (f.size > MAX_BYTES) return reject("ഫയൽ സൈസ് 5 MB-യിൽ കൂടരുത്. (The image must be 5 MB or smaller.)");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const problem = spec.check(img.naturalWidth, img.naturalHeight);
      if (problem) { URL.revokeObjectURL(url); return reject(problem); }
      setFile(f);
      setPreview(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject("ഈ ചിത്രം വായിക്കാൻ കഴിഞ്ഞില്ല. (This image couldn't be read.)"); };
    img.src = url;
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!file) return setErr("Choose an image first.");
    const supabase = createClient();
    if (!supabase) return setErr("Storage isn't configured.");
    setUploading(true);
    // Straight from the browser to the bucket (the admin session is allowed to insert); only the record goes through the server.
    const path = `${spec.folder}/${crypto.randomUUID()}.${EXT[file.type]}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (up.error) { setUploading(false); return setErr(`Upload failed: ${up.error.message}`); }
    const res = await createBanner({ title, description, linkUrl, isActive: active, placement: spec.placement, storagePath: path });
    setUploading(false);
    if (!res.ok) { await supabase.storage.from(BUCKET).remove([path]); return setErr(res.message); }
    if (res.banners) onChange(res.banners);
    toast(res.message);
    setFile(null); setPreview(null); setTitle(""); setDescription(""); setLinkUrl(""); setActive(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function run(bid: string, fn: () => Promise<BannerResult>) {
    setBusy(bid);
    const res = await fn();
    setBusy(null);
    setConfirmId(null);
    if (res.banners) onChange(res.banners);
    if (res.ok) toast(res.message); else toast.error(res.message);
  }

  return (
    <section aria-labelledby={`${id}-h`} className={card}>
      <h2 id={`${id}-h`} className="text-lg font-bold text-slate-900 dark:text-white">{spec.title}</h2>

      <form onSubmit={(e) => void upload(e)} className="mt-4">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <span className={lbl}>Image (JPG, PNG or WebP, up to 5 MB)</span>
            <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 dark:bg-blue-500/20 dark:text-blue-100">{spec.badge}</span>
            <button type="button" onClick={() => fileRef.current?.click()} className={`group relative flex ${spec.previewAspect} w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 hover:border-blue-500 dark:border-slate-600 dark:bg-slate-800`}>
              {preview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={preview} alt="Banner preview" className="h-full w-full object-cover object-center" />
                : <span className="flex flex-col items-center gap-1"><ImagePlus className="h-6 w-6" aria-hidden="true" /> Click to choose an image</span>}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{spec.note}</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`${spec.title} image`} onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <div className="space-y-3">
            <div><label htmlFor={`${id}-title`} className={lbl}>Title (optional) / ടൈറ്റിൽ (ആവശ്യമെങ്കിൽ മാത്രം)</label><Input id={`${id}-title`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" /></div>
            <div><label htmlFor={`${id}-desc`} className={lbl}>Description / tagline (optional)</label><Input id={`${id}-desc`} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><label htmlFor={`${id}-url`} className={lbl}>Target URL (optional)</label><Input id={`${id}-url`} value={linkUrl} maxLength={500} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… or /login?tab=agency" /></div>
            <Switch id={`${id}-active`} label="Active" description="Show on the page" checked={active} onChange={setActive} />
          </div>
        </div>
        {err && <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{err}</p>}
        <Button type="submit" disabled={uploading} className="mt-4">{uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />} Upload banner</Button>
      </form>

      <h3 className="mt-6 text-base font-bold text-slate-900 dark:text-white">Uploaded banners ({banners.length})</h3>
      {!banners.length ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600">{spec.empty}</p>
      ) : (
        <ul className={`mt-3 grid gap-4 ${spec.placement === "home_top" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {banners.map((b, i) => (
            <li key={b.id} className={`rounded-xl border border-slate-200 p-3 dark:border-slate-700 ${b.is_active ? "" : "opacity-70"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image_url} alt={b.title || "Banner"} className={`${spec.thumbAspect} w-full rounded-lg object-cover object-center`} />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {b.title.trim() ? <p className="truncate font-bold text-slate-900 dark:text-white" title={b.title}>{b.title}</p> : <p className="truncate text-sm font-medium text-slate-400 italic">Untitled Banner (പേരില്ലാത്ത പോസ്റ്റർ)</p>}
                  {b.description && <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{b.description}</p>}
                  {b.link_url && <p className="truncate text-xs text-blue-700 dark:text-sky-300" title={b.link_url}>{b.link_url}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${b.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{b.is_active ? "Active" : "Hidden"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" role="switch" aria-checked={b.is_active} aria-label={`${b.is_active ? "Disable" : "Enable"} ${b.title || "banner"}`} disabled={busy === b.id} onClick={() => void run(b.id, () => setBannerActive(b.id, !b.is_active))} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${b.is_active ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${b.is_active ? "translate-x-5" : ""}`} />
                </button>
                <button type="button" aria-label="Move earlier" disabled={busy === b.id || i === 0} onClick={() => void run(b.id, () => moveBanner(b.id, "up"))} className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Move later" disabled={busy === b.id || i === banners.length - 1} onClick={() => void run(b.id, () => moveBanner(b.id, "down"))} className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800"><ArrowDown className="h-3.5 w-3.5" /></button>
                {confirmId === b.id ? (
                  <span className="ml-auto flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-red-700">Delete?</span>
                    <button type="button" disabled={busy === b.id} onClick={() => void run(b.id, () => deleteBanner(b.id))} className="rounded-md bg-red-600 px-2 py-1 font-bold text-white hover:bg-red-700">Yes</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="rounded-md border border-slate-300 px-2 py-1 font-bold">No</button>
                  </span>
                ) : (
                  <button type="button" aria-label={`Delete ${b.title || "banner"}`} onClick={() => setConfirmId(b.id)} className="ml-auto rounded-md border border-red-300 p-1.5 text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

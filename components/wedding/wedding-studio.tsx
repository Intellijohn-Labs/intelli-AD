"use client";

import { Download, ImagePlus, Loader2, MapPin, Send, Sparkles, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { GuestTable } from "./guest-table";
import { CardEditOverlay } from "./card-editor";
import { loadImage, photoToDataUrl, renderWeddingCard, type CardZone } from "@/lib/wedding-render";
import { normalizePhone, EMPTY_DETAILS, EVENT_TYPES, getTemplate, loadStudio, mapsLink, saveStudio, SAMPLE_DETAILS, TEMPLATES, validPhone, whatsappLink, whatsappMessage, type EventType, type Guest, type WLang, type WeddingDetails } from "@/lib/wedding";
import { cn } from "@/lib/utils";

const TABS = ["Template", "Details", "Media", "Guests & share"] as const;
const MAX_VIDEO = 50 * 1024 * 1024;

const panel = "rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5 dark:border-[#26272B] dark:bg-[#131416]";

/** Wedding card studio: pick one of 10 templates, enter the couple's details and media, let AI write the wording, then personalise and share on WhatsApp. */
export function WeddingStudio() {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Template");
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [d, setD] = useState<WeddingDetails>(EMPTY_DETAILS);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [bulk, setBulk] = useState(false);
  const [lastSent, setLastSent] = useState("");
  const [preview, setPreview] = useState("");
  const [zones, setZones] = useState<CardZone[]>([]);
  const cardPhotoRef = useRef<HTMLInputElement>(null);
  const cardPhotoIdx = useRef(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [guestPreview, setGuestPreview] = useState<Guest | null>(null);
  const [guestImg, setGuestImg] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const tpl = getTemplate(templateId);
  const set = (p: Partial<WeddingDetails>) => setD((cur) => ({ ...cur, ...p }));

  // Restore this browser's saved work.
  useEffect(() => {
    const s = loadStudio();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) { setTemplateId(s.template); setD({ ...EMPTY_DETAILS, ...s.details }); setGuests(s.guests ?? []); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) saveStudio({ template: templateId, details: d, guests, inviteId: null, publishedHash: null }); }, [hydrated, templateId, d, guests]);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);


  // Live preview of the chosen template with the couple's details.
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const c = await renderWeddingCard({ template: tpl, details: { ...SAMPLE_DETAILS, ...Object.fromEntries(Object.entries(d).filter(([, v]) => (Array.isArray(v) ? v.length : v !== ""))) } as WeddingDetails, photo: img, photo2: img2, width: 560, onZones: (z) => { if (live) setZones(z); } });
      if (live) setPreview(c.toDataURL("image/png"));
    }, 180);
    return () => { live = false; clearTimeout(t); };
  }, [hydrated, tpl, d]);

  // Gallery thumbnails (only while the gallery is open).
  const thumbKey = JSON.stringify([d.bride, d.groom, d.lang, d.eventType, d.photos[0]?.length, d.photos[1]?.length]);
  useEffect(() => {
    if (!hydrated || tab !== "Template") return;
    let live = true;
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const base = { ...SAMPLE_DETAILS, eventType: d.eventType, lang: d.lang, ...(d.bride ? { bride: d.bride } : {}), ...(d.groom ? { groom: d.groom } : {}) };
      for (const x of TEMPLATES) {
        const c = await renderWeddingCard({ template: x, details: base, photo: img, photo2: img2, width: 240 });
        if (!live) return;
        setThumbs((cur) => ({ ...cur, [x.id]: c.toDataURL("image/jpeg", 0.8) }));
      }
    }, 300);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, tab, thumbKey]);

  // The personalised card for the guest being previewed.
  useEffect(() => {
    if (!guestPreview) { setGuestImg(""); return; }
    let live = true;
    void (async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const c = await renderWeddingCard({ template: tpl, details: d, guest: guestPreview, photo: img, photo2: img2, width: 1080 });
      if (live) setGuestImg(c.toDataURL("image/png"));
    })();
    return () => { live = false; };
  }, [guestPreview, tpl, d]);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, 4 - d.photos.length)) { const u = await photoToDataUrl(f); if (u) out.push(u); }
    if (out.length) set({ photos: [...d.photos, ...out].slice(0, 4) });
  };
  const pickVideo = (f: File | undefined) => {
    if (!f) return;
    if (!/^video\/(mp4|webm)$/.test(f.type)) { toast("Please choose an MP4 or WebM video."); return; }
    if (f.size > MAX_VIDEO) { toast("The video is over 50 MB. Please trim or compress it."); return; }
    setVideo(f); setVideoPreview(URL.createObjectURL(f));
  };

  const generate = async () => {
    setAiBusy(true); setAiError("");
    try {
      const res = await fetch("/api/ai/generate-wedding-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: d.eventType, lang: d.lang, bride: d.bride, groom: d.groom, brideParents: d.brideParents, groomParents: d.groomParents, date: d.date, venue: d.venue, note: d.message, template: tpl.name, themeHint: tpl.tagline }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setAiError(j.error ?? "The AI couldn't write the wording. You can type it yourself below."); return; }
      set({ blessing: j.blessing || d.blessing, message: j.message || d.message, verse: j.verse || d.verse, accent: j.accentColor || d.accent });
      toast("AI wording and accent colour added. Edit anything you like.");
    } catch { setAiError("Couldn't reach the AI service. You can type the wording yourself."); }
    finally { setAiBusy(false); }
  };

  const [busyId, setBusyId] = useState<string | null>(null);
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);
  const safe = (n: string, fb: string) => n.trim().replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "") || fb;
  const loadPhotos = useCallback(async () => [d.photos[0] ? await loadImage(d.photos[0]) : null, d.photos[1] ? await loadImage(d.photos[1]) : null] as const, [d.photos]);
  const guestBlob = async (g: Guest, photos: readonly [HTMLImageElement | null, HTMLImageElement | null]) => {
    const c = await renderWeddingCard({ template: tpl, details: d, guest: { name: g.name, place: g.place }, photo: photos[0], photo2: photos[1], width: 1080 });
    return await new Promise<Blob>((res, rej) => c.toBlob((bl) => (bl ? res(bl) : rej(new Error("render failed"))), "image/png"));
  };
  const markSent = (g: Guest) => { setGuests((cur) => cur.map((x) => (x.id === g.id ? { ...x, status: "sent" } : x))); setLastSent(g.name || g.phone); };
  const saveBlob = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000); };

  /** Shares the guest's personalised PNG (Web Share where files are supported; otherwise download + copy text + open the chat). */
  const sendOne = async (g: Guest) => {
    if (busyId) return;
    setBusyId(g.id);
    try {
      const blob = await guestBlob(g, await loadPhotos());
      const fileName = `${safe(g.name, "Guest")}-Invitation.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const text = whatsappMessage(d, g);
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); markSent(g); }
        catch (e) { if ((e as Error)?.name !== "AbortError") toast("Sharing didn't work. Use the Preview button to download the card."); }
        return;
      }
      saveBlob(blob, fileName);
      try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked */ }
      if (validPhone(g.phone)) window.open(`https://wa.me/${normalizePhone(g.phone)}`, "_blank", "noopener,noreferrer");
      markSent(g);
      toast(validPhone(g.phone) ? "Card PNG downloaded & message copied — paste/attach the image in WhatsApp." : "Card PNG downloaded & message copied. Add a WhatsApp number to open the chat.");
    } catch { toast("Couldn't create this card. Please try again."); }
    finally { setBusyId(null); }
  };

  const downloadZip = async () => {
    if (zip || guests.length === 0) return;
    setZip({ done: 0, total: guests.length });
    try {
      const { default: JSZip } = await import("jszip");
      const z = new JSZip();
      const photos = await loadPhotos();
      const pad = String(guests.length).length < 2 ? 2 : String(guests.length).length;
      for (let i = 0; i < guests.length; i++) {
        setZip({ done: i, total: guests.length });
        await new Promise((r) => setTimeout(r, 0));
        const g = guests[i];
        z.file(`${String(i + 1).padStart(pad, "0")}-${safe(g.name, `Guest-${i + 1}`)}.png`, await guestBlob(g, photos));
      }
      setZip({ done: guests.length, total: guests.length });
      saveBlob(await z.generateAsync({ type: "blob" }), "Wedding-Invitation-Cards.zip");
      toast(`${guests.length} guest cards downloaded as a ZIP.`);
    } catch { toast("Couldn't build the ZIP. Please try again."); }
    finally { setZip(null); }
  };

  const pending = guests.filter((g) => g.status === "pending" && g.name.trim());
  const sendNext = () => {
    const n = pending[0];
    if (!n) { setBulk(false); toast("Every guest has been shared."); return; }
    void sendOne(n);
    if (pending.length <= 1) setBulk(false);
  };

  const downloadGuest = () => { if (!guestImg || !guestPreview) return; const a = document.createElement("a"); a.href = guestImg; a.download = `${safe(guestPreview.name, "Guest")}-Invitation.png`; a.click(); };
  const shareGuestImage = async () => {
    if (!guestImg || !guestPreview) return;
    const blob = await (await fetch(guestImg)).blob();
    const file = new File([blob], `${safe(guestPreview.name, "Guest")}-Invitation.png`, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: whatsappMessage(d, guestPreview) }); } catch { /* cancelled */ } }
    else downloadGuest();
  };

  const bar = (i: number) => (
    <button key={TABS[i]} type="button" role="tab" aria-selected={tab === TABS[i]} onClick={() => setTab(TABS[i])} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors", tab === TABS[i] ? "bg-[#0A0B0D] text-white dark:bg-[#D12014]" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10")}>
      <span className="mr-1.5 text-xs opacity-70">{i + 1}</span>{TABS[i]}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <p className="kicker mb-2">Wedding &amp; event invitations · വിവാഹ ക്ഷണക്കത്തുകൾ</p>
      <h1 className="text-3xl leading-tight font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">Design a wedding card and send it to every guest on WhatsApp</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Choose a template, add the couple&apos;s details and photos, let AI write the wording, then share a personalised card with each guest&apos;s name on it.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-4">
          <div role="tablist" aria-label="Steps" className={cn(panel, "flex flex-wrap gap-1 p-1.5 sm:flex-nowrap")}>{TABS.map((_, i) => bar(i))}</div>

          {tab === "Template" && (
            <section className={panel} aria-label="Templates">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Pick a template</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {TEMPLATES.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setTemplateId(x.id)} aria-pressed={templateId === x.id} className={cn("w-full rounded-lg border p-1.5 text-left transition-shadow hover:shadow-md", templateId === x.id ? "border-[#D12014] ring-2 ring-[#D12014]" : "border-slate-200 dark:border-slate-700")}>
                      <div className="aspect-[1080/1500] w-full overflow-hidden rounded bg-slate-100 dark:bg-white/5">
                        {thumbs[x.id] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[x.id]} alt={`${x.name} template`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" /></div>}
                      </div>
                      <p className="mt-1.5 text-xs leading-tight font-bold text-slate-900 dark:text-white">{x.name}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{x.tagline}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setTab("Details")} className="mt-4 rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: couple details</button>
            </section>
          )}

          {tab === "Details" && (
            <section className={cn(panel, "space-y-4")} aria-label="Couple details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="w-event" label="Event type"><Select id="w-event" value={d.eventType} onChange={(e) => set({ eventType: e.target.value as EventType })}>{EVENT_TYPES.map((x) => <option key={x.id} value={x.id}>{x.en} · {x.ml}</option>)}</Select></Field>
                <Field id="w-lang" label="Language"><Select id="w-lang" value={d.lang} onChange={(e) => set({ lang: e.target.value as WLang })}><option value="en">English</option><option value="ml">Malayalam (മലയാളം)</option><option value="both">Bilingual (ML + EN)</option></Select></Field>
                <Field id="w-bride" label="Bride's name"><Input id="w-bride" value={d.bride} onChange={(e) => set({ bride: e.target.value })} /></Field>
                <Field id="w-groom" label="Groom's name"><Input id="w-groom" value={d.groom} onChange={(e) => set({ groom: e.target.value })} /></Field>
                <Field id="w-bp" label="Bride's parents"><Input id="w-bp" value={d.brideParents} onChange={(e) => set({ brideParents: e.target.value })} placeholder="Mr. & Mrs. …" /></Field>
                <Field id="w-gp" label="Groom's parents"><Input id="w-gp" value={d.groomParents} onChange={(e) => set({ groomParents: e.target.value })} placeholder="Mr. & Mrs. …" /></Field>
                <Field id="w-date" label="Date"><Input id="w-date" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} /></Field>
                <Field id="w-time" label="Muhurtham / time"><Input id="w-time" value={d.time} onChange={(e) => set({ time: e.target.value })} placeholder="10:30 AM, Muhurtham 10:45 AM" /></Field>
                <Field id="w-venue" label="Venue" className="sm:col-span-2"><Input id="w-venue" value={d.venue} onChange={(e) => set({ venue: e.target.value })} /></Field>
                <Field id="w-maps" label="Google Maps link" hint="Optional. Guests get an “Open in Google Maps” button. Without a link, the venue name is searched." className="sm:col-span-2"><Input id="w-maps" type="url" value={d.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /></Field>
                <Field id="w-msg" label="Invitation message / family note" className="sm:col-span-2"><Textarea id="w-msg" rows={3} value={d.message} onChange={(e) => set({ message: e.target.value })} /></Field>
              </div>
              <div className="rounded-lg border border-[#D12014]/30 bg-[#D12014]/5 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void generate()} disabled={aiBusy} className="inline-flex items-center gap-1.5 rounded-full bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400] disabled:opacity-60">{aiBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} {aiBusy ? "Writing…" : "AI: write wording & pick accent colour"}</button>
                  <span className="text-xs text-slate-700 dark:text-slate-200">Poetic Malayalam / English wording, a blessing verse and a matching accent colour, from your details.</span>
                </div>
                {aiError && <p role="alert" className="mt-2 text-xs font-semibold text-red-800 dark:text-red-200">{aiError}</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field id="w-bless" label="Blessing line"><Input id="w-bless" value={d.blessing} onChange={(e) => set({ blessing: e.target.value })} placeholder={tpl.blessing[d.lang === "ml" ? 1 : 0]} /></Field>
                  <Field id="w-verse" label="Closing verse"><Input id="w-verse" value={d.verse} onChange={(e) => set({ verse: e.target.value })} /></Field>
                  <Field id="w-accent" label="Accent colour" hint="Overrides the template accent."><div className="flex items-center gap-2"><input id="w-accent" type="color" value={/^#[0-9a-fA-F]{6}$/.test(d.accent) ? d.accent : tpl.pal.accent} onChange={(e) => set({ accent: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white" />{d.accent && <button type="button" onClick={() => set({ accent: "" })} className="text-xs font-semibold text-slate-700 underline dark:text-slate-200">Use template colour</button>}</div></Field>
                </div>
              </div>
              <button type="button" onClick={() => setTab("Media")} className="rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: photos &amp; video</button>
            </section>
          )}

          {tab === "Media" && (
            <section className={cn(panel, "space-y-5")} aria-label="Photos and video">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Couple photos</h2>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Upload 1 combined couple photo or 2 individual portraits (both appear side-by-side on the card; up to 4 appear on the guest invite page).</p>
                <div className="flex flex-wrap gap-3">
                  {d.photos.map((p, i) => (
                    <div key={i} className="relative h-28 w-24 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt={`Couple photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => set({ photos: d.photos.filter((_, j) => j !== i) })} className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {d.photos.length < 4 && <button type="button" onClick={() => photoRef.current?.click()} className="flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-400 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"><ImagePlus className="h-5 w-5" aria-hidden="true" /> Add photo</button>}
                  <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Invitation video / teaser</h2>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">MP4 or WebM, up to 50 MB. Guests can play it on their invitation page.</p>
                {videoPreview ? (
                  <div className="max-w-sm"><video src={videoPreview} controls playsInline className="w-full rounded-lg bg-black" /><button type="button" onClick={() => { setVideo(null); setVideoPreview(null); }} className="mt-1 text-xs font-semibold text-red-700 underline dark:text-red-300">Remove video</button></div>
                ) : (
                  <button type="button" onClick={() => videoRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-400 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5"><Video className="h-4 w-4" aria-hidden="true" /> Upload video</button>
                )}
                <input ref={videoRef} type="file" accept="video/mp4,video/webm" className="sr-only" onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              <button type="button" onClick={() => setTab("Guests & share")} className="rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: guests &amp; share</button>
            </section>
          )}

          {tab === "Guests & share" && (
            <section className={cn(panel, "space-y-5")} aria-label="Guests and sharing">
              <div>
                <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">1. Guest list</h2>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Each guest gets their own card with “Dear Name, Place” printed on it.</p>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void downloadZip()} disabled={guests.length === 0 || !!zip} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0B0D] px-4 py-2 text-sm font-bold text-white hover:bg-[#17181C] disabled:opacity-50 dark:bg-[#D12014] dark:hover:bg-[#E83E32]">{zip ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Download All Cards (.ZIP)</button>
                  {zip && <span role="status" className="text-xs font-semibold text-slate-800 dark:text-slate-100">Generating {Math.min(zip.done + 1, zip.total)} of {zip.total} cards…</span>}
                </div>
                <GuestTable guests={guests} busyId={busyId} onChange={setGuests} onSend={(g) => void sendOne(g)} onPreview={setGuestPreview} />
              </div>
              <div className="rounded-lg border border-[#25D366]/50 bg-[#25D366]/10 p-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Share on WhatsApp</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => { setBulk(true); sendNext(); }} disabled={pending.length === 0 || busyId !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-extrabold text-[#06371a] hover:brightness-95 disabled:opacity-40"><Send className="h-4 w-4" aria-hidden="true" /> Share to all guests on WhatsApp ({pending.length})</button>
                </div>
                {bulk && (
                  <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-[#1A1B1E]">
                    <span className="text-slate-900 dark:text-white">Shared <b>{lastSent}</b>'s card. Send it in WhatsApp, come back and continue: <b>{pending.length}</b> left.</span>
                    <button type="button" onClick={sendNext} disabled={pending.length === 0} className="rounded-lg bg-[#0A0B0D] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#17181C] disabled:opacity-50 dark:bg-[#D12014]">Send to next: {pending[0]?.name || pending[0]?.phone || "—"}</button>
                    <button type="button" onClick={() => setBulk(false)} className="text-xs font-semibold underline">Stop</button>
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">On phones the share sheet sends the card image with the invitation text. On desktop the PNG is downloaded, the message is copied and the guest&apos;s chat opens — attach the image there. “Shared” means the share or chat was opened; confirm the send inside WhatsApp.</p>
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Live card preview">
          <div className={cn(panel, "space-y-3")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Live preview · {tpl.name}</h2>
              {d.mapsUrl || d.venue ? <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300"><MapPin className="h-3 w-3" aria-hidden="true" /> Maps button on invite</span> : null}
            </div>
            <p className="text-center text-[11px] text-slate-600 dark:text-slate-300">Click any text on the card to edit directly</p>
            <div className="relative mx-auto w-full max-w-[420px]">
              <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-white/5" style={{ aspectRatio: "1080 / 1500" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview ? <img src={preview} alt="Wedding card preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}
                {preview && <CardEditOverlay zones={zones} details={d} onChange={set} onPickPhoto={(i) => { cardPhotoIdx.current = i; cardPhotoRef.current?.click(); }} />}
              </div>
              <input ref={cardPhotoRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload photo for the card" onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (!f) return;
                const u = await photoToDataUrl(f);
                if (!u) return;
                const i = Math.min(cardPhotoIdx.current, d.photos.length);
                const next = [...d.photos]; next[i] = u; set({ photos: next.slice(0, 4) });
              }} />
            </div>
            {videoPreview && <video src={videoPreview} controls playsInline className="mx-auto w-full max-w-[420px] rounded-lg bg-black" aria-label="Invitation video preview" />}
            {mapsLink(d) && <a href={mapsLink(d)} target="_blank" rel="noopener noreferrer" className="mx-auto flex max-w-[420px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5"><MapPin className="h-4 w-4" aria-hidden="true" /> Open venue in Google Maps</a>}
          </div>
        </aside>
      </div>

      {guestPreview && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-stone-950/75 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setGuestPreview(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Personalised card" className="flex max-h-[94vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Card for {guestPreview.name || "this guest"}</h2><button type="button" aria-label="Close" onClick={() => setGuestPreview(null)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5" style={{ aspectRatio: "1080 / 1500" }}>{/* eslint-disable-next-line @next/next/no-img-element */}{guestImg ? <img src={guestImg} alt="Personalised card" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}</div>
            <div className="flex gap-2"><button type="button" onClick={downloadGuest} disabled={!guestImg} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100"><Download className="h-4 w-4" aria-hidden="true" /> Download PNG</button><button type="button" onClick={() => void shareGuestImage()} disabled={!guestImg} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-bold text-[#06371a] disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" /> Share image</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

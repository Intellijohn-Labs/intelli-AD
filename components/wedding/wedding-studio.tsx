"use client";

import { ImagePlus, Loader2, MapPin, Send, Sparkles, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { GuestTable } from "./guest-table";
import { CardEditOverlay } from "./card-editor";
import { loadImage, photoToDataUrl, renderWeddingCard, type CardZone } from "@/lib/wedding-render";
import { renderGif, warmPetals } from "@/lib/wedding-motion";
import { publishInvitation } from "@/lib/wedding-publish";
import { MotionCanvas } from "./motion-canvas";
import { EMPTY_DETAILS, EFFECTS, EVENTS, eventConfig, getTemplate, inviteUrl, loadStudio, mapsLink, saveStudio, sampleFor, TEMPLATE_FILTERS, templateSuits, TEMPLATES, validPhone, whatsappMessage, type CardEffect, type EventType, type Guest, type TemplateFilter, type WeddingDetails, type WeddingTemplate, type WLang } from "@/lib/wedding";
import { cn } from "@/lib/utils";
import type { Palette } from "@/lib/wedding";

const TABS = ["Template", "Details", "Media", "Guests & share"] as const;
const MAX_VIDEO = 50 * 1024 * 1024;

const panel = "rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5 dark:border-[#26272B] dark:bg-[#131416]";

/** Invitation cards studio: pick one of 10 templates, enter the couple's details and media, let AI write the wording, then personalise and share on WhatsApp. */
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
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [publishedHash, setPublishedHash] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [zones, setZones] = useState<CardZone[]>([]);
  const cardPhotoRef = useRef<HTMLInputElement>(null);
  const cardPhotoIdx = useRef(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [effect, setEffect] = useState<CardEffect>("none");
  const [guestPreview, setGuestPreview] = useState<Guest | null>(null);
  const [guestImg, setGuestImg] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const tpl = getTemplate(templateId);
  const msgEdited = useRef(false);
  const set = (p: Partial<WeddingDetails>) => { if ("message" in p) msgEdited.current = p.message !== ""; setD((cur) => ({ ...cur, ...p })); };

  // Restore this browser's saved work.
  useEffect(() => {
    const s = loadStudio();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) { setInviteId(s.inviteId); setPublishedHash(s.publishedHash); setEffect(s.effect ?? "none"); setTemplateId(s.template); setD({ ...EMPTY_DETAILS, ...s.details }); setGuests(s.guests ?? []); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) saveStudio({ template: templateId, details: d, guests, inviteId, publishedHash, effect }); }, [hydrated, templateId, d, guests, effect, inviteId, publishedHash]);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);


  // The details every render uses (preview, guest PNGs, ZIP): the couple's own, with sample text only where a field is empty.
  const cfg = eventConfig(d.eventType);
  const rd = useMemo(() => ({ ...sampleFor(d.eventType), ...Object.fromEntries(Object.entries(d).filter(([, v]) => (Array.isArray(v) ? v.length : v !== ""))) }) as WeddingDetails, [d]);

  // A template suits an event when it is in the event's group (wedding events also use the shared "events" designs).
  const suits = (t: WeddingTemplate, ev: EventType) => templateSuits(t, ev);
  const pickEvent = (ev: EventType) => {
    const g = eventConfig(ev).group;
    set(msgEdited.current ? { eventType: ev } : { eventType: ev, message: "" }); setFilter(g === "events" ? "events" : g);
    if (!suits(tpl, ev)) { const next = TEMPLATES.find((t) => t.defaultEvent === ev) ?? TEMPLATES.find((t) => suits(t, ev)); if (next) { setTemplateId(next.id); setFilter(g === "events" ? "events" : g); } }
  };
  const pickTemplate = (t: WeddingTemplate) => { setTemplateId(t.id); if (!suits(t, d.eventType)) set(msgEdited.current ? { eventType: t.defaultEvent } : { eventType: t.defaultEvent, message: "" }); };
  const shown = TEMPLATES.filter((t) => filter === "all" || (filter === "animated" ? t.animated : t.category === filter));

  // Live preview of the chosen template with the couple's details.
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const c = await renderWeddingCard({ template: tpl, details: rd, photo: img, photo2: img2, width: 560, onZones: (z) => { if (live) setZones(z); } });
      if (live) setPreview(c.toDataURL("image/png"));
    }, 180);
    return () => { live = false; clearTimeout(t); };
  }, [hydrated, tpl, rd, d.photos]);

  // Gallery thumbnails: only the templates in the open filter, drawn with sample text for their own event type.
  const thumbKey = JSON.stringify([d.bride, d.groom, d.lang, d.eventType, d.photos[0]?.length, d.photos[1]?.length]);
  const thumbKeyRef = useRef("");
  useEffect(() => {
    if (!hydrated || tab !== "Template") return;
    let live = true;
    const fresh = thumbKeyRef.current !== thumbKey;
    if (fresh) { thumbKeyRef.current = thumbKey; setThumbs({}); }
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      for (const x of shown) {
        if (!fresh && thumbs[x.id]) continue;
        const ev = suits(x, d.eventType) ? d.eventType : x.defaultEvent;
        const same = ev === d.eventType;
        const base = { ...sampleFor(ev), lang: d.lang, ...(same && d.bride ? { bride: d.bride } : {}), ...(same && d.groom ? { groom: d.groom } : {}) };
        const c = await renderWeddingCard({ template: x, details: base, photo: img, photo2: img2, width: 240 });
        if (!live) return;
        setThumbs((cur) => ({ ...cur, [x.id]: c.toDataURL("image/jpeg", 0.8) }));
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, tab, thumbKey, filter]);

  // The personalised card for the guest being previewed.
  useEffect(() => {
    if (!guestPreview) { setGuestImg(""); return; }
    let live = true;
    void (async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const c = await renderWeddingCard({ template: tpl, details: rd, guest: guestPreview, photo: img, photo2: img2, width: 1080 });
      if (live) setGuestImg(c.toDataURL("image/png"));
    })();
    return () => { live = false; };
  }, [guestPreview, tpl, rd, d.photos]);

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
      set({ blessing: j.blessing || d.blessing, message: j.message || d.message, verse: j.verse || d.verse, accent: j.accentColor || d.accent }); msgEdited.current = false;
      toast("AI wording and accent colour added. Edit anything you like.");
    } catch { setAiError("Couldn't reach the AI service. You can type the wording yourself."); }
    finally { setAiBusy(false); }
  };

  const [busyId, setBusyId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const safe = (n: string, fb: string) => n.trim().replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "") || fb;
  const loadPhotos = useCallback(async () => [d.photos[0] ? await loadImage(d.photos[0]) : null, d.photos[1] ? await loadImage(d.photos[1]) : null] as const, [d.photos]);
  const HEXRE = /^#[0-9a-fA-F]{6}$/;
  const pal: Palette = useMemo(() => ({ ...tpl.pal, ...(HEXRE.test(d.accent) ? { accent: d.accent } : {}) }), [tpl, d.accent]);
  const warm = warmPetals(tpl.motif);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const cardHash = useMemo(() => JSON.stringify([templateId, rd, effect, video?.name, video?.size]), [templateId, rd, effect, video]);

  /** The personalised card as an in-memory image (PNG, or a looping GIF when a motion is chosen). It is uploaded, never saved to this device. */
  const cardBlob = async (g: Guest, photos: readonly [HTMLImageElement | null, HTMLImageElement | null]): Promise<Blob> => {
    const base = await renderWeddingCard({ template: tpl, details: rd, guest: { name: g.name, place: g.place }, photo: photos[0], photo2: photos[1], width: effect === "none" ? 1080 : 540 });
    if (effect !== "none") return renderGif({ base, effect, pal, warm, frames: 24 });
    return await new Promise<Blob>((res, rej) => base.toBlob((bl) => (bl ? res(bl) : rej(new Error("render failed"))), "image/png"));
  };

  /** Makes sure this card exists as an online invitation page (the personalised link guests get); null when online storage isn't available. */
  const ensurePublished = async (): Promise<string | null> => {
    if (inviteId && !inviteId.startsWith("local-") && publishedHash === cardHash) return inviteId;
    const r = await publishInvitation(templateId, rd, video, effect);
    if (r.local) { toast("The invitation page couldn't be saved online, so cards are sent without a personal link."); return null; }
    setInviteId(r.id); setPublishedHash(cardHash);
    return r.id;
  };

  const setStatus = (id: string, status: Guest["status"]) => setGuests((cur) => cur.map((x) => (x.id === id ? { ...x, status } : x)));

  /** Renders one guest's card, uploads it and hands it to Waau Panel (or queues it). Returns false to stop a batch (not signed in, etc.). */
  const dispatchOne = async (g: Guest, invId: string | null, photos: readonly [HTMLImageElement | null, HTMLImageElement | null]): Promise<boolean> => {
    try {
      const blob = await cardBlob(g, photos);
      const fd = new FormData();
      fd.append("meta", JSON.stringify({ invitationId: invId, name: g.name.trim(), place: g.place.trim(), phone: g.phone, message: whatsappMessage(rd, g), inviteUrl: invId ? inviteUrl(origin, invId, g) : "" }));
      fd.append("card", blob, effect === "none" ? "card.png" : "card.gif");
      const res = await fetch("/api/invitations/waau-dispatch", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { status?: "queued" | "sent" | "failed"; error?: string };
      if (j.status) { setStatus(g.id, j.status); if (j.status === "failed") toast(`${g.name}: ${j.error ?? "Waau Panel couldn't send this invitation."}`); return true; }
      setStatus(g.id, "failed");
      toast(j.error ?? "Couldn't send this invitation.");
      return res.status !== 401 && res.status !== 429 && res.status !== 503;
    } catch {
      setStatus(g.id, "failed");
      toast("Couldn't reach the server. Please try again.");
      return false;
    }
  };

  const sendOne = async (g: Guest) => {
    if (busyId || batch || !g.name.trim() || !validPhone(g.phone)) return;
    setBusyId(g.id);
    try { await dispatchOne(g, await ensurePublished(), await loadPhotos()); } finally { setBusyId(null); }
  };

  const sendable = guests.filter((g) => (g.status === "pending" || g.status === "failed") && g.name.trim() && validPhone(g.phone));
  const sendAll = async () => {
    if (busyId || batch || sendable.length === 0) return;
    const list = sendable;
    setBatch({ done: 0, total: list.length });
    try {
      const invId = await ensurePublished(), photos = await loadPhotos();
      for (let i = 0; i < list.length; i++) {
        setBatch({ done: i, total: list.length });
        setBusyId(list[i].id);
        if (!(await dispatchOne(list[i], invId, photos))) break;
      }
    } finally { setBusyId(null); setBatch(null); }
  };
  const counts = { queued: guests.filter((g) => g.status === "queued").length, sent: guests.filter((g) => g.status === "sent").length, failed: guests.filter((g) => g.status === "failed").length };

  const bar = (i: number) => (
    <button key={TABS[i]} type="button" role="tab" aria-selected={tab === TABS[i]} onClick={() => setTab(TABS[i])} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors", tab === TABS[i] ? "bg-[#0A0B0D] text-white dark:bg-[#D12014]" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10")}>
      <span className="mr-1.5 text-xs opacity-70">{i + 1}</span>{TABS[i]}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <p className="kicker mb-2">Invitation cards · ക്ഷണക്കത്തുകൾ</p>
      <h1 className="text-3xl leading-tight font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">Design an invitation card and send it to every guest on WhatsApp</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Weddings, birthdays, housewarming, baby ceremonies and more: choose a template, add your details and photos, let AI write the wording, then send a personalised card (still or animated) to each guest on WhatsApp through Waau Panel.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-4">
          <div role="tablist" aria-label="Steps" className={cn(panel, "flex flex-wrap gap-1 p-1.5 sm:flex-nowrap")}>{TABS.map((_, i) => bar(i))}</div>

          {tab === "Template" && (
            <section className={panel} aria-label="Templates">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Pick a template</h2>
              <div role="tablist" aria-label="Template categories" className="-mx-1 mb-3 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TEMPLATE_FILTERS.map((f) => (
                  <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={cn("shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors", filter === f.id ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10")}>{f.label}</button>
                ))}
              </div>
              <div className={cn("mb-4 rounded-lg border p-3", filter === "animated" ? "border-[#B8860B] bg-[#B8860B]/10" : "border-slate-200 dark:border-slate-700")}>
                <p className="mb-2 text-xs font-bold text-slate-900 dark:text-white">✨ Animated GIF motion <span className="font-normal text-slate-600 dark:text-slate-300">· moves in the live preview and dispatches as an animated GIF via Waau Panel</span></p>
                <div role="radiogroup" aria-label="Animated GIF motion" className="flex flex-wrap gap-2">
                  {EFFECTS.map((e) => (
                    <button key={e.id} type="button" role="radio" aria-checked={effect === e.id} onClick={() => setEffect(e.id)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", effect === e.id ? "border-[#B8860B] bg-[#B8860B] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10")}>{e.label}</button>
                  ))}
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {shown.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => pickTemplate(x)} aria-pressed={templateId === x.id} className={cn("relative w-full rounded-lg border p-1.5 text-left transition-shadow hover:shadow-md", templateId === x.id ? "border-[#D12014] ring-2 ring-[#D12014]" : "border-slate-200 dark:border-slate-700")}>
                      {x.premium && <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-gradient-to-r from-[#B8860B] to-[#E3BE5C] px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-[#3B2A00] shadow">✨ PREMIUM</span>}
                      {x.animated && <span className="absolute top-2.5 right-2.5 z-10 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">GIF</span>}
                      <div className="aspect-[1080/1500] w-full overflow-hidden rounded bg-slate-100 dark:bg-white/5">
                        {thumbs[x.id] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[x.id]} alt={`${x.name} template`} draggable={false} onContextMenu={(e) => e.preventDefault()} className="pointer-events-none h-full w-full object-cover select-none" /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" /></div>}
                      </div>
                      <p className="mt-1.5 text-xs leading-tight font-bold text-slate-900 dark:text-white">{x.name}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{x.tagline}</p>
                    </button>
                  </li>
                ))}
              </ul>
              {shown.length === 0 && <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">No templates in this group.</p>}
              <button type="button" onClick={() => setTab("Details")} className="mt-4 rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: event details</button>
            </section>
          )}

          {tab === "Details" && (
            <section className={cn(panel, "space-y-4")} aria-label="Event details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="w-event" label="Event type"><Select id="w-event" value={d.eventType} onChange={(e) => pickEvent(e.target.value as EventType)}>{EVENTS.map((x) => <option key={x.id} value={x.id}>{x.en} · {x.ml}</option>)}</Select></Field>
                <Field id="w-lang" label="Language"><Select id="w-lang" value={d.lang} onChange={(e) => set({ lang: e.target.value as WLang })}><option value="en">English</option><option value="ml">Malayalam (മലയാളം)</option><option value="both">Bilingual (ML + EN)</option></Select></Field>
                <Field id="w-groom" label={cfg.labels.name1}><Input id="w-groom" value={d.groom} onChange={(e) => set({ groom: e.target.value })} placeholder={cfg.sample.groom} /></Field>
                {cfg.useName2 && <Field id="w-bride" label={cfg.labels.name2}><Input id="w-bride" value={d.bride} onChange={(e) => set({ bride: e.target.value })} placeholder={cfg.sample.bride || undefined} /></Field>}
                <Field id="w-gp" label={cfg.labels.host1}><Input id="w-gp" value={d.groomParents} onChange={(e) => set({ groomParents: e.target.value })} placeholder={cfg.sample.groomParents} /></Field>
                {cfg.useHost2 && <Field id="w-bp" label={cfg.labels.host2}><Input id="w-bp" value={d.brideParents} onChange={(e) => set({ brideParents: e.target.value })} placeholder="Mr. & Mrs. …" /></Field>}
                <Field id="w-date" label="Date"><Input id="w-date" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} /></Field>
                <Field id="w-time" label={cfg.labels.time}><Input id="w-time" value={d.time} onChange={(e) => set({ time: e.target.value })} placeholder={cfg.sample.time} /></Field>
                <Field id="w-venue" label={cfg.labels.venue} className="sm:col-span-2"><Input id="w-venue" value={d.venue} onChange={(e) => set({ venue: e.target.value })} placeholder={cfg.sample.venue} /></Field>
                <Field id="w-maps" label="Google Maps link" hint="Optional. Guests get an “Open in Google Maps” button. Without a link, the venue name is searched." className="sm:col-span-2"><Input id="w-maps" type="url" value={d.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /></Field>
                <Field id="w-msg" label="Invitation message / note" className="sm:col-span-2"><Textarea id="w-msg" rows={3} value={d.message} onChange={(e) => set({ message: e.target.value })} /></Field>
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
            <section className={cn(panel, "space-y-5")} aria-label="Guests and Waau Panel dispatch">
              <div>
                <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">1. Add your guests</h2>
                <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">Add each recipient&apos;s name, place and WhatsApp number (one by one, or paste many from Excel / Sheets). Every guest gets their own card with “Dear Name, Place” on it, prepared automatically. Cards are never downloaded to your device.</p>
                <GuestTable guests={guests} busyId={busyId} onChange={setGuests} onSend={(g) => void sendOne(g)} onPreview={setGuestPreview} />
              </div>
              <div className="rounded-lg border border-[#25D366]/50 bg-[#25D366]/10 p-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Dispatch via Waau Panel</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void sendAll()} disabled={sendable.length === 0 || !!batch || busyId !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-extrabold text-[#06371a] hover:brightness-95 disabled:opacity-40">{batch ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Send All via Waau Panel ({sendable.length} {sendable.length === 1 ? "guest" : "guests"})</button>
                  {batch && <span role="status" className="text-xs font-semibold text-slate-900 dark:text-white">Preparing and sending {Math.min(batch.done + 1, batch.total)} of {batch.total}…</span>}
                </div>
                {(counts.queued > 0 || counts.sent > 0 || counts.failed > 0) && (
                  <p role="status" className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">{counts.sent > 0 && <span className="mr-3">Sent via Waau Panel: {counts.sent}</span>}{counts.queued > 0 && <span className="mr-3">Queued in Waau Panel: {counts.queued}</span>}{counts.failed > 0 && <span className="text-red-700 dark:text-red-300">Failed: {counts.failed} (use Send to retry)</span>}</p>
                )}
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">Each personalised card{effect !== "none" ? " (animated GIF)" : ""} is generated, stored securely and handed to Waau Panel for WhatsApp delivery. Until Waau Panel is connected, invitations wait as “Queued in Waau Panel”. Guests without a valid WhatsApp number are skipped. You need to be signed in to send.</p>
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
              <div onContextMenu={(e) => e.preventDefault()} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 select-none dark:border-slate-700 dark:bg-white/5" style={{ aspectRatio: "1080 / 1500" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview ? (effect !== "none" ? <MotionCanvas src={preview} effect={effect} pal={pal} warm={warm} /> : <img src={preview} alt="Invitation card preview" draggable={false} className="pointer-events-none h-full w-full object-cover select-none" />) : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}
                {preview && <CardEditOverlay zones={zones} details={d} cfg={cfg} onChange={set} onPickPhoto={(i) => { cardPhotoIdx.current = i; cardPhotoRef.current?.click(); }} />}
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
            <div onContextMenu={(e) => e.preventDefault()} className="w-full overflow-hidden rounded-lg bg-slate-100 select-none dark:bg-white/5" style={{ aspectRatio: "1080 / 1500" }}>{/* eslint-disable-next-line @next/next/no-img-element */}{guestImg ? <img src={guestImg} alt="Personalised card" draggable={false} className="pointer-events-none h-full w-full object-cover select-none" /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}</div>
            <button type="button" onClick={() => { void sendOne(guestPreview); }} disabled={!!busyId || !!batch || !guestPreview.name.trim() || !validPhone(guestPreview.phone)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-extrabold text-[#06371a] disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" /> Send via Waau Panel</button>
          </div>
        </div>
      )}
    </div>
  );
}

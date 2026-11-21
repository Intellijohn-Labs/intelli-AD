"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImagePlus, Loader2, Maximize2, MapPin, Send, Sparkles, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { GuestTable } from "./guest-table";
import { CardEditOverlay } from "./card-editor";
import { SectionToolbar } from "./section-toolbar";
import { CooldownPill } from "./cooldown-pill";
import { ModeSelector } from "./mode-selector";
import { DispatchLog } from "./dispatch-log";
import { StudioFullscreen } from "./studio-fullscreen";
import { loadImage, photoToDataUrl, renderWeddingCard, type CardZone, type GroupBox } from "@/lib/wedding-render";
import { clock, COOLDOWN_WINDOW_MS, cooldownUntil, REPLIED_CONFIRM } from "@/lib/invitation-cooldown";
import { publishInvitation } from "@/lib/wedding-publish";
import { CUSTOM_TEMPLATE_ID, EMPTY_DETAILS, EVENTS, EVENT_TITLE, FONT_STACKS, FONT_STYLES, GREETING_FORMATS, greetingText, SAMPLE_GUEST, type BlockId, type BlockKey, type TextId, type TextStyle, TEXT_SCALE_MAX, TEXT_SCALE_MIN, type FontStyle, eventConfig, getTemplate, inviteUrl, loadStudio, mapsLink, normalizePhone, saveStudio, sampleFor, TEMPLATE_FILTERS, templateSuits, TEMPLATES, validPhone, whatsappMessage, type CardEffect, type EventType, type GreetingFormat, type Guest, type TemplateFilter, type WeddingDetails, type WeddingTemplate, type WLang } from "@/lib/wedding";
import { cn } from "@/lib/utils";
import type { Palette } from "@/lib/wedding";

const TABS = ["Template", "Details", "Media", "Guests & share"] as const;

const panel = "rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5 dark:border-[#26272B] dark:bg-[#131416]";

/** Invitation cards studio: pick one of 10 templates, enter the couple's details and media, let AI write the wording, then personalise and share on WhatsApp. */
export function WeddingStudio() {
  const toast = useToast();
  // Invitation / Greeting mode lives in the URL (?mode=invitation | greeting); with neither the studio shows the mode selector first.
  const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: "invitation" | "greeting" | null = modeParam === "invitation" || modeParam === "greeting" ? modeParam : null;
  const lastInviteEvent = useRef<EventType>("wedding");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Template");
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [d, setD] = useState<WeddingDetails>(EMPTY_DETAILS);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [publishedHash, setPublishedHash] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [zones, setZones] = useState<CardZone[]>([]);
  const [groups, setGroups] = useState<GroupBox[]>([]);
  const [zoom, setZoom] = useState(1); // preview canvas zoom only; the exported PNG is always rendered at full resolution
  const [selected, setSelected] = useState<CardZone["id"] | null>(null); // the text section whose toolbar is open (null = clean preview)
  const cardPhotoRef = useRef<HTMLInputElement>(null);
  const cardPhotoIdx = useRef(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TemplateFilter>("all");
  // The template grid shows one row until "See more"; switching category always collapses it again.
  const [logTick, setLogTick] = useState(0); // bumps the Step 4 dispatch log after each send
  // Per-number cooldown (max 2 invitations per rolling 24 hours, Meta's marketing template cap). Send times come from the dispatch history on the server (any sender); this browser's
  // own sends are kept in localStorage as a fallback for when the history can't be read (signed out / offline) and as an optimistic add
  // until the next refresh. The server enforces the same rule, so this is only the live countdown.
  const SENDS_KEY = "intelliad_invite_send_times";
  const [serverTimes, setServerTimes] = useState<Record<string, number[]> | null>(null);
  const [localTimes, setLocalTimes] = useState<Record<string, number[]>>({});
  const [now, setNow] = useState(() => Date.now());
  const [sendNote, setSendNote] = useState("");
  // "Guest replied" overrides: when the user confirms a guest replied on WhatsApp, only sends made after that moment count towards the cap.
  const REPLIED_KEY = "intelliad_invite_replied";
  const [replied, setReplied] = useState<Record<string, number>>({});
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(REPLIED_KEY) ?? "{}") as Record<string, number>, cut = Date.now() - COOLDOWN_WINDOW_MS; setReplied(Object.fromEntries(Object.entries(raw).filter(([, t]) => t > cut))); } catch { /* ignore */ }
  }, []);
  const hasReplied = (phone: string) => validPhone(phone) && (replied[normalizePhone(phone)] ?? 0) > Date.now() - COOLDOWN_WINDOW_MS;
  const markReplied = (phone: string) => {
    if (!window.confirm(REPLIED_CONFIRM)) return;
    const p = normalizePhone(phone), t = Date.now();
    setReplied((cur) => { const next = { ...cur, [p]: t }; try { localStorage.setItem(REPLIED_KEY, JSON.stringify(next)); } catch { /* ignore */ } return next; });
    setNow(t); toast("Marked as replied. You can message this number again.");
  };
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(SENDS_KEY) ?? "{}") as Record<string, number[]>; const cut = Date.now() - COOLDOWN_WINDOW_MS; setLocalTimes(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.filter((t) => t > cut)]).filter(([, v]) => (v as number[]).length))); } catch { /* ignore */ }
  }, []);
  const noteSend = (phone: string) => {
    const p = normalizePhone(phone), t = Date.now();
    setLocalTimes((cur) => { const next = { ...cur, [p]: [...(cur[p] ?? []), t] }; try { localStorage.setItem(SENDS_KEY, JSON.stringify(next)); } catch { /* ignore */ } return next; });
    setServerTimes((cur) => (cur ? { ...cur, [p]: [...(cur[p] ?? []), t] } : cur)); // optimistic until the refresh below replaces it
  };
  const guestPhonesKey = guests.map((g) => (validPhone(g.phone) ? normalizePhone(g.phone) : "")).filter(Boolean).join(",");
  useEffect(() => {
    if (tab !== "Guests & share") return;
    let live = true;
    const phones = guestPhonesKey ? guestPhonesKey.split(",") : [];
    fetch("/api/invitations/dispatches/cooldowns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phones }) })
      .then((r) => (r.ok && (r.headers.get("content-type") ?? "").includes("json") ? r.json() : null))
      .then((j: { times?: Record<string, number[]> } | null) => { if (live) setServerTimes(j?.times ?? null); })
      .catch(() => { if (live) setServerTimes(null); });
    return () => { live = false; };
  }, [tab, guestPhonesKey, logTick]);
  /** Milliseconds until this number can be sent to again (0 = now). */
  const cooldownLeft = (phone: string): number => {
    if (!validPhone(phone)) return 0;
    const p = normalizePhone(phone), since = replied[p] ?? 0, until = cooldownUntil((serverTimes ? serverTimes[p] ?? [] : localTimes[p] ?? []).filter((t) => t > since), now);
    return until ? Math.max(0, until - now) : 0;
  };
  const anyCooldown = guests.some((g) => cooldownLeft(g.phone) > 0) || (serverTimes === null && Object.values(localTimes).some((v) => v.length >= 2));
  useEffect(() => {
    if (!anyCooldown) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyCooldown]);
  const [studioOpen, setStudioOpen] = useState(false);
  const scrollBeforeStudio = useRef(0);
  const enlargeRef = useRef<HTMLButtonElement>(null);
  const closeStudio = () => { // back to exactly where the page was (the fullscreen layer locks and unlocks page scrolling)
    setStudioOpen(false);
    const y = scrollBeforeStudio.current;
    requestAnimationFrame(() => { window.scrollTo(0, y); requestAnimationFrame(() => { window.scrollTo(0, y); enlargeRef.current?.focus({ preventScroll: true }); }); });
  };
  /** Double-click on a card text: put the cursor in that text's edit field in the toolbar. */
  const editTextField = () => requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-section-toolbar] textarea, [data-section-toolbar] input:not([type=range]):not([type=color]):not([type=date])")?.focus()); // the Canva-style fullscreen editor
  const [fontsOpen, setFontsOpen] = useState(false); // Card font shows the first 4 choices until "View more"
  const FONTS_COLLAPSED = 4;
  const [expandedFor, setExpandedFor] = useState<TemplateFilter | null>(null);
  const expanded = expandedFor === filter;
  // The category pills scroll horizontally; the arrows page through them and the picked pill is brought into view.
  const pillsRef = useRef<HTMLDivElement>(null);
  const [pillEdge, setPillEdge] = useState({ start: true, end: true });
  const syncPills = useCallback(() => {
    const el = pillsRef.current; if (!el) return;
    setPillEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const el = pillsRef.current; if (!el) return;
    syncPills();
    const ro = new ResizeObserver(syncPills); ro.observe(el);
    return () => ro.disconnect();
  }, [syncPills, tab]);
  const scrollPills = (dir: 1 | -1) => pillsRef.current?.scrollBy({ left: dir * Math.max(120, (pillsRef.current?.clientWidth ?? 0) * 0.7), behavior: "smooth" });
  const chooseFilter = (f: TemplateFilter) => {
    setFilter(f); setExpandedFor(null);
    requestAnimationFrame(() => pillsRef.current?.querySelector<HTMLElement>(`[data-pill="${f}"]`)?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" }));
  };
  const [cols, setCols] = useState(5); // cards per row at the current width: 2 (phone), 3 (>= 640 px), 5 (>= 1280 px), matching the grid classes
  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)"), xl = window.matchMedia("(min-width: 1280px)");
    const sync = () => setCols(xl.matches ? 5 : sm.matches ? 3 : 2);
    sync();
    sm.addEventListener("change", sync); xl.addEventListener("change", sync);
    return () => { sm.removeEventListener("change", sync); xl.removeEventListener("change", sync); };
  }, []);
  const effect: CardEffect = "none";
  const [guestPreview, setGuestPreview] = useState<Guest | null>(null);
  const [guestImg, setGuestImg] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const tpl = getTemplate(templateId);
  const msgEdited = useRef(false);
  const set = (p: Partial<WeddingDetails>) => { if ("message" in p) msgEdited.current = p.message !== ""; setD((cur) => ({ ...cur, ...p })); };

  // Restore this browser's saved work.
  useEffect(() => {
    const s = loadStudio();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) { setInviteId(s.inviteId); setPublishedHash(s.publishedHash); setTemplateId(s.template === CUSTOM_TEMPLATE_ID && !s.details?.customCard ? TEMPLATES.find((t) => t.id !== CUSTOM_TEMPLATE_ID)!.id : s.template); setD({ ...EMPTY_DETAILS, ...s.details }); setGuests(s.guests ?? []); }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) saveStudio({ template: templateId, details: d, guests, inviteId, publishedHash, effect }); }, [hydrated, templateId, d, guests, effect, inviteId, publishedHash]);


  // The details every render uses (preview, guest PNGs, ZIP): the couple's own, with sample text only where a field is empty.
  const cfg = eventConfig(d.eventType);
  const isCustomMode = templateId === CUSTOM_TEMPLATE_ID && !!d.customCard;
  const isFestival = cfg.group === "festival" && !isCustomMode; // greeting cards: headline, wish, sender (no ceremony fields)
  const rd = useMemo(() => {
    // An uploaded card shows only what the client typed (no sample names, date or venue leaking into the WhatsApp text); other templates fill blanks with samples.
    const base = { ...sampleFor(d.eventType), ...(isCustomMode ? { groom: "", bride: "", groomParents: "", brideParents: "", date: "", time: "", venue: "", message: "" } : {}) };
    const merged = { ...base, ...Object.fromEntries(Object.entries(d).filter(([, v]) => (Array.isArray(v) ? v.length : v !== ""))) } as WeddingDetails;
    return isCustomMode ? merged : { ...merged, customCard: null }; // presets never carry (or publish) the uploaded image
  }, [d, isCustomMode]);

  // A template suits an event when it is in the event's group (wedding events also use the shared "events" designs).
  const suits = (t: WeddingTemplate, ev: EventType) => templateSuits(t, ev);

  // Templates the admin disabled or deleted (/admin/invitations) are hidden; if the current pick is one of them, fall back to an active one.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    let live = true;
    fetch("/api/invitations/templates/status").then((res) => (res.ok ? res.json() : null)).then((j: { disabled?: string[]; deleted?: string[] } | null) => {
      if (live && j) setHidden(new Set([...(j.disabled ?? []), ...(j.deleted ?? [])]));
    }).catch(() => { /* offline or not configured: every template stays available */ });
    return () => { live = false; };
  }, []);
  const active = useMemo(() => TEMPLATES.filter((t) => !hidden.has(t.id)), [hidden]);
  useEffect(() => {
    if (!hydrated || !hidden.has(templateId)) return;
    const next = active.find((t) => suits(t, d.eventType)) ?? active.find((t) => t.id !== CUSTOM_TEMPLATE_ID);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setTemplateId(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, hidden, templateId, active, d.eventType]);
  const pickEvent = (ev: EventType) => {
    const g = eventConfig(ev).group;
    set(msgEdited.current ? { eventType: ev } : { eventType: ev, message: "" }); chooseFilter(g === "events" ? "events" : g);
    if (!suits(tpl, ev)) { const next = active.find((t) => t.id !== CUSTOM_TEMPLATE_ID && t.defaultEvent === ev) ?? active.find((t) => suits(t, ev)); if (next) { setTemplateId(next.id); chooseFilter(g === "events" ? "events" : g); } }
  };
  /** Moves the card to another event: a preset template follows its event, an uploaded card keeps being used. */
  const switchEvent = (ev: EventType) => {
    if (templateId === CUSTOM_TEMPLATE_ID && d.customCard) { set(msgEdited.current ? { eventType: ev } : { eventType: ev, message: "" }); setFilter("all"); }
    else pickEvent(ev);
  };
  useEffect(() => { if (mode === "invitation" && eventConfig(d.eventType).group !== "festival") lastInviteEvent.current = d.eventType; }, [mode, d.eventType]);
  // Keep the event type in step with the mode (also covers opening /invitation-cards?mode=greeting with an old invitation draft).
  useEffect(() => {
    if (!hydrated || !mode) return;
    const isFest = eventConfig(d.eventType).group === "festival";
    if (mode === "greeting" && !isFest) switchEvent("festival");
    else if (mode === "invitation" && isFest) switchEvent(lastInviteEvent.current);
    else if (mode === "invitation" && filter === "festival") setFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, mode, d.eventType, filter]);
  const switchMode = (m: "invitation" | "greeting") => router.replace(`${pathname}?mode=${m}`, { scroll: false });
  const pickTemplate = (t: WeddingTemplate) => { setTemplateId(t.id); if (!suits(t, d.eventType)) set(msgEdited.current ? { eventType: t.defaultEvent } : { eventType: t.defaultEvent, message: "" }); };
  // Invitation mode lists every non-festival design; Greeting mode lists only the festival ones (no category pills).
  const inMode = (t: WeddingTemplate) => (mode === "greeting" ? t.category === "festival" : t.category !== "festival");
  const shown = active.filter((t) => t.id !== CUSTOM_TEMPLATE_ID && inMode(t) && (mode === "greeting" || filter === "all" || t.category === filter));

  // The preview shows the first real guest's greeting, or a sample one, so it can be styled and positioned before any guest exists.
  const firstGuest = guests.find((g) => g.name.trim());
  const previewGuest = useMemo(() => (firstGuest ? { name: firstGuest.name, place: firstGuest.place } : SAMPLE_GUEST), [firstGuest?.name, firstGuest?.place]); // eslint-disable-line react-hooks/exhaustive-deps
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v * 10) / 10));
  const moveBadge = (x: number, y: number) => set({ guestBadgeX: clamp(x), guestBadgeY: clamp(y) });
  const moveBlock = (key: Exclude<TextId, "guest">, x: number, y: number) => setD((cur) => ({ ...cur, blockPos: { ...cur.blockPos, [key]: { x: clamp(x), y: clamp(y) } } }));
  const styleText = (id: TextId, patch: { [K in keyof TextStyle]?: TextStyle[K] | null }) => setD((cur) => {
    const next: TextStyle = { ...(cur.textStyle?.[id] ?? {}) };
    for (const [k, v] of Object.entries(patch)) { if (v == null) delete (next as Record<string, unknown>)[k]; else (next as Record<string, unknown>)[k] = v; }
    const map = { ...(cur.textStyle ?? {}) };
    if (Object.keys(next).length) map[id] = next; else delete map[id];
    return { ...cur, textStyle: map };
  });
  const clampText = (v: number) => Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(v * 100) / 100));
  const scaleText = (key: TextId, v: number) => setD((cur) => {
    const bs = { ...cur.blockScale }, n = clampText(v);
    if (n === 1) delete bs[key]; else bs[key] = n; // 100 % is the default: no entry, so "Reset layout" only shows for real customisations
    return { ...cur, blockScale: bs };
  });
  const setMaster = (v: number) => set({ contentScale: clampText(v) });
  const fontForBlock = (key: TextId, f: FontStyle | "") => setD((cur) => { const bf = { ...cur.blockFont }; if (f) bf[key] = f; else delete bf[key]; return { ...cur, blockFont: bf }; });
  // One font for every block at once: also clears the per-block overrides so nothing keeps an older choice.
  const fontForAll = (f: FontStyle) => set({ fontStyle: f, blockFont: {} });
  const layoutCustom = d.guestBadgeX != null || Object.keys(d.blockPos ?? {}).length > 0 || Object.keys(d.blockScale ?? {}).length > 0 || Object.keys(d.blockFont ?? {}).length > 0 || Object.keys(d.textStyle ?? {}).length > 0 || (d.contentScale ?? 1) !== 1;
  const resetLayout = () => set({ guestBadgeX: null, guestBadgeY: null, blockPos: {}, blockScale: {}, blockFont: {}, textStyle: {}, contentScale: 1 });

  // The toolbar is only there while a section is selected: Escape, Done, or a click anywhere but on a text section / the toolbar / the bar above the card closes it.
  useEffect(() => {
    if (!selected) return;
    const down = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest("[data-card-zone], [data-section-toolbar], [data-preview-bar]")) setSelected(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [selected]);

  // Live preview of the chosen template with the couple's details.
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      const c = await renderWeddingCard({ template: tpl, details: rd, guest: previewGuest, photo: img, photo2: img2, width: zoom > 1 ? Math.round(1000 * zoom) : 560, onZones: (z) => { if (live) setZones(z); }, onGroups: (g) => { if (live) setGroups(g); } });
      if (live) setPreview(c.toDataURL("image/png"));
    }, 60);
    return () => { live = false; clearTimeout(t); };
  }, [hydrated, tpl, rd, d.photos, previewGuest, zoom]);

  // Gallery thumbnails: only the templates in the open filter, drawn with sample text for their own event type.
  const thumbKey = JSON.stringify([d.bride, d.groom, d.lang, d.eventType, d.photos[0]?.length, d.photos[1]?.length]);
  const thumbKeyRef = useRef("");
  useEffect(() => {
    if (!hydrated || (tab !== "Template" && !studioOpen)) return;
    let live = true;
    const fresh = thumbKeyRef.current !== thumbKey;
    if (fresh) { thumbKeyRef.current = thumbKey; setThumbs({}); }
    const t = setTimeout(async () => {
      const img = d.photos[0] ? await loadImage(d.photos[0]) : null;
      const img2 = d.photos[1] ? await loadImage(d.photos[1]) : null;
      for (const x of expanded ? shown : shown.slice(0, cols)) {
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
  }, [hydrated, tab, thumbKey, filter, expanded, cols, studioOpen]);

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

  const customRef = useRef<HTMLInputElement>(null);
  const festPhotoRef = useRef<HTMLInputElement>(null);
  const addCustomCard = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast("Please choose a PNG, JPG or WebP image."); return; }
    if (f.size > 15 * 1024 * 1024) { toast("That image is over 15 MB. Please use a smaller file."); return; }
    const u = await photoToDataUrl(f, 1600);
    if (!u) { toast("Couldn't read that image."); return; }
    set({ customCard: u }); setTemplateId(CUSTOM_TEMPLATE_ID); setSelected(null);
    toast("Card uploaded. Drag the guest name to the blank space on your design.");
  };
  const removeCustomCard = () => {
    set({ customCard: null });
    if (templateId === CUSTOM_TEMPLATE_ID) { const next = active.find((t) => t.id !== CUSTOM_TEMPLATE_ID); if (next) setTemplateId(next.id); }
  };
  const removePhoto = (i: number) => set({ photos: d.photos.filter((_, j) => j !== i) });
  const clearPhotos = () => set({ photos: [] });
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, 4 - d.photos.length)) { const u = await photoToDataUrl(f); if (u) out.push(u); }
    if (out.length) set({ photos: [...d.photos, ...out].slice(0, 4) });
  };

  const generate = async () => {
    setAiBusy(true); setAiError("");
    try {
      const res = await fetch("/api/ai/generate-wedding-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: d.eventType, lang: d.lang, bride: d.bride, groom: d.groom, brideParents: d.brideParents, groomParents: d.groomParents, date: d.date, venue: d.venue, note: d.message, template: tpl.name, themeHint: tpl.tagline }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setAiError(j.error ?? "The AI couldn't write the wording. You can type it yourself below."); return; }
      if (cfg.group === "festival") { set({ message: j.message || d.message }); msgEdited.current = true; toast("Greeting wish written. Edit it however you like."); }
      else { set({ blessing: j.blessing || d.blessing, message: j.message || d.message, verse: j.verse || d.verse }); msgEdited.current = false; toast("AI wording and verses added. Edit anything you like."); }
    } catch { setAiError("Couldn't reach the AI service. You can type the wording yourself."); }
    finally { setAiBusy(false); }
  };

  const [busyId, setBusyId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const safe = (n: string, fb: string) => n.trim().replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "") || fb;
  const loadPhotos = useCallback(async () => [d.photos[0] ? await loadImage(d.photos[0]) : null, d.photos[1] ? await loadImage(d.photos[1]) : null] as const, [d.photos]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const cardHash = useMemo(() => JSON.stringify([templateId, rd]), [templateId, rd]);

  /**
   * The personalised card as an in-memory JPEG (1080 px wide, quality 0.88: razor-sharp for WhatsApp at roughly 0.3 - 0.9 MB, where the
   * uncompressed PNG ran past 4 MB and was refused as "too large"). It is uploaded, never saved to this device. If an unusually busy
   * design is still big, the quality steps down so the request always fits under the host's 4.5 MB body limit.
   */
  const cardBlob = async (g: Guest, photos: readonly [HTMLImageElement | null, HTMLImageElement | null]): Promise<Blob> => {
    const base = await renderWeddingCard({ template: tpl, details: rd, guest: { name: g.name, place: g.place }, photo: photos[0], photo2: photos[1], width: 1080 });
    const encode = (q: number) => new Promise<Blob>((res, rej) => base.toBlob((bl) => (bl ? res(bl) : rej(new Error("render failed"))), "image/jpeg", q));
    let blob = await encode(0.88);
    for (const q of [0.78, 0.68]) { if (blob.size <= 3.8 * 1024 * 1024) break; blob = await encode(q); }
    return blob;
  };

  /** Makes sure this card exists as an online invitation page (the personalised link guests get); null when online storage isn't available. */
  const ensurePublished = async (): Promise<string | null> => {
    if (inviteId && !inviteId.startsWith("local-") && publishedHash === cardHash) return inviteId;
    const r = await publishInvitation(templateId, rd, null, effect);
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
      fd.append("meta", JSON.stringify({ invitationId: invId, name: g.name.trim(), place: g.place.trim(), phone: normalizePhone(g.phone), guestReplied: hasReplied(g.phone), message: whatsappMessage(rd, g, tpl.festival), eventTitle: isFestival ? d.customTitle.trim() || tpl.festival?.title.en || EVENT_TITLE[rd.eventType].en : isCustomMode ? d.customTitle.trim() || EVENT_TITLE[rd.eventType].en : EVENT_TITLE[rd.eventType].en, senderName: isFestival || isCustomMode ? d.groom.trim() : (cfg.couple ? [rd.groom, rd.bride] : [rd.groom]).filter(Boolean).join(" & "), inviteUrl: invId ? inviteUrl(origin, invId, g) : "" }));
      fd.append("card", blob, "card.jpg");
      const res = await fetch("/api/invitations/waau-dispatch", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { status?: "queued" | "sent" | "failed"; error?: string; code?: string; cooldownUntil?: number };
      if (j.code === "cooldown") { // the server's guard: leave the guest as-is (not failed) and start the countdown
        if (j.cooldownUntil) { const p = normalizePhone(g.phone); setServerTimes((cur) => ({ ...(cur ?? {}), [p]: [j.cooldownUntil! - COOLDOWN_WINDOW_MS, j.cooldownUntil! - COOLDOWN_WINDOW_MS + 1] })); }
        setLogTick((t) => t + 1); toast(`${g.name}: ${j.error ?? "This number is in cooldown."}`); return true;
      }
      if (j.status) { if (j.status !== "failed") noteSend(g.phone); setStatus(g.id, j.status); if (j.status === "failed") toast(`${g.name}: ${j.error ?? "Waau Panel couldn't send this invitation."}`); return true; }
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
    if (cooldownLeft(g.phone) > 0) { toast(`${g.name}: this number is in cooldown. You can send again in ${clock(cooldownLeft(g.phone))}.`); return; }
    setBusyId(g.id);
    try { await dispatchOne(g, await ensurePublished(), await loadPhotos()); } finally { setBusyId(null); setLogTick((t) => t + 1); }
  };

  const candidates = guests.filter((g) => (g.status === "pending" || g.status === "failed") && g.name.trim() && validPhone(g.phone));
  const sendable = candidates.filter((g) => cooldownLeft(g.phone) === 0);
  const cooling = candidates.filter((g) => cooldownLeft(g.phone) > 0);
  const shortestWait = cooling.length ? Math.min(...cooling.map((g) => cooldownLeft(g.phone))) : 0;
  const sendAll = async () => {
    if (busyId || batch) return;
    const list = candidates.filter((g) => cooldownLeft(g.phone) === 0); // re-checked at click time, the countdown may have just ended
    const skipped = candidates.length - list.length;
    if (list.length === 0) { setSendNote(skipped ? `All ${skipped} selected guest${skipped === 1 ? " is" : "s are"} in cooldown. The shortest wait is ${clock(shortestWait)}.` : ""); return; }
    setSendNote(skipped ? `Skipped ${skipped} guest${skipped === 1 ? "" : "s"} currently in cooldown timer.` : "");
    setBatch({ done: 0, total: list.length });
    try {
      const invId = await ensurePublished(), photos = await loadPhotos();
      for (let i = 0; i < list.length; i++) {
        setBatch({ done: i, total: list.length });
        setBusyId(list[i].id);
        if (!(await dispatchOne(list[i], invId, photos))) break;
      }
    } finally { setBusyId(null); setBatch(null); setLogTick((t) => t + 1); }
  };
  const counts = { queued: guests.filter((g) => g.status === "queued").length, sent: guests.filter((g) => g.status === "sent").length, failed: guests.filter((g) => g.status === "failed").length };

  const bar = (i: number) => (
    <button key={TABS[i]} type="button" role="tab" aria-selected={tab === TABS[i]} onClick={() => setTab(TABS[i])} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors", tab === TABS[i] ? "bg-[#0A0B0D] text-white dark:bg-[#D12014]" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10")}>
      <span className="mr-1.5 text-xs opacity-70">{i + 1}</span>{TABS[i]}
    </button>
  );

  if (!mode) return <ModeSelector pathname={pathname} />; // all hooks have run; the draft stays in state and storage while the selector is showing

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Card type" className="inline-flex rounded-full border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-[#131416]">
          {([["invitation", "Invitation Cards"], ["greeting", "Greeting Cards"]] as const).map(([m, label]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold transition-colors", mode === m ? "bg-[#D12014] text-white" : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10")}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={() => router.push(pathname, { scroll: false })} className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-[#D12014] dark:text-slate-300">← Back to start</button>
      </div>
      <p className="kicker mb-2">{mode === "greeting" ? "Greeting cards · ആശംസാ കാർഡുകൾ" : "Invitation cards · ക്ഷണക്കത്തുകൾ"}</p>
      <h1 className="text-3xl leading-tight font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">{mode === "greeting" ? "Design a festival greeting and send it to everyone on WhatsApp" : "Design an invitation card and send it to every guest on WhatsApp"}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{mode === "greeting" ? "Onam, Vishu, Christmas, New Year, Eid, Diwali and your own designs: choose a template, write your wish, add your name or logo, then send a personalised greeting to each contact on WhatsApp through Waau Panel." : "Weddings, birthdays, housewarming, inaugurations and more: choose a template, add your details, let AI write the wording, then send a personalised card to each guest on WhatsApp through Waau Panel."}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-4">
          <div role="tablist" aria-label="Steps" className={cn(panel, "flex flex-wrap gap-1 p-1.5 sm:flex-nowrap")}>{TABS.map((_, i) => bar(i))}</div>

          {tab === "Template" && (
            <section className={panel} aria-label="Templates">
              {/* Step 1 order: Pick a template, then the greeting format, then the card font. */}
              <div className="mb-4">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">Pick a template</h2>
              {mode !== "greeting" && <div className="relative mb-3 flex items-center gap-1.5">
                <button type="button" aria-label="Scroll categories left" onClick={() => scrollPills(-1)} disabled={pillEdge.start} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-[#131416] dark:text-slate-100 dark:hover:bg-white/10", pillEdge.start && pillEdge.end && "hidden")}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                <div className="relative min-w-0 flex-1">
                  <div ref={pillsRef} onScroll={syncPills} role="tablist" aria-label="Template categories" className="no-scrollbar flex items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-0.5 py-1">
                    {TEMPLATE_FILTERS.filter((f) => f.id !== "festival").map((f) => (
                      <button key={f.id} data-pill={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => chooseFilter(f.id)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors", filter === f.id ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10")}>{f.label}</button>
                    ))}
                  </div>
                  {/* Edge fades hint that more categories sit off-screen. */}
                  {!pillEdge.start && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent dark:from-[#131416]" />}
                  {!pillEdge.end && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent dark:from-[#131416]" />}
                </div>
                <button type="button" aria-label="Scroll categories right" onClick={() => scrollPills(1)} disabled={pillEdge.end} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-[#131416] dark:text-slate-100 dark:hover:bg-white/10", pillEdge.start && pillEdge.end && "hidden")}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>}
              <ul id="template-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <li>
                  {/* "Upload Custom Card" always leads the picker; once an image is uploaded it becomes the selectable "Your own card" entry. */}
                  <div className={cn("relative flex h-full flex-col rounded-lg border p-1.5", templateId === CUSTOM_TEMPLATE_ID && d.customCard ? "border-[#D12014] ring-2 ring-[#D12014]" : "border-dashed border-[#D12014]/60 bg-[#D12014]/[0.03]")}>
                    <button type="button" aria-pressed={templateId === CUSTOM_TEMPLATE_ID && !!d.customCard} aria-label={d.customCard ? "Use your uploaded card" : "Upload custom card"} onClick={() => (d.customCard ? (setTemplateId(CUSTOM_TEMPLATE_ID), setSelected(null)) : customRef.current?.click())} className="w-full text-left">
                      <div className="aspect-[1080/1500] w-full overflow-hidden rounded bg-slate-100 dark:bg-white/5">
                        {d.customCard
                          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.customCard} alt="Your uploaded card" draggable={false} className="h-full w-full object-cover" />
                          : <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center"><ImagePlus className="h-7 w-7 text-[#D12014]" aria-hidden="true" /><span className="text-xs font-extrabold text-[#D12014]">{mode === "greeting" ? "Upload Custom Greeting Card" : "Upload Custom Card"}</span><span className="text-[10px] text-slate-600 dark:text-slate-300">PNG, JPG or WebP · we add each guest&apos;s name</span></div>}
                      </div>
                      <p className="mt-1.5 text-xs leading-tight font-bold text-slate-900 dark:text-white">{d.customCard ? "Your own card" : mode === "greeting" ? "Upload Your Own Greeting" : "Upload Your Own Card"}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{d.customCard ? "Your design + a personalised greeting" : (mode === "greeting" ? "Use your own greeting design" : "Use your own invitation design")}</p>
                    </button>
                    {d.customCard && (
                      <div className="mt-1.5 flex gap-1.5">
                        <button type="button" onClick={() => customRef.current?.click()} className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10">Replace</button>
                        <button type="button" onClick={removeCustomCard} className="flex-1 rounded-md border border-red-300 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10">Remove</button>
                      </div>
                    )}
                    <input ref={customRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload your own invitation card" onChange={(e) => { void addCustomCard(e.target.files?.[0]); e.target.value = ""; }} />
                  </div>
                </li>
                {shown.map((x, i) => (
                  // Collapsed: only the first row shows at each width (2 / 3 / 5 cards, the upload card being the first); a selected template further down stays selected.
                  <li key={x.id} className={!expanded && i + 1 >= 2 ? (i + 1 >= 5 ? "hidden" : i + 1 >= 3 ? "hidden xl:block" : "hidden sm:block") : undefined}>
                    <button type="button" onClick={() => pickTemplate(x)} aria-pressed={templateId === x.id} className={cn("relative w-full rounded-lg border p-1.5 text-left transition-shadow hover:shadow-md", templateId === x.id ? "border-[#D12014] ring-2 ring-[#D12014]" : "border-slate-200 dark:border-slate-700")}>
                      {x.premium && <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-gradient-to-r from-[#B8860B] to-[#E3BE5C] px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-[#3B2A00] shadow">✨ PREMIUM</span>}
                      
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
              {shown.length + 1 > cols && (
                <div className="mt-4 flex justify-center">
                  <button type="button" aria-expanded={expanded} aria-controls="template-grid" onClick={() => setExpandedFor(expanded ? null : filter)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/5">
                    {expanded ? <>See less <ChevronUp className="h-4 w-4" aria-hidden="true" /></> : <>See more ({shown.length + 1 - cols}) <ChevronDown className="h-4 w-4" aria-hidden="true" /></>}
                  </button>
                </div>
              )}
              </div>
              <div className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Guest greeting (&ldquo;To&rdquo; format)</h3>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">How each guest&apos;s name appears on their card. Shown live on the preview: click it there to edit the wording, drag it into any open spot.</p>
                <div role="radiogroup" aria-label="Guest greeting format" className="grid gap-2 sm:grid-cols-2">
                  {GREETING_FORMATS.map((f) => (
                    <button key={f.id} type="button" role="radio" aria-checked={d.guestGreetingFormat === f.id} onClick={() => set({ guestGreetingFormat: f.id as GreetingFormat })} className={cn("rounded-lg border px-3 py-2 text-left text-xs transition-colors", d.guestGreetingFormat === f.id ? "border-[#D12014] bg-[#D12014]/5 ring-1 ring-[#D12014]" : "border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5")}>
                      <span className="block font-bold text-slate-900 dark:text-white">{f.label}</span>
                      <span className="block text-slate-600 dark:text-slate-300">{greetingText({ guestGreetingFormat: f.id, guestGreetingTemplate: d.guestGreetingTemplate || "With love to {Name}, {Place}", guestCustomPrefix: d.guestCustomPrefix }, SAMPLE_GUEST)}</span>
                    </button>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Greeting box style" className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Style</span>
                  {([[true, "With box"], [false, "Text only"]] as const).map(([v, label]) => (
                    <button key={label} type="button" role="radio" aria-checked={(d.guestGreetingBoxed !== false) === v} onClick={() => set({ guestGreetingBoxed: v })} className={cn("rounded-full border px-3 py-1 text-xs font-bold", (d.guestGreetingBoxed !== false) === v ? "border-[#D12014] bg-[#D12014] text-white" : "border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5")}>{label}</button>
                  ))}
                </div>
                {d.guestGreetingFormat === "custom" && <Field id="w-prefix" label="Custom greeting (use {Name} and {Place})" className="mt-2"><Input id="w-prefix" value={d.guestGreetingTemplate} maxLength={120} placeholder="e.g. With love to {Name}, {Place}" onChange={(e) => set({ guestGreetingTemplate: e.target.value })} /></Field>}
              </div>
              <div className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Card font</h3>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">13 curated English and Malayalam fonts for all the text on the card. Click any text on the card to give just that section its own font.</p>
                <div role="radiogroup" aria-label="Card font" className="grid gap-2 sm:grid-cols-2">
                  {(fontsOpen ? FONT_STYLES : FONT_STYLES.slice(0, FONTS_COLLAPSED)).map((f) => (
                    <button key={f.id} type="button" role="radio" aria-checked={(d.fontStyle ?? "default") === f.id} onClick={() => set({ fontStyle: f.id })} className={cn("rounded-lg border px-3 py-2 text-left transition-colors", (d.fontStyle ?? "default") === f.id ? "border-[#D12014] bg-[#D12014]/5 ring-1 ring-[#D12014]" : "border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5")}>
                      <span className="block truncate text-lg leading-snug text-slate-900 dark:text-white" style={f.id === "default" ? undefined : { fontFamily: FONT_STACKS[f.id as Exclude<FontStyle, "default">] }}>Arjun &amp; Anjali · അർജുൻ</span>
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{f.label}</span>
                      <span className="block text-[11px] text-slate-600 dark:text-slate-300">{f.hint}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex justify-center">
                  <button type="button" aria-expanded={fontsOpen} onClick={() => setFontsOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/5">
                    {fontsOpen ? <>View less <ChevronUp className="h-4 w-4" aria-hidden="true" /></> : <>View more ({FONT_STYLES.length - FONTS_COLLAPSED}) <ChevronDown className="h-4 w-4" aria-hidden="true" /></>}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setTab("Details")} className="mt-1 rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: event details</button>
            </section>
          )}

          {tab === "Details" && (
            <section className={cn(panel, "space-y-4")} aria-label="Event details">
              <div className="grid gap-3 sm:grid-cols-2">
                {mode !== "greeting" && <Field id="w-event" label="Event type"><Select id="w-event" value={d.eventType} onChange={(e) => pickEvent(e.target.value as EventType)}>{EVENTS.filter((x) => x.group !== "festival").map((x) => <option key={x.id} value={x.id}>{x.en} · {x.ml}</option>)}</Select></Field>}
                <Field id="w-lang" label="Language"><Select id="w-lang" value={d.lang} onChange={(e) => set({ lang: e.target.value as WLang })}><option value="en">English</option><option value="ml">Malayalam (മലയാളം)</option><option value="both">Bilingual (ML + EN)</option></Select></Field>
                <Field id="w-groom" label={isCustomMode ? "Host / Sender name" : cfg.labels.name1} className={isFestival ? "sm:col-span-2" : undefined} hint={isCustomMode ? "Sent to guests in the WhatsApp message (variable {{3}}). Printed on the card only if you turn on “Print event details” above." : undefined}><Input id="w-groom" value={d.groom} onChange={(e) => set({ groom: e.target.value })} placeholder={cfg.sample.groom} /></Field>
                {!isCustomMode && cfg.useName2 && <Field id="w-bride" label={cfg.labels.name2}><Input id="w-bride" value={d.bride} onChange={(e) => set({ bride: e.target.value })} placeholder={cfg.sample.bride || undefined} /></Field>}
                {!isCustomMode && !isFestival && <Field id="w-gp" label={cfg.labels.host1}><Input id="w-gp" value={d.groomParents} onChange={(e) => set({ groomParents: e.target.value })} placeholder={cfg.sample.groomParents} /></Field>}
                {!isCustomMode && cfg.useHost2 && <Field id="w-bp" label={cfg.labels.host2}><Input id="w-bp" value={d.brideParents} onChange={(e) => set({ brideParents: e.target.value })} placeholder="Mr. & Mrs. …" /></Field>}
                {isCustomMode && (
                  <div className="space-y-3 rounded-lg border border-[#D12014]/30 bg-[#D12014]/5 p-3 sm:col-span-2">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.customCard ?? ""} alt="" className="h-20 w-14 rounded border border-slate-300 object-cover dark:border-slate-600" />
                      <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 dark:text-white">Your own card</p><p className="text-xs text-slate-700 dark:text-slate-200">Your design is the whole card. Each guest gets their name added; drag it in the live preview to the blank space.</p></div>
                      <button type="button" onClick={() => customRef.current?.click()} className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10">Replace</button>
                    </div>
                    <label className="flex items-start gap-2 text-sm font-semibold text-slate-900 dark:text-white"><input type="checkbox" checked={d.showGuestName !== false} onChange={(e) => set({ showGuestName: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#D12014]" /><span>Show Guest Name on Card<span className="block text-xs font-normal text-slate-700 dark:text-slate-200">Prints the greeting (&ldquo;Dear {"{Name}"}&rdquo;) on each guest&apos;s card. Change its wording in Step 1.</span></span></label>
                    <label className="flex items-start gap-2 text-sm font-semibold text-slate-900 dark:text-white"><input type="checkbox" checked={!!d.printCustomDetails} onChange={(e) => set({ printCustomDetails: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#D12014]" /><span>Also print event details on the card<span className="block text-xs font-normal text-slate-700 dark:text-slate-200">Off by default: your design already has them. Turn on to add the title, host, date and venue below as text.</span></span></label>
                  </div>
                )}
                {isFestival && (
                  <>
                    <Field id="w-gtitle" label="Greeting title" hint="Printed large on the card and used as the WhatsApp message headline." className="sm:col-span-2"><Input id="w-gtitle" value={d.customTitle} onChange={(e) => set({ customTitle: e.target.value })} placeholder={tpl.festival?.title.en ?? "Happy Onam"} /></Field>
                    <Field id="w-wish" label="Wish message" hint={d.message ? undefined : "Showing this festival's own wish until you write yours."} className="sm:col-span-2">
                      <Textarea id="w-wish" rows={3} value={d.message} onChange={(e) => set({ message: e.target.value })} placeholder={tpl.festival?.wish.en ?? ""} />
                      <button type="button" onClick={() => void generate()} disabled={aiBusy} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400] disabled:opacity-60">{aiBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} {aiBusy ? "Writing…" : "AI: Write Greeting Wish"}</button>
                      {aiError && <p role="alert" className="mt-2 text-xs font-semibold text-red-800 dark:text-red-200">{aiError}</p>}
                    </Field>
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3 sm:col-span-2 dark:border-slate-700">
                      <label className="flex items-start gap-2 text-sm font-semibold text-slate-900 dark:text-white"><input type="checkbox" checked={d.festivalPhoto} onChange={(e) => set({ festivalPhoto: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#D12014]" /><span>Add my photo / brand logo<span className="block text-xs font-normal text-slate-700 dark:text-slate-200">Families and businesses can place a photo or logo above the sender name.</span></span></label>
                      {d.festivalPhoto && (
                        <div className="flex items-center gap-3">
                          {d.photos[0] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.photos[0]} alt="Sender photo or logo" className="h-16 w-16 rounded-full border border-slate-300 object-cover dark:border-slate-600" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-400 text-[10px] font-bold text-slate-600 dark:text-slate-300">No image</span>}
                          <button type="button" onClick={() => festPhotoRef.current?.click()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10"><ImagePlus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{d.photos[0] ? "Replace" : "Upload"} photo / logo</button>
                          {d.photos[0] && <button type="button" onClick={() => removePhoto(0)} className="text-xs font-semibold text-red-700 underline dark:text-red-300">Remove</button>}
                          <input ref={festPhotoRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload sender photo or logo" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const u = await photoToDataUrl(f); if (u) setD((cur) => ({ ...cur, photos: [u, ...cur.photos.slice(1)] })); }} />
                        </div>
                      )}
                    </div>
                  </>
                )}
                {isCustomMode && <Field id="w-ctitle" label={mode === "greeting" ? "Greeting title" : "Event title"} hint="Used in the WhatsApp message (variable {{2}})." className="sm:col-span-2"><Input id="w-ctitle" value={d.customTitle} onChange={(e) => set({ customTitle: e.target.value })} placeholder={mode === "greeting" ? "Happy Onam" : EVENT_TITLE[d.eventType].en} /></Field>}
                {!isFestival && <Field id="w-date" label="Date" hint={d.date || isCustomMode ? undefined : "Sample date shown on the card. Pick your own date to replace it."}><Input id="w-date" type="date" value={d.date || (isCustomMode ? "" : cfg.sample.date || "")} className={d.date ? undefined : "text-slate-500"} onChange={(e) => set({ date: e.target.value })} /></Field>}
                {!isFestival && <Field id="w-time" label={cfg.labels.time}><Input id="w-time" value={d.time} onChange={(e) => set({ time: e.target.value })} placeholder={cfg.sample.time} /></Field>}
                {!isFestival && <Field id="w-venue" label={cfg.labels.venue} className="sm:col-span-2"><Input id="w-venue" value={d.venue} onChange={(e) => set({ venue: e.target.value })} placeholder={cfg.sample.venue} /></Field>}
                {!isFestival && <Field id="w-maps" label="Google Maps link" hint="Optional. Guests get an “Open in Google Maps” button. Without a link, the venue name is searched." className="sm:col-span-2"><Input id="w-maps" type="url" value={d.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /></Field>}
                {!isFestival && <Field id="w-msg" label="Invitation message / note" className="sm:col-span-2"><Textarea id="w-msg" rows={3} value={d.message} onChange={(e) => set({ message: e.target.value })} /></Field>}
              </div>
              {!isFestival && (!isCustomMode || d.printCustomDetails) && <div className="rounded-lg border border-[#D12014]/30 bg-[#D12014]/5 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void generate()} disabled={aiBusy} className="inline-flex items-center gap-1.5 rounded-full bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400] disabled:opacity-60">{aiBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />} {aiBusy ? "Writing…" : "AI: write wording & verses"}</button>
                  <span className="text-xs text-slate-700 dark:text-slate-200">Poetic Malayalam / English wording and blessing verses generated from your details.</span>
                </div>
                {aiError && <p role="alert" className="mt-2 text-xs font-semibold text-red-800 dark:text-red-200">{aiError}</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field id="w-bless" label="Blessing line"><Input id="w-bless" value={d.blessing} onChange={(e) => set({ blessing: e.target.value })} placeholder={tpl.blessing[d.lang === "ml" ? 1 : 0]} /></Field>
                  <Field id="w-verse" label="Closing verse"><Input id="w-verse" value={d.verse} onChange={(e) => set({ verse: e.target.value })} /></Field>
                </div>
              </div>}
              <button type="button" onClick={() => setTab("Media")} className="rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: photos</button>
            </section>
          )}

          {tab === "Media" && (
            <section className={cn(panel, "space-y-5")} aria-label="Couple photos">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Couple photos</h2>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Upload 1 combined couple photo or 2 individual portraits (both appear side-by-side on the card; up to 4 appear on the guest invite page).</p>
                <div className="flex flex-wrap gap-3">
                  {d.photos.map((p, i) => (
                    <div key={i} className="w-24">
                      <div className="relative h-28 w-24 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt={`Couple photo ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                      <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`} className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-red-300 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"><X className="h-3 w-3" aria-hidden="true" /> Remove photo</button>
                    </div>
                  ))}
                  {d.photos.length < 4 && <button type="button" onClick={() => photoRef.current?.click()} className="flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-400 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"><ImagePlus className="h-5 w-5" aria-hidden="true" /> Add photo</button>}
                  <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
                </div>
                {d.photos.length > 0 && <button type="button" onClick={clearPhotos} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear all photos</button>}
              </div>
              <button type="button" onClick={() => setTab("Guests & share")} className="rounded-lg bg-[#D12014] px-4 py-2 text-sm font-bold text-white hover:bg-[#A91400]">Next: guests &amp; share</button>
            </section>
          )}

          {tab === "Guests & share" && (
            <section className={cn(panel, "space-y-5")} aria-label="Guests and Waau Panel dispatch">
              <div>
                <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">1. Add your guests</h2>
                <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">Add each recipient&apos;s name, place and WhatsApp number (one by one, or paste many from Excel / Sheets). Every guest gets their own card with “Dear Name, Place” on it, prepared automatically. Cards are never downloaded to your device.</p>
                <GuestTable guests={guests} busyId={busyId} onChange={setGuests} onSend={(g) => void sendOne(g)} onPreview={setGuestPreview} cooldownLeft={cooldownLeft} onReplied={markReplied} />
              </div>
              <div className="rounded-lg border border-[#25D366]/50 bg-[#25D366]/10 p-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Dispatch via Waau Panel</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void sendAll()} disabled={candidates.length === 0 || !!batch || busyId !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-extrabold text-[#06371a] hover:brightness-95 disabled:opacity-40">{batch ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />} Send All via Waau Panel ({sendable.length} {sendable.length === 1 ? "guest" : "guests"})</button>
                  {batch && <span role="status" className="text-xs font-semibold text-slate-900 dark:text-white">Preparing and sending {Math.min(batch.done + 1, batch.total)} of {batch.total}…</span>}
                </div>
                {(sendNote || (cooling.length > 0 && sendable.length === 0 && candidates.length > 0)) && (
                  <p role="status" className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    <span>{sendNote || `All ${cooling.length} unsent guest${cooling.length === 1 ? " is" : "s are"} in cooldown. The shortest wait is ${clock(shortestWait)}.`}</span>
                    {cooling.length > 0 && <CooldownPill leftMs={shortestWait} />}
                  </p>
                )}
                {(counts.queued > 0 || counts.sent > 0 || counts.failed > 0) && (
                  <p role="status" className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">{counts.sent > 0 && <span className="mr-3">Sent via Waau Panel: {counts.sent}</span>}{counts.queued > 0 && <span className="mr-3">Queued in Waau Panel: {counts.queued}</span>}{counts.failed > 0 && <span className="text-red-700 dark:text-red-300">Failed: {counts.failed} (use Send to retry)</span>}</p>
                )}
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">Each personalised card is generated, stored securely and handed to Waau Panel for WhatsApp delivery. Until Waau Panel is connected, invitations wait as “Queued in Waau Panel”. Guests without a valid WhatsApp number are skipped. You need to be signed in to send.</p>
              </div>
              <DispatchLog refreshKey={logTick} cooldownLeft={cooldownLeft} onReplied={markReplied} hasReplied={hasReplied} />
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Live card preview">
          <div className={cn(panel, "space-y-3")}>
            <div data-preview-bar className="flex items-center justify-between gap-2">
              <h2 className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-white">Live preview · {tpl.name}</h2>
              <div className="flex shrink-0 items-center gap-2">
                <button ref={enlargeRef} type="button" onClick={() => { setSelected(null); scrollBeforeStudio.current = window.scrollY; setStudioOpen(true); }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/10" title="Open the fullscreen studio"><Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Enlarge</button>
                <button type="button" onClick={resetLayout} disabled={!layoutCustom} className="text-[11px] font-semibold text-slate-600 underline underline-offset-2 hover:text-[#D12014] disabled:cursor-default disabled:opacity-40 disabled:no-underline disabled:hover:text-slate-600 dark:text-slate-300">Reset layout</button>
                <div className="flex items-center gap-0.5 rounded-lg border border-slate-300 p-0.5 dark:border-slate-600" role="group" aria-label="Preview zoom">
                  <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.1) * 10) / 10))} disabled={zoom <= 1} className="h-7 w-7 rounded-md text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-100 dark:hover:bg-white/10"><span aria-hidden="true">−</span></button>
                  <button type="button" onClick={() => setZoom(1)} title="Reset zoom" className="h-7 min-w-11 rounded-md px-1 text-[11px] font-bold tabular-nums text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10">{Math.round(zoom * 100)}%</button>
                  <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))} disabled={zoom >= 1.5} className="h-7 w-7 rounded-md text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-100 dark:hover:bg-white/10"><span aria-hidden="true">+</span></button>
                </div>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[420px]">
              <div className={cn("rounded-lg", zoom > 1 && "max-h-[80vh] overflow-auto overscroll-contain")} aria-label={zoom > 1 ? "Zoomed preview (scroll to pan)" : undefined}>
              <div style={{ width: `${zoom * 100}%` }}>
              <div onContextMenu={(e) => e.preventDefault()} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 select-none dark:border-slate-700 dark:bg-white/5" style={{ aspectRatio: "1080 / 1500" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview ? <img src={preview} alt="Invitation card preview" draggable={false} className="pointer-events-none h-full w-full object-cover select-none" /> : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}
                {preview && <CardEditOverlay zones={zones} groups={groups} details={d} selected={selected} onSelect={setSelected} onPickPhoto={(i) => { cardPhotoIdx.current = i; cardPhotoRef.current?.click(); }} onRemovePhoto={removePhoto} onMoveBadge={moveBadge} onMoveBlock={moveBlock} onScaleText={scaleText} onEditText={editTextField} />}
              </div>
              </div>
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
            {selected ? (
              <div className="mx-auto w-full max-w-[420px]">
                <SectionToolbar onStyle={styleText} zone={selected} zones={zones} groups={groups} details={d} cfg={cfg} onChange={set} onMoveBadge={moveBadge} onMoveBlock={moveBlock} onScale={scaleText} onMaster={setMaster} onFont={fontForBlock} onAllFont={fontForAll} onDone={() => setSelected(null)} />
              </div>
            ) : (
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">Click any text on the card to edit it · drag to move</p>
            )}
            {mapsLink(d) && <a href={mapsLink(d)} target="_blank" rel="noopener noreferrer" className="mx-auto flex max-w-[420px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-white/5"><MapPin className="h-4 w-4" aria-hidden="true" /> Open venue in Google Maps</a>}
          </div>
        </aside>
      </div>

      {studioOpen && (
        <StudioFullscreen
          d={d} rd={rd} tpl={tpl} cfg={cfg} previewGuest={previewGuest} setD={setD} set={set}
          templates={active.filter((t) => t.id !== CUSTOM_TEMPLATE_ID && inMode(t))} thumbs={thumbs} onPickTemplate={pickTemplate}
          moveBadge={moveBadge} moveBlock={moveBlock} scaleText={scaleText} setMaster={setMaster} fontForBlock={fontForBlock} fontForAll={fontForAll} styleText={styleText}
          layoutCustom={layoutCustom} resetLayout={resetLayout} onClose={closeStudio}
        />
      )}

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

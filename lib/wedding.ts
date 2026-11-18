/** Wedding & Event Invitations: shared types, the 10 template themes, copy helpers and local persistence. */

export type EventType = "wedding" | "engagement" | "reception" | "nikah" | "save-the-date";
export type WLang = "en" | "ml" | "both";
export type Layout = "classic" | "polaroid" | "minimal";
export type PhotoShape = "arch" | "circle" | "oval" | "rect";
export type Motif = "kasavu" | "temple" | "church" | "nikah" | "botanical" | "banarasi" | "polaroid" | "velvet" | "marigold" | "minimal";

export interface WeddingDetails {
  eventType: EventType;
  lang: WLang;
  bride: string;
  groom: string;
  brideParents: string;
  groomParents: string;
  /** yyyy-mm-dd */
  date: string;
  /** Free text: "10:30 AM · Muhurtham 10:45 AM" */
  time: string;
  venue: string;
  mapsUrl: string;
  /** Family note / invitation wording. */
  message: string;
  blessing: string;
  verse: string;
  /** AI-suggested accent colour (#rrggbb); overrides the template accent. */
  accent: string;
  /** Couple photos as downscaled JPEG data URLs (the first sits in the template's photo frame). */
  photos: string[];
}

export interface Palette { bg1: string; bg2: string; ink: string; sub: string; accent: string; accent2: string }

export interface WeddingTemplate {
  id: string;
  name: string;
  ml: string;
  tagline: string;
  layout: Layout;
  motif: Motif;
  shape: PhotoShape;
  pal: Palette;
  /** Default blessing line, English / Malayalam. */
  blessing: [string, string];
}

export const TEMPLATES: WeddingTemplate[] = [
  { id: "kasavu", name: "Royal Kerala Kasavu & Gold", ml: "കസവ് & സ്വർണ്ണം", tagline: "Traditional Malayalam / English", layout: "classic", motif: "kasavu", shape: "arch", pal: { bg1: "#FFFBF0", bg2: "#F8EDD2", ink: "#3B0A12", sub: "#6B4A2B", accent: "#B8860B", accent2: "#8C1C2B" }, blessing: ["With the blessings of the Almighty", "ദൈവാനുഗ്രഹത്താൽ"] },
  { id: "temple", name: "Guruvayoor Temple Floral", ml: "ഗുരുവായൂർ പുഷ്പാലങ്കാരം", tagline: "Sacred Hindu temple theme", layout: "classic", motif: "temple", shape: "oval", pal: { bg1: "#FFF6E3", bg2: "#FDE4B8", ink: "#4A1507", sub: "#7A3E1B", accent: "#D9480F", accent2: "#B8860B" }, blessing: ["Sri Ganapathaye Namah", "ശ്രീ ഗണപതയേ നമഃ"] },
  { id: "church", name: "Christian Church Elegance", ml: "ക്രൈസ്തവ വിവാഹം", tagline: "Minimal ivory & gold cross", layout: "classic", motif: "church", shape: "circle", pal: { bg1: "#FFFEFA", bg2: "#F6F1E4", ink: "#2B2A33", sub: "#6B6657", accent: "#B08D3C", accent2: "#8A7A52" }, blessing: ["What God has joined together, let no one separate", "ദൈവം യോജിപ്പിച്ചതിനെ മനുഷ്യൻ വേർപെടുത്തരുത്"] },
  { id: "nikah", name: "Nikah Emerald & Gold", ml: "നിക്കാഹ് മരതകം", tagline: "Islamic geometric & crescent", layout: "classic", motif: "nikah", shape: "arch", pal: { bg1: "#0B5D4B", bg2: "#06382E", ink: "#FFF6DA", sub: "#CFE8DC", accent: "#E8C766", accent2: "#F5E3A1" }, blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"] },
  { id: "botanical", name: "Modern Pastel Botanical", ml: "പാസ്റ്റൽ ബൊട്ടാണിക്കൽ", tagline: "Eucalyptus & blush watercolor", layout: "classic", motif: "botanical", shape: "circle", pal: { bg1: "#FFF7F5", bg2: "#FBE6E2", ink: "#34423B", sub: "#6A7B72", accent: "#6F9A84", accent2: "#E8A5A5" }, blessing: ["Two hearts, one beautiful journey", "രണ്ട് മനസ്സുകൾ, ഒരു സുന്ദര യാത്ര"] },
  { id: "banarasi", name: "Banarasi Crimson Heritage", ml: "ബനാറസി ക്രിംസൺ", tagline: "Rich maroon & zari border", layout: "classic", motif: "banarasi", shape: "oval", pal: { bg1: "#7A0F1F", bg2: "#4D0612", ink: "#FFF2D0", sub: "#F1D9A8", accent: "#E9BE55", accent2: "#F7DC8D" }, blessing: ["With the blessings of elders", "മുതിർന്നവരുടെ അനുഗ്രഹത്തോടെ"] },
  { id: "polaroid", name: "Save The Date Polaroid", ml: "സേവ് ദ ഡേറ്റ്", tagline: "Photo-centric modern card", layout: "polaroid", motif: "polaroid", shape: "rect", pal: { bg1: "#FDF1E7", bg2: "#F7DCCB", ink: "#2F2A28", sub: "#6F625B", accent: "#D46A5A", accent2: "#E9B872" }, blessing: ["Save the date", "തീയതി കുറിച്ചുവയ്ക്കൂ"] },
  { id: "velvet", name: "Reception Midnight Velvet", ml: "മിഡ്നൈറ്റ് വെൽവെറ്റ്", tagline: "Dark navy & gold foil", layout: "classic", motif: "velvet", shape: "arch", pal: { bg1: "#101B3D", bg2: "#070D22", ink: "#F7EBC6", sub: "#B8BFD6", accent: "#D9B04C", accent2: "#F3D98B" }, blessing: ["Join us for an evening of celebration", "ആഘോഷസന്ധ്യയിലേക്ക് സ്വാഗതം"] },
  { id: "marigold", name: "Haldi & Mehendi Marigold", ml: "ഹൽദി & മെഹന്തി", tagline: "Vibrant yellow & orange festive", layout: "classic", motif: "marigold", shape: "circle", pal: { bg1: "#FFF1A8", bg2: "#FFC94D", ink: "#4A2300", sub: "#7A4A12", accent: "#E8590C", accent2: "#2F9E44" }, blessing: ["Come, celebrate with colours and joy", "നിറങ്ങളുടെ ആഘോഷത്തിലേക്ക് വരൂ"] },
  { id: "minimal", name: "Minimalist Typography Card", ml: "മിനിമൽ ടൈപ്പോഗ്രാഫി", tagline: "Clean editorial layout", layout: "minimal", motif: "minimal", shape: "rect", pal: { bg1: "#FFFFFF", bg2: "#F4F4F5", ink: "#111113", sub: "#5B5B63", accent: "#111113", accent2: "#8A8A93" }, blessing: ["Together with their families", "കുടുംബാംഗങ്ങളോടൊപ്പം"] },
];
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const EVENT_TYPES: { id: EventType; en: string; ml: string }[] = [
  { id: "wedding", en: "Wedding", ml: "വിവാഹം" },
  { id: "engagement", en: "Engagement", ml: "വിവാഹ നിശ്ചയം" },
  { id: "reception", en: "Reception", ml: "വിവാഹ സൽക്കാരം" },
  { id: "nikah", en: "Nikah", ml: "നിക്കാഹ്" },
  { id: "save-the-date", en: "Save the Date", ml: "സേവ് ദ ഡേറ്റ്" },
];
export const EVENT_TITLE: Record<EventType, { en: string; ml: string }> = {
  wedding: { en: "Wedding Invitation", ml: "വിവാഹ ക്ഷണക്കത്ത്" },
  engagement: { en: "Engagement Ceremony", ml: "വിവാഹ നിശ്ചയം" },
  reception: { en: "Wedding Reception", ml: "വിവാഹ സൽക്കാരം" },
  nikah: { en: "Nikah Ceremony", ml: "നിക്കാഹ്" },
  "save-the-date": { en: "Save the Date", ml: "തീയതി കുറിച്ചുവയ്ക്കൂ" },
};

export const EMPTY_DETAILS: WeddingDetails = { eventType: "wedding", lang: "both", bride: "", groom: "", brideParents: "", groomParents: "", date: "", time: "", venue: "", mapsUrl: "", message: "", blessing: "", verse: "", accent: "", photos: [] };

/** Used for the template gallery thumbnails and as placeholders before anything is typed. */
export const SAMPLE_DETAILS: WeddingDetails = {
  ...EMPTY_DETAILS,
  bride: "Anjali", groom: "Arjun", brideParents: "Mr. & Mrs. Menon", groomParents: "Mr. & Mrs. Nair",
  date: "2027-02-14", time: "10:30 AM", venue: "Grand Convention Centre, Kochi",
  message: "together with our families, we joyfully invite you to share in our happiness.",
};

export interface Guest { id: string; name: string; place: string; phone: string; status: "pending" | "sent" }

export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function formatDate(date: string, lang: WLang): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const f = (loc: string) => d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return lang === "ml" ? f("ml-IN") : f("en-IN");
}

/** Digits only, with Kerala's +91 added to bare 10-digit numbers. */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d;
}
export const validPhone = (raw: string) => { const d = normalizePhone(raw); return d.length >= 11 && d.length <= 15; };

/** Parses pasted guest rows: "Name, Place, Phone" / tab separated / "Name - Phone", one per line. */
export function parseGuests(text: string): Guest[] {
  const out: Guest[] = [];
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw) continue;
    const cells = raw.split(/\t|,|;|\|/).map((c) => c.trim()).filter(Boolean);
    const phoneIdx = cells.findIndex((c) => /^\+?[\d\s()-]{8,}$/.test(c));
    let phone = "", name = "", place = "";
    if (phoneIdx >= 0) { phone = cells[phoneIdx]; const rest = cells.filter((_, i) => i !== phoneIdx); name = rest[0] ?? ""; place = rest[1] ?? ""; }
    else { const m = raw.match(/^(.*?)[\s-]+(\+?\d[\d\s-]{7,})$/); if (m) { name = m[1].trim(); phone = m[2]; } else { name = cells[0] ?? ""; place = cells[1] ?? ""; } }
    if (name || phone) out.push({ id: newId(), name, place, phone, status: "pending" });
  }
  return out;
}

export const inviteUrl = (origin: string, id: string, g?: { name?: string; place?: string }) => {
  const q = new URLSearchParams();
  if (g?.name) q.set("guest", g.name);
  if (g?.place) q.set("addr", g.place);
  const s = q.toString();
  return `${origin}/wedding-cards/invite/${id}${s ? `?${s}` : ""}`;
};

/** The WhatsApp text for one guest (language follows the card). */
export function whatsappMessage(d: WeddingDetails, g: { name: string; place: string }, link: string): string {
  const title = EVENT_TITLE[d.eventType];
  const names = [d.groom, d.bride].filter(Boolean).join(" & ");
  const date = formatDate(d.date, d.lang);
  const who = g.name || "Friend";
  const en = `Dear ${who}${g.place ? ` (${g.place})` : ""},\n\n${names ? `${names} ` : ""}warmly invite${names ? "" : "s"} you to their ${title.en}.${date ? `\n📅 ${date}${d.time ? `, ${d.time}` : ""}` : ""}${d.venue ? `\n📍 ${d.venue}` : ""}\n\nYour personal invitation:\n${link}`;
  const ml = `പ്രിയപ്പെട്ട ${who}${g.place ? ` (${g.place})` : ""},\n\n${names ? `${names} ` : ""}ഞങ്ങളുടെ ${title.ml}ലേക്ക് നിങ്ങളെ സ്നേഹപൂർവം ക്ഷണിക്കുന്നു.${date ? `\n📅 ${formatDate(d.date, "ml")}${d.time ? `, ${d.time}` : ""}` : ""}${d.venue ? `\n📍 ${d.venue}` : ""}\n\nനിങ്ങളുടെ ക്ഷണക്കത്ത്:\n${link}`;
  return d.lang === "ml" ? ml : d.lang === "both" ? `${ml}\n\n———\n\n${en}` : en;
}

export const whatsappLink = (phone: string, text: string) => `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
export const mapsLink = (d: Pick<WeddingDetails, "mapsUrl" | "venue">) => {
  const u = d.mapsUrl.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return d.venue.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.venue)}` : "";
};

// ── persistence (this browser) ──
const KEY = "intelliad.wedding.v1";
export interface StudioSave { template: string; details: WeddingDetails; guests: Guest[]; inviteId: string | null; publishedHash: string | null }
export function loadStudio(): StudioSave | null {
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as StudioSave) : null; } catch { return null; }
}
export function saveStudio(s: StudioSave) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { try { localStorage.setItem(KEY, JSON.stringify({ ...s, details: { ...s.details, photos: [] } })); } catch { /* storage full */ } }
}
export const localInviteKey = (id: string) => `intelliad.wedding.invite.${id}`;

/** What a guest's invite page needs (no guest list). */
export interface InvitePayload { template_id: string; data: { details: WeddingDetails; videoUrl: string | null } }

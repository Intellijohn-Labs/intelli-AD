/** Marana Vartha (obituary) and Death Anniversary (In Memoriam) templates: fields, presets and text composer. */

export type ObituaryKind = "demise" | "anniversary";
export type Gender = "m" | "f";
export type FrameAccent = "none" | "garland" | "lamp" | "candle";
export type FrameStyle = "traditional" | "christian" | "minimal";
export type HeadingStyle = "classic" | "bold" | "elegant" | "script";

export const FRAME_STYLES: { id: FrameStyle; ml: string; en: string }[] = [
  { id: "traditional", ml: "പരമ്പരാഗതം", en: "Traditional floral" },
  { id: "christian", ml: "ക്രിസ്ത്യൻ", en: "Christian cross" },
  { id: "minimal", ml: "ലളിതം", en: "Minimal rule" },
];

export const HEADING_STYLES: { id: HeadingStyle; label: string; family: string; weight: number; spacing?: string }[] = [
  { id: "classic", label: "ക്ലാസിക്", family: '"Noto Serif Malayalam", serif', weight: 800 },
  { id: "bold", label: "ബോൾഡ്", family: '"Anek Malayalam", "Noto Sans Malayalam", sans-serif', weight: 800 },
  { id: "elegant", label: "എലഗന്റ്", family: '"Noto Serif Malayalam", serif', weight: 600, spacing: "0.04em" },
  { id: "script", label: "ലിപി", family: '"Chilanka", "Manjari", cursive', weight: 400 },
];

export const FRAME_ACCENTS: { id: FrameAccent; ml: string; en: string }[] = [
  { id: "garland", ml: "പൂമാല", en: "Garland frame" },
  { id: "lamp", ml: "നിലവിളക്ക്", en: "Traditional lamp" },
  { id: "candle", ml: "മെഴുകുതിരി", en: "Memorial candle" },
  { id: "none", ml: "പ്ലെയിൻ ഫ്രെയിം", en: "Classic minimal" },
];

export interface ObituaryFields {
  kind: ObituaryKind;
  prefixId: string;
  gender: Gender;
  name: string;
  age: string;
  house: string;
  place: string;
  demiseDate: string; // YYYY-MM-DD
  demiseTime: string; // HH:mm
  funeralDate: string;
  funeralTime: string;
  funeralPlace: string;
  /** Demise: bereaved family (spouse, children, in-laws). Anniversary: "remembered by" names. */
  family: string;
  /** Demise notice: contact number(s) for the family. */
  contact: string;
  milestone: string;
  /** Anniversary: date of remembrance. */
  remembranceDate: string;
  tribute: string;
  photoFrame: "round" | "rect";
  /** Ornament around the portrait: none (plain frame), garland, nilavilakku lamp, or memorial candle. */
  frameAccent: FrameAccent;
  /** Border around the whole notice: floral (traditional), cross (christian) or a thin rule (minimal). */
  frameStyle: FrameStyle;
  /** Malayalam typeface used for the heading. */
  headingStyle: HeadingStyle;
  /** Prayer / tribute line printed under the details. */
  prayer: string;
  /** Portrait crop: zoom (1–3) and focus point (0–100 %). */
  photoCrop: { zoom: number; x: number; y: number };
  /** Portrait frame size relative to the standard 4×5 cm (0.5–1.5). Missing = 1. */
  photoScale?: number;
}

export interface Prefix {
  id: string;
  text: string;
  group: "neutral" | "religious";
  note?: string;
  /** The prefix is itself the "passed away" verb (നിര്യാതനായി / നിര്യാതയായി). */
  isVerb?: boolean;
}

export const PREFIXES: Prefix[] = [
  { id: "nirayathan", text: "നിര്യാതനായി", group: "neutral", isVerb: true },
  { id: "nirayatha", text: "നിര്യാതയായി", group: "neutral", isVerb: true },
  { id: "smaranjali", text: "സ്മരണാഞ്ജലി", group: "neutral" },
  { id: "adaranjali", text: "ആദരാഞ്ജലികൾ", group: "neutral" },
  { id: "om-shanti", text: "ഓം ശാന്തി", group: "religious", note: "Hindu" },
  { id: "christian", text: "✝ കർത്താവിൽ നിദ്രപ്രാപിച്ചു", group: "religious", note: "Christian" },
  { id: "muslim", text: "ഇന്നാ ലില്ലാഹി വ ഇന്നാ ഇലൈഹി റാജിഊൻ", group: "religious", note: "Muslim" },
];

export const MILESTONES = [
  { id: "1", label: "ഒന്നാം ചരമവാർഷികം" },
  { id: "2", label: "രണ്ടാം ചരമവാർഷികം" },
  { id: "3", label: "മൂന്നാം ചരമവാർഷികം" },
  { id: "5", label: "അഞ്ചാം ചരമവാർഷികം" },
  { id: "10", label: "പത്താം ചരമവാർഷികം" },
  { id: "general", label: "വാർഷിക സ്മരണാഞ്ജലി" },
];

/** Poetic tribute lead-ins; `name` is appended to the ones that end mid-sentence. */
export const TRIBUTES = [
  { id: "t1", label: "ഹൃദയങ്ങളിൽ മായാത്ത ഓർമ്മ", lead: "ഞങ്ങളുടെ ഹൃദയങ്ങളിൽ മായാത്ത ഓർമ്മയായി എന്നും ജീവിക്കുന്ന പ്രിയപ്പെട്ട", needsName: true },
  { id: "t2", label: "ഓർമ്മകൾക്കു മുന്നിൽ പ്രണാമം", lead: "നിന്റെ ഓർമ്മകൾക്കു മുന്നിൽ പ്രണാമം", needsName: false },
  { id: "t3", label: "മനസ്സിൽ എന്നും ജീവിക്കുന്ന", lead: "വിടപറഞ്ഞുപോയെങ്കിലും ഞങ്ങളുടെ മനസ്സിൽ എന്നും ജീവിക്കുന്ന സ്നേഹനിധിയായ", needsName: true },
];

export function tributeText(id: string, name: string) {
  const t = TRIBUTES.find((x) => x.id === id);
  if (!t) return "";
  return t.needsName ? `${t.lead} ${name.trim() || "[പേര്]"}.` : `${t.lead}.`;
}

export const BOX_SIZES = [
  { columns: 1, heightCm: 5, label: "1 col × 5 cm" },
  { columns: 1, heightCm: 8, label: "1 col × 8 cm" },
  { columns: 2, heightCm: 6, label: "2 col × 6 cm" },
  { columns: 2, heightCm: 10, label: "2 col × 10 cm" },
];

export const DEFAULT_OBITUARY: ObituaryFields = {
  kind: "demise",
  prefixId: "nirayathan",
  gender: "m",
  name: "", age: "", house: "", place: "",
  demiseDate: "", demiseTime: "",
  funeralDate: "", funeralTime: "", funeralPlace: "",
  family: "",
  contact: "",
  milestone: "1",
  remembranceDate: "",
  tribute: "",
  photoFrame: "round",
  frameAccent: "garland",
  frameStyle: "traditional",
  headingStyle: "classic",
  prayer: "",
  photoCrop: { zoom: 1, x: 50, y: 50 },
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8)}-${v.slice(5, 7)}-${v.slice(0, 4)}` : v);

/** "21:30" → "രാത്രി 9:30" (Malayalam day-part + 12-hour clock). */
export function fmtTime(v: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return v;
  const h = Number(m[1]);
  const part = h >= 4 && h < 12 ? "രാവിലെ" : h >= 12 && h < 15 ? "ഉച്ചയ്ക്ക്" : h >= 15 && h < 18 ? "വൈകിട്ട്" : "രാത്രി";
  return `${part} ${h % 12 || 12}:${m[2]}`;
}

/** Turn the form into the print text. Required fields left empty become [BRACKETED] so booking is blocked until filled. */
export function composeObituary(f: ObituaryFields): string {
  const name = f.name.trim() || "[പേര്]";
  const where = [f.house.trim(), f.place.trim()].filter(Boolean).join(", ");
  const who = `${name}${f.age.trim() ? ` (${f.age.trim()} വയസ്സ്)` : ""}${where ? `, ${where}` : ""}`;
  const lines: string[] = [];

  if (f.kind === "anniversary") {
    lines.push(MILESTONES.find((m) => m.id === f.milestone)?.label ?? "വാർഷിക സ്മരണാഞ്ജലി");
    lines.push(who + ".");
    if (f.remembranceDate) lines.push(`സ്മരണ തീയതി: ${fmtDate(f.remembranceDate)}`);
    if (f.tribute.trim()) lines.push(f.tribute.trim());
    if (f.prayer.trim()) lines.push(f.prayer.trim());
    lines.push(`ഓർമ്മകളോടെ: ${f.family.trim().replace(/\s*\n\s*/g, ", ") || "കുടുംബാംഗങ്ങൾ"}`);
    return lines.join("\n");
  }

  const prefix = PREFIXES.find((p) => p.id === f.prefixId) ?? PREFIXES[0];
  const when = [f.demiseDate && fmtDate(f.demiseDate), f.demiseTime && fmtTime(f.demiseTime)].filter(Boolean).join(", ");
  lines.push(prefix.text);
  if (prefix.isVerb) {
    lines.push(who + ".");
    if (when) lines.push(`മരണം: ${when}`);
  } else {
    const verb = f.gender === "f" ? "നിര്യാതയായി" : "നിര്യാതനായി";
    lines.push(`${who}${when ? `, ${when}-ന്` : ""} ${verb}.`);
  }
  const funeral = [f.funeralDate && fmtDate(f.funeralDate), f.funeralTime && fmtTime(f.funeralTime), f.funeralPlace.trim()].filter(Boolean).join(", ");
  if (funeral) lines.push(`സംസ്കാരം: ${funeral}`);
  if (f.family.trim()) lines.push(f.family.trim());
  if (f.tribute.trim()) lines.push(f.tribute.trim());
  if (f.prayer.trim()) lines.push(f.prayer.trim());
  if (f.contact.trim()) lines.push(`ഫോൺ: ${f.contact.trim()}`);
  return lines.join("\n");
}

export interface ObituaryPreset {
  id: string;
  title: string;
  titleMl: string;
  description: string;
  kind: ObituaryKind;
  /** Suggested ad type: the display box preset needs a photo. */
  adType: "classified-text" | "classified-display";
  build: (now: Date) => ObituaryFields;
}

/** Sample drafts use fictional people and places. */
export const OBITUARY_PRESETS: ObituaryPreset[] = [
  {
    id: "standard",
    title: "Standard demise notice",
    titleMl: "ലളിതമായ മരണവാർത്ത",
    description: "4–6 line classified text ad",
    kind: "demise",
    adType: "classified-text",
    build: (now) => ({
      ...DEFAULT_OBITUARY,
      prefixId: "nirayathan", gender: "m",
      name: "കെ. ഗോപാലൻ നായർ", age: "78", house: "കാരുവള്ളിൽ", place: "തൃക്കാക്കര, കൊച്ചി",
      demiseDate: iso(now), demiseTime: "06:30",
      funeralDate: iso(new Date(now.getTime() + 864e5)), funeralTime: "11:00", funeralPlace: "വീട്ടുവളപ്പിൽ",
      family: "ഭാര്യ: സരസ്വതി അമ്മ. മക്കൾ: രമേശ്, സുമ. മരുമക്കൾ: ദീപ, മധു.",
      contact: "98xxx xxx04",
    }),
  },
  {
    id: "display-photo",
    title: "Display box obituary with photo",
    titleMl: "ഫോട്ടോയോടുകൂടിയ അനുശോചനം",
    description: "Box ad with photo and funeral timetable",
    kind: "demise",
    adType: "classified-display",
    build: (now) => ({
      ...DEFAULT_OBITUARY,
      prefixId: "christian", gender: "f",
      name: "മേരി ജോസഫ്", age: "82", house: "പുളിക്കൽ", place: "അങ്കമാലി",
      demiseDate: iso(now), demiseTime: "21:15",
      funeralDate: iso(new Date(now.getTime() + 2 * 864e5)), funeralTime: "15:00", funeralPlace: "ഭവനത്തിൽ ശുശ്രൂഷ, തുടർന്ന് സെന്റ് ജോർജ് പള്ളിയിൽ",
      family: "ഭർത്താവ്: പരേതനായ ജോസഫ് പി.ജെ. മക്കൾ: സിബി, ഷീബ, ജിജോ. മരുമക്കൾ: ലിജി, തോമസ്, ആൻസി.",
      photoFrame: "rect", frameAccent: "none", frameStyle: "christian",
    }),
  },
  {
    id: "annual",
    title: "First year remembrance",
    titleMl: "വാർഷിക സ്മരണാഞ്ജലി",
    description: "Memorial with tribute verse",
    kind: "anniversary",
    adType: "classified-display",
    build: (now) => ({
      ...DEFAULT_OBITUARY,
      kind: "anniversary", milestone: "1",
      name: "കെ. ഗോപാലൻ നായർ", house: "കാരുവള്ളിൽ", place: "തൃക്കാക്കര, കൊച്ചി",
      remembranceDate: iso(now),
      tribute: tributeText("t1", "ഗോപാലൻ നായർ"),
      family: "ഭാര്യ, മക്കൾ, മരുമക്കൾ, കൊച്ചുമക്കൾ, ബന്ധുമിത്രാദികൾ",
      photoFrame: "round", frameAccent: "garland",
    }),
  },
];

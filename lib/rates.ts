import { categories } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import type { AdType, Newspaper } from "./types";

/** One row of the `publication_rates` table (and of the admin Excel template). */
export interface RateRow {
  id?: string;
  newspaper_name: string;
  /** Edition name, or "all" for every edition of the newspaper. */
  edition: string;
  /** Category id (e.g. "matrimonial"), or "all". */
  category: string;
  ad_type: AdType;
  /** Classified text: price for the minimum lines. */
  base_rate: number;
  /** Classified text: price per line beyond the minimum. */
  extra_line_rate: number;
  /** Display ads: price per cm². */
  sq_cm_rate: number;
  /** Extra charged for a colour ad, in percent. */
  color_surcharge_percent: number;
  /** Exact printed colour rate per cm² (display ads), when the card prints one. Takes precedence over the percentage. */
  color_sq_cm_rate?: number | null;
  /** Classified text priced PER WORD (cards like Manorama's): ordinary rate in the paper's language, English ordinary, English caps, and the heading rate per line. */
  word_rate?: number | null;
  eng_word_rate?: number | null;
  caps_word_rate?: number | null;
  heading_line_rate?: number | null;
  /** Minimum billable words (per-word cards). */
  min_words?: number | null;
  /** Minimum billable lines (text) / cm² (display). Null → the publication's standard minimum. */
  min_lines: number | null;
  min_sq_cm: number | null;
  /** Booking closes this many days before the print date, at cutoff_time ("HH:mm"). Null → standard cut-off. */
  cutoff_days: number | null;
  cutoff_time: string | null;
  /** True when the rates above already include GST (cards say "incl. GST"). */
  gst_included: boolean;
  /** Classified text enhancements: flat extra charge (0 = free). */
  bold_heading_rate: number;
  tick_rate: number;
  border_rate: number;
}

/**
 * Extra tariff items from an imported rate card (table `publication_extras`): page-position premiums, combo
 * packages and classified add-on percentages. All numbers are exactly as printed on the card.
 */
export type ExtraKind = "page_premium" | "combo" | "addon" | "import_meta";
export interface RateExtra {
  newspaper_name: string;
  kind: ExtraKind;
  /** page_premium: position id (+ "|edition"); combo: package name; addon: "classified"; import_meta: "pdf". */
  name: string;
  data: Record<string, unknown>;
}
export interface PagePremiumData { label: string; edition?: string | null; percent?: number | null; rate_per_sq_cm?: number | null; /** Printed colour rate at this position (₹/cm²). */ color_rate_per_sq_cm?: number | null }
/** One priced line of a combo package / slab: display (sq_cm_rate), per-word or per-line classified text. */
export type ComboRate = { ad_type: AdType; category: string; sq_cm_rate: number; color_surcharge_percent: number; color_sq_cm_rate?: number | null; min_sq_cm?: number | null } & Partial<Pick<RateRow, "word_rate" | "eng_word_rate" | "caps_word_rate" | "heading_line_rate" | "min_words" | "base_rate" | "extra_line_rate" | "min_lines">>;
/** A combo package (explicit `includes`) or a count-based slab ("Any 3 editions": `tier`). */
export interface ComboData {
  includes: string[];
  gst_included?: boolean;
  /** Slab: applies when the number of selected editions inside `scope` is between min and max. */
  tier?: { min: number; max: number; scope: "any" | "kerala" | "outside-kerala" | "india" };
  rates: ComboRate[];
}
export interface AddonData {
  tint_percent?: number | null; underline_percent?: number | null; box_percent?: number | null;
  /** Flat box-number fee (₹) and the highlighter-symbol fee by number of editions booked. */
  box_fee?: number | null;
  highlighter?: { min: number; max: number | null; fee: number }[] | null;
}
/** Extra columns that travel with a rate row (not spreadsheet columns). */
export const ROW_EXTRA_COLUMNS = ["color_sq_cm_rate", "word_rate", "eng_word_rate", "caps_word_rate", "heading_line_rate", "min_words"] as const;
/** True when the row prices anything (per line, per cm² or per word). */
export const hasPrice = (r: Pick<RateRow, "base_rate" | "sq_cm_rate"> & { word_rate?: number | null }) => r.base_rate > 0 || r.sq_cm_rate > 0 || (r.word_rate ?? 0) > 0;

/** Edition groupings of a publication, used to expand printed rows such as "All Kerala" or "Any 3 Outside Kerala Indian Editions". */
export const OVERSEAS_EDITION = /gulf|overseas|international|middle east|dubai|uae|global/i;
type PaperLike = { editions: { name: string; groupId: string }[]; groups: { id: string; name: string }[] };
export function keralaEditionNames(paper: PaperLike): string[] { const ids = paper.groups.filter((g) => /kerala/i.test(g.name)).map((g) => g.id); return paper.editions.filter((e) => ids.includes(e.groupId)).map((e) => e.name); }
export const overseasEditionNames = (paper: PaperLike) => paper.editions.filter((e) => OVERSEAS_EDITION.test(e.name)).map((e) => e.name);
export function outsideKeralaEditionNames(paper: PaperLike): string[] { const k = new Set(keralaEditionNames(paper)); return paper.editions.filter((e) => !k.has(e.name) && !OVERSEAS_EDITION.test(e.name)).map((e) => e.name); }
export const indianEditionNames = (paper: PaperLike) => paper.editions.filter((e) => !OVERSEAS_EDITION.test(e.name)).map((e) => e.name);

/** Districts that some publications print from a neighbouring centre; used only when the district itself has no published rate. */
export const EDITION_ALIASES: Record<string, string> = { idukki: "Kottayam", wayanad: "Kozhikode", kasaragod: "Kannur" };

/** All 14 Kerala districts and the printing edition(s) that serve them, in order of preference (used by the booking search). */
export const DISTRICT_EDITIONS: Record<string, string[]> = {
  thiruvananthapuram: ["Thiruvananthapuram"], trivandrum: ["Thiruvananthapuram"], kollam: ["Kollam"], pathanamthitta: ["Pathanamthitta", "Kottayam"],
  alappuzha: ["Alappuzha"], kottayam: ["Kottayam"], idukki: ["Kottayam"], ernakulam: ["Kochi"], thrissur: ["Thrissur"], palakkad: ["Palakkad"],
  malappuram: ["Malappuram"], kozhikode: ["Kozhikode"], wayanad: ["Kozhikode"], kannur: ["Kannur"], kasaragod: ["Kannur"],
};
/** Districts whose name matches the search text (3+ letters), each with the edition names that serve it. */
export function districtMatches(query: string): { district: string; editions: string[] }[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  return Object.entries(DISTRICT_EDITIONS).filter(([d]) => d.startsWith(q)).map(([d, editions]) => ({ district: d.charAt(0).toUpperCase() + d.slice(1), editions }));
}

/** Per-newspaper settings (table `newspaper_settings`). */
export interface PaperSettings {
  newspaper_name: string;
  /** Weekdays it prints, 0 = Sunday … 6 = Saturday; null = every day. */
  print_days: number[] | null;
  /** Edition names offered for booking; null = all. */
  enabled_editions: string[] | null;
}

/** Field keys in template column order. */
export const RATE_COLUMNS = ["newspaper_name", "edition", "category", "ad_type", "base_rate", "extra_line_rate", "sq_cm_rate", "min_lines", "min_sq_cm", "cutoff_days", "cutoff_time", "color_surcharge_percent", "gst_included", "bold_heading_rate", "tick_rate", "border_rate"] as const;
/** Header text of each template column (the first column is headed "newspaper"). */
export const TEMPLATE_HEADERS: string[] = RATE_COLUMNS.map((c) => (c === "newspaper_name" ? "newspaper" : c));
/** Locked (identity) columns of the template; everything after them is editable. */
export const LOCKED_COLUMNS = 4;
export const CONFLICT_KEY = "newspaper_name,edition,category,ad_type";
export const ALL = "all";
export const AD_TYPE_IDS: AdType[] = ["classified-text", "classified-display", "commercial-display"];

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const normAdType = (s: unknown) => norm(s).replace(/[_\s]+/g, "-");
const isAll = (s: unknown) => ["all", "*", "any", ""].includes(norm(s));

export interface RowResult {
  /** 1-based spreadsheet row (header is row 1, so data starts at 2). */
  line: number;
  row?: RateRow;
  errors: string[];
  /** All four rate cells empty/0: nothing to save (the table editor treats it as "clear this rate"). */
  skipped?: boolean;
  /** Canonical identity of a skipped row. */
  key?: Pick<RateRow, "newspaper_name" | "edition" | "category" | "ad_type">;
}

export const HEADER_ERROR = "Invalid template format: Column headers must not be modified.";

/** Strict header check: the first row must be exactly the template's columns, in order, with nothing added or removed. */
export function headersValid(headers: unknown[]): boolean {
  const h = headers.map((x) => String(x ?? "").trim());
  while (h.length && h[h.length - 1] === "") h.pop(); // ignore trailing empty cells
  return h.length === TEMPLATE_HEADERS.length && TEMPLATE_HEADERS.every((c, i) => h[i] === c);
}

export interface Permutation {
  edition: string;
  category: string;
  ad_type: AdType;
}

/** Every valid (edition, category, ad_type) combination for a newspaper, "all" included. This is the fixed template structure. */
export function permutations(paper: Newspaper): Permutation[] {
  const editions = [ALL, ...paper.editions.map((e) => e.name)];
  const cats = [ALL, ...categories.map((c) => c.id)];
  const out: Permutation[] = [];
  for (const ad_type of AD_TYPE_IDS) for (const edition of editions) for (const category of cats) out.push({ edition, category, ad_type });
  return out;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return 0; // blank = 0
  const n = typeof v === "number" ? v : Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const optNum = (v: unknown): number | null | "bad" => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : "bad";
};

/** "16:00", "4:00 PM", "4 pm" or an Excel time fraction → "HH:mm"; null when blank; "bad" when unreadable. */
export function parseCutoffTime(v: unknown): string | null | "bad" {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  if (typeof v === "number") {
    if (v < 0 || v >= 1) return "bad";
    const mins = Math.round(v * 1440);
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  const m = String(v).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return "bad";
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap) { if (h < 1 || h > 12) return "bad"; h = (h % 12) + (ap === "pm" ? 12 : 0); }
  return h <= 23 && min <= 59 ? `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` : "bad";
}

const parseBool = (v: unknown): boolean | "bad" => {
  if (typeof v === "boolean") return v;
  const x = norm(v);
  if (["", "false", "no", "n", "0"].includes(x)) return false;
  if (["true", "yes", "y", "1"].includes(x)) return true;
  return "bad";
};

/** Validates and canonicalises raw spreadsheet rows. Duplicate keys inside one file are rejected (an upsert can't hit one row twice). */
export function validateRows(raw: Record<string, unknown>[]): RowResult[] {
  const seen = new Map<string, number>();
  return raw.map((r, i): RowResult => {
    const line = i + 2;
    const errors: string[] = [];
    const paper = newspapers.find((n) => norm(n.name) === norm(r.newspaper_name) || n.id === norm(r.newspaper_name));
    if (!norm(r.newspaper_name)) errors.push("newspaper_name is required");
    else if (!paper) errors.push(`Unknown newspaper "${r.newspaper_name}"`);

    let edition = ALL;
    if (!isAll(r.edition)) {
      const e = paper?.editions.find((x) => norm(x.name) === norm(r.edition));
      if (paper && !e) errors.push(`"${r.edition}" is not an edition of ${paper.name}`);
      else if (e) edition = e.name;
    }

    let category = ALL;
    if (!isAll(r.category)) {
      const c = categories.find((x) => x.id === norm(r.category) || norm(x.name) === norm(r.category));
      if (!c) errors.push(`Unknown category "${r.category}"`);
      else category = c.id;
    }

    const adType = normAdType(r.ad_type) as AdType;
    if (!AD_TYPE_IDS.includes(adType)) errors.push(`ad_type must be one of: ${AD_TYPE_IDS.join(", ")}`);

    const base = num(r.base_rate), extra = num(r.extra_line_rate), sq = num(r.sq_cm_rate), color = num(r.color_surcharge_percent);
    for (const [name, v] of [["base_rate", base], ["extra_line_rate", extra], ["sq_cm_rate", sq], ["color_surcharge_percent", color]] as const) {
      if (v === null) errors.push(`${name} must be a number`);
      else if (v < 0) errors.push(`${name} can't be negative`);
    }
    const bold = num(r.bold_heading_rate), tick = num(r.tick_rate), border = num(r.border_rate);
    for (const [name, v] of [["bold_heading_rate", bold], ["tick_rate", tick], ["border_rate", border]] as const) {
      if (v === null) errors.push(`${name} must be a number`);
      else if (v < 0) errors.push(`${name} can't be negative`);
    }
    if (color !== null && color > 500) errors.push("color_surcharge_percent looks too high (max 500)");
    const minLines = optNum(r.min_lines), minSq = optNum(r.min_sq_cm), cutDays = optNum(r.cutoff_days);
    const cutTime = parseCutoffTime(r.cutoff_time), gst = parseBool(r.gst_included);
    if (minLines === "bad" || (minLines !== null && (!Number.isInteger(minLines) || minLines < 1 || minLines > 50))) errors.push("min_lines must be a whole number from 1 to 50");
    if (minSq === "bad" || (minSq !== null && (minSq <= 0 || minSq > 5000))) errors.push("min_sq_cm must be a number above 0 (max 5000)");
    if (cutDays === "bad" || (cutDays !== null && (!Number.isInteger(cutDays) || cutDays < 0 || cutDays > 30))) errors.push("cutoff_days must be a whole number from 0 to 30");
    if (cutTime === "bad") errors.push('cutoff_time must be a time like "16:00" or "4:00 PM"');
    if ((cutDays === null) !== (cutTime === null)) errors.push("cutoff_days and cutoff_time must be set together");
    if (gst === "bad") errors.push("gst_included must be TRUE or FALSE");
    const wx: Record<string, number> = {};
    for (const k of ROW_EXTRA_COLUMNS) {
      const v = optNum(r[k]);
      if (v === "bad" || (v !== null && (v < 0 || v > 1_000_000))) errors.push(`${k} must be a number from 0 to 1,000,000`);
      else if (v !== null && v > 0) wx[k] = Math.round(v * 100) / 100;
    }
    const hasWord = (wx.word_rate ?? 0) > 0;
    const empty = !hasWord && !wx.color_sq_cm_rate && !base && !extra && !sq && !color && minLines === null && minSq === null && cutDays === null && cutTime === null && gst === false && !bold && !tick && !border;
    if (!empty && adType === "classified-text" && !(base && base > 0) && !hasWord) errors.push("base_rate (or a per-word rate) is required (> 0) for classified-text");
    if (!empty && adType && adType !== "classified-text" && AD_TYPE_IDS.includes(adType) && !(sq && sq > 0)) errors.push("sq_cm_rate is required (> 0) for display ads");

    if (!errors.length && paper) {
      const key = [paper.name, edition, category, adType].join("|").toLowerCase();
      const first = seen.get(key);
      if (first) errors.push(`Duplicate of row ${first} (same newspaper, edition, category and ad_type)`);
      else seen.set(key, line);
    }
    if (errors.length || !paper) return { line, errors };
    if (empty) {
      return { line, errors, skipped: true, key: { newspaper_name: paper.name, edition, category, ad_type: adType } };
    }
    return {
      line,
      errors,
      row: { newspaper_name: paper.name, edition, category, ad_type: adType, base_rate: base!, extra_line_rate: extra!, sq_cm_rate: sq!, color_surcharge_percent: color!,
        min_lines: minLines as number | null, min_sq_cm: minSq as number | null, cutoff_days: cutDays as number | null, cutoff_time: cutTime as string | null, gst_included: gst as boolean,
        bold_heading_rate: bold!, tick_rate: tick!, border_rate: border!, ...wx },
    };
  });
}

// ── Active rate book (what the booking calculator reads) ─────────────────────────────────────────────────────────────

export type RateBook = RateRow[];
let book: RateBook | null = null; // null = not loaded / offline → built-in rates
let version = 0;
const listeners = new Set<() => void>();

export function setActiveRates(rows: RateBook | null) {
  book = rows;
  version++;
  listeners.forEach((l) => l());
}
export const getActiveRates = () => book;
export const subscribeRates = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getRatesVersion = () => version;

const warned = new Set<string>();
function warnOnce(key: string, msg: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[rates] ${msg}`);
}

/** Most specific matching rule: exact edition beats "all", exact category beats "all". No rule → null (never a default). */
export function matchRate(rates: RateBook | null, paperName: string, editionName: string, categoryId: string | null | undefined, adType: AdType): RateRow | null {
  if (!rates) return null;
  let best: RateRow | null = null;
  let bestScore = -1;
  for (const r of rates) {
    if (r.ad_type !== adType || norm(r.newspaper_name) !== norm(paperName)) continue;
    if (!hasPrice(r)) continue;
    const edOk = isAll(r.edition) || norm(r.edition) === norm(editionName);
    const catOk = isAll(r.category) || (!!categoryId && norm(r.category) === norm(categoryId));
    if (!edOk || !catOk) continue;
    const score = (isAll(r.edition) ? 0 : 2) + (isAll(r.category) ? 0 : 1);
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

/** matchRate plus the edition aliases (Idukki → Kottayam, …): the one lookup both pricing and availability use. */
export function matchRateAliased(rates: RateBook | null, paperName: string, editionName: string, categoryId: string | null | undefined, adType: AdType): RateRow | null {
  let hit = matchRate(rates, paperName, editionName, categoryId, adType);
  const alias = EDITION_ALIASES[norm(editionName)];
  if (!hit && alias) hit = matchRate(rates, paperName, alias, categoryId, adType);
  return hit;
}

/** Same as matchRateAliased, but logs (once) when nothing is published: the calculator then prices nothing for that edition. */
export function findRate(rates: RateBook | null, paperName: string, editionName: string, categoryId: string | null | undefined, adType: AdType): RateRow | null {
  const hit = matchRateAliased(rates, paperName, editionName, categoryId, adType);
  if (!hit) warnOnce(`${paperName}|${editionName}|${categoryId}|${adType}`, rates ? `No published rate for ${paperName} / ${editionName} / ${categoryId ?? "any category"} / ${adType}: not priced.` : "Rates not loaded: nothing is priced.");
  return hit;
}

/** True when the newspaper has a usable published rule (optionally for one ad type). */
export const paperHasRates = (rates: RateBook, paperName: string, adType?: AdType) =>
  rates.some((r) => norm(r.newspaper_name) === norm(paperName) && (!adType || r.ad_type === adType) && hasPrice(r));

/** Lowest published per-unit rate (per line for text, per cm² for display), or null when none is published. */
export function headlineRate(rates: RateBook | null, paperName: string, adType: AdType, minLines: number, categoryId?: string | null): { amount: number; unit: "line" | "cm²" | "word" } | null {
  if (!rates) return null;
  // With a category, only rows for that category (or "all") count, so the headline never borrows another category's price.
  const mine = rates.filter((r) => r.ad_type === adType && norm(r.newspaper_name) === norm(paperName) && (!categoryId || isAll(r.category) || norm(r.category) === norm(categoryId)));
  if (adType === "classified-text") {
    const words = mine.map((r) => r.word_rate ?? 0).filter((v) => v > 0);
    if (words.length) return { amount: Math.round(Math.min(...words)), unit: "word" };
  }
  const vals = mine.map((r) => (adType === "classified-text" ? r.base_rate / Math.max(1, minLines) : r.sq_cm_rate)).filter((v) => v > 0);
  return vals.length ? { amount: Math.round(Math.min(...vals)), unit: adType === "classified-text" ? "line" : "cm²" } : null;
}

// ── Imported tariff extras (page premiums, combos, add-on percentages) ───────────────────────────────────────────────

let extrasBook: RateExtra[] = [];
export function setActiveExtras(rows: RateExtra[]) {
  extrasBook = rows;
  version++;
  listeners.forEach((l) => l());
}
export const getActiveExtras = () => extrasBook;
const sameName = (a: string, b: string) => norm(a) === norm(b);

/** Page-position premium for a newspaper (edition-specific entry wins over a card-wide one). */
export function pagePremium(extras: RateExtra[], paperName: string, editionName: string, positionId: string): PagePremiumData | null {
  const mine = extras.filter((x) => x.kind === "page_premium" && sameName(x.newspaper_name, paperName) && x.name.split("|")[0] === positionId);
  const hit = mine.find((x) => (x.data as unknown as PagePremiumData).edition && sameName(String((x.data as unknown as PagePremiumData).edition), editionName)) ?? mine.find((x) => !(x.data as unknown as PagePremiumData).edition);
  return hit ? (hit.data as unknown as PagePremiumData) : null;
}
/** Position ids (with labels) that every one of the given newspapers has a printed premium for. */
export function commonPositions(extras: RateExtra[], paperNames: string[]): { id: string; label: string }[] {
  if (!paperNames.length) return [];
  const per = paperNames.map((n) => new Map(extras.filter((x) => x.kind === "page_premium" && sameName(x.newspaper_name, n)).map((x) => [x.name.split("|")[0], (x.data as unknown as PagePremiumData).label])));
  return [...per[0]].filter(([id]) => per.every((m) => m.has(id))).map(([id, label]) => ({ id, label }));
}
export function addonsFor(extras: RateExtra[], paperName: string): AddonData {
  return (extras.find((x) => x.kind === "addon" && sameName(x.newspaper_name, paperName))?.data ?? {}) as AddonData;
}
export const combosFor = (extras: RateExtra[], paperName: string) =>
  extras.filter((x) => x.kind === "combo" && sameName(x.newspaper_name, paperName)).map((x) => ({ name: x.name, ...(x.data as unknown as ComboData) }));
export const hasVerifiedImport = (extras: RateExtra[], paperName: string) => extras.some((x) => x.kind === "import_meta" && sameName(x.newspaper_name, paperName));

// ── Publication settings and effective per-card configuration ─────────────────────────────────────────────────────

let settingsBook: PaperSettings[] | null = null;
export function setActiveSettings(rows: PaperSettings[] | null) {
  settingsBook = rows;
  version++;
  listeners.forEach((l) => l());
}
export const getActiveSettings = () => settingsBook;
const settingsFor = (name: string) => settingsBook?.find((s) => norm(s.newspaper_name) === norm(name)) ?? null;

/** Does the newspaper print on this date's weekday? (No setting → every day.) */
export function printsOn(paperName: string, date: Date): boolean {
  const days = settingsFor(paperName)?.print_days;
  return !days || days.length === 0 || days.includes(date.getDay());
}

/** Is the edition offered for booking? (No setting → all editions.) */
export function editionEnabled(paperName: string, editionName: string): boolean {
  const list = settingsFor(paperName)?.enabled_editions;
  return !list || list.length === 0 || list.some((e) => norm(e) === norm(editionName));
}

/** The editions customers can see and book: the paper's list filtered by its `enabled_editions` setting (null/empty = all). */
export function visibleEditions<E extends { name: string }>(paper: { name: string; editions: E[] }): E[] {
  return paper.editions.filter((e) => editionEnabled(paper.name, e.name));
}

export interface PaperConfig {
  minLines: number;
  minSqCm: number;
  cutoff: { daysBefore: number; time: string };
  gstIncluded: boolean;
}

/**
 * What a card shows for a newspaper and ad type: the admin's values from the rate sheet, using the publication's
 * standard minimums / cut-off only where the sheet leaves them blank. (These are limits, not prices.)
 */
export function paperConfig(paper: Newspaper, adType: AdType, rates: RateBook | null = book): PaperConfig {
  const rows = (rates ?? [])
    .filter((r) => r.ad_type === adType && norm(r.newspaper_name) === norm(paper.name) && hasPrice(r))
    // most general first: "all" edition/category rows describe the publication as a whole
    .sort((a, b) => Number(!isAll(a.edition)) + Number(!isAll(a.category)) - (Number(!isAll(b.edition)) + Number(!isAll(b.category))));
  const pick = <K extends keyof RateRow>(k: K) => rows.find((r) => r[k] !== null && r[k] !== undefined)?.[k] as RateRow[K] | undefined;
  const cut = rows.find((r) => r.cutoff_days !== null && r.cutoff_time !== null);
  return {
    minLines: pick("min_lines") ?? paper.rates.textMinLines,
    minSqCm: pick("min_sq_cm") ?? paper.rates.minDisplayCm2,
    cutoff: cut ? { daysBefore: cut.cutoff_days!, time: cut.cutoff_time! } : paper.cutoffs[adType],
    gstIncluded: rows[0]?.gst_included ?? false,
  };
}

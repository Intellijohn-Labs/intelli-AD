import { categories } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import type { AdType } from "./types";

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
}

export const RATE_COLUMNS = ["newspaper_name", "edition", "category", "ad_type", "base_rate", "extra_line_rate", "sq_cm_rate", "color_surcharge_percent"] as const;
export const CONFLICT_KEY = "newspaper_name,edition,category,ad_type";
export const ALL = "all";
export const AD_TYPE_IDS: AdType[] = ["classified-text", "classified-display", "commercial-display"];

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const normAdType = (s: unknown) => norm(s).replace(/[_\s]+/g, "-");
const isAll = (s: unknown) => ["all", "*", "any", ""].includes(norm(s));

/** Sample rows for the downloadable template (real newspaper, edition and category names from the app). */
export function sampleRows(paperName?: string): RateRow[] {
  const p = newspapers.find((n) => n.name === paperName) ?? newspapers[0];
  return [
    { newspaper_name: p.name, edition: p.editions[0].name, category: "matrimonial", ad_type: "classified-text", base_rate: 450, extra_line_rate: 150, sq_cm_rate: 0, color_surcharge_percent: 0 },
    { newspaper_name: p.name, edition: ALL, category: ALL, ad_type: "classified-display", base_rate: 0, extra_line_rate: 0, sq_cm_rate: 380, color_surcharge_percent: 25 },
    { newspaper_name: p.name, edition: p.editions[0].name, category: ALL, ad_type: "commercial-display", base_rate: 0, extra_line_rate: 0, sq_cm_rate: 620, color_surcharge_percent: 30 },
  ];
}

export interface RowResult {
  /** 1-based spreadsheet row (header is row 1, so data starts at 2). */
  line: number;
  row?: RateRow;
  errors: string[];
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return 0; // blank = 0
  const n = typeof v === "number" ? v : Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
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
    if (color !== null && color > 500) errors.push("color_surcharge_percent looks too high (max 500)");
    if (adType === "classified-text" && !(base && base > 0)) errors.push("base_rate is required (> 0) for classified-text");
    if (adType && adType !== "classified-text" && AD_TYPE_IDS.includes(adType) && !(sq && sq > 0)) errors.push("sq_cm_rate is required (> 0) for display ads");

    if (!errors.length && paper) {
      const key = [paper.name, edition, category, adType].join("|").toLowerCase();
      const first = seen.get(key);
      if (first) errors.push(`Duplicate of row ${first} (same newspaper, edition, category and ad_type)`);
      else seen.set(key, line);
    }
    if (errors.length || !paper) return { line, errors };
    return {
      line,
      errors,
      row: { newspaper_name: paper.name, edition, category, ad_type: adType, base_rate: base!, extra_line_rate: extra!, sq_cm_rate: sq!, color_surcharge_percent: color! },
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

/** Most specific matching rule: exact edition beats "all", exact category beats "all". Null → caller uses built-in rates. */
export function findRate(rates: RateBook | null, paperName: string, editionName: string, categoryId: string | null | undefined, adType: AdType): RateRow | null {
  if (!rates) {
    warnOnce("offline", "Database rates unavailable (offline or not loaded): using built-in default rates.");
    return null;
  }
  let best: RateRow | null = null;
  let bestScore = -1;
  for (const r of rates) {
    if (r.ad_type !== adType || norm(r.newspaper_name) !== norm(paperName)) continue;
    const edOk = isAll(r.edition) || norm(r.edition) === norm(editionName);
    const catOk = isAll(r.category) || (!!categoryId && norm(r.category) === norm(categoryId));
    if (!edOk || !catOk) continue;
    const score = (isAll(r.edition) ? 0 : 2) + (isAll(r.category) ? 0 : 1);
    if (score > bestScore) { best = r; bestScore = score; }
  }
  if (!best) warnOnce(`${paperName}|${editionName}|${categoryId}|${adType}`, `No rate for ${paperName} / ${editionName} / ${categoryId ?? "any category"} / ${adType}: using built-in default rate.`);
  return best;
}

/** True when the rate book has at least one usable rule (a base rate or a per-cm² rate) for the newspaper. */
export const paperHasRates = (rates: RateBook, paperName: string) =>
  rates.some((r) => norm(r.newspaper_name) === norm(paperName) && (r.base_rate > 0 || r.sq_cm_rate > 0));

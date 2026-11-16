/**
 * Rate card PDF import: the shape the AI extracts from a tariff PDF, and the deterministic mapping from that
 * extraction to rows of our pricing table (`publication_rates`). Client-safe (no server imports).
 */
import { z } from "zod";
import type { AdType, Newspaper } from "./types";
import { ALL, type RateRow } from "./rates";

const num = z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[₹,\s]/g, "")) : v), z.number().finite().nullable()).nullable().optional();
const str = z.string().nullable().optional();

export const extractionSchema = z.object({
  publication: str,
  effectiveDate: str,
  gstIncluded: z.boolean().nullable().optional(),
  confidence: num,
  notes: z.array(z.string()).default([]),
  editions: z.array(z.object({ name: z.string(), kind: str, includes: z.array(z.string()).nullable().optional(), count: num })).default([]),
  displayRates: z.array(z.object({
    edition: z.string().default("ALL"),
    category: z.string().default("normal"),
    categoryLabel: str,
    bw: num, colour: num, minSqCm: num,
    uncertain: z.boolean().nullable().optional(),
  })).default([]),
  pagePremiums: z.array(z.object({ position: z.string(), edition: str, surchargePercent: num, ratePerSqCm: num, text: str })).default([]),
  addons: z.object({ boldPerLine: num, boxFee: num, boxPercent: num, tintPercent: num, underlinePercent: num }).nullable().optional(),
  classifiedText: z.array(z.object({
    edition: z.string().default("ALL"),
    language: str,
    perWord: num, perLine: num, minWords: num, minLines: num,
    boldHeadingPerLine: num, boxFee: num, tintPercent: num, underlinePercent: num,
    uncertain: z.boolean().nullable().optional(),
  })).default([]),
});
export type RateExtraction = z.infer<typeof extractionSchema>;

/** JSON shape described to the model (kept in one place so the prompt and the schema stay in step). */
export const EXTRACTION_SHAPE = `{
  "publication": string | null,
  "effectiveDate": "YYYY-MM-DD" | null,
  "gstIncluded": boolean | null,          // true only if the card says rates include GST
  "confidence": number,                    // 0 to 1, your overall confidence
  "notes": string[],                       // anything ambiguous, illegible, or not captured below
  "editions": [ { "name": string, "kind": "single" | "combo" | "any-n", "includes": string[] | null, "count": number | null } ],
  "displayRates": [ {                      // display / classified-display, price PER SQUARE CM
      "edition": string,                   // one edition name exactly as printed, or "ALL" when one rate covers the whole card
      "category": "normal" | "personal" | "obituary" | "matrimonial" | "recruitment" | "financial" | "tender" | "other",
      "categoryLabel": string,             // the label as printed
      "bw": number | null, "colour": number | null, "minSqCm": number | null, "uncertain": boolean } ],
  "pagePremiums": [ { "position": string, "edition": string | null, "surchargePercent": number | null, "ratePerSqCm": number | null, "text": string } ],
  "classifiedText": [ {                    // classified word / line ads
      "edition": string, "language": "ml" | "en" | "other" | null,
      "perWord": number | null, "perLine": number | null, "minWords": number | null, "minLines": number | null,
      "boldHeadingPerLine": number | null, "boxFee": number | null, "tintPercent": number | null, "underlinePercent": number | null, "uncertain": boolean } ]
}`;

/**
 * Compact reply format requested from the model (arrays and short keys, so a whole tariff is ~1–2k tokens and
 * can't run out of room mid-JSON). `expandCompact` turns it back into a RateExtraction.
 */
export const COMPACT_SHAPE = `{
 "date": "YYYY-MM-DD",          // effective date (omit if not printed)
 "gst": 1 | 0,                  // 1 only if the card says rates INCLUDE GST
 "conf": 0.0-1.0,               // overall confidence
 "n": ["short note", ...],      // at most 8 notes: ambiguity, illegible values, things not captured below
 "e": [ ["Edition name", "s|c|n", count, ["included edition", ...]] ],   // s = single edition, c = combination package (list its included editions exactly as printed), n = "any N editions" tier
 "d": [ ["Edition or ALL", "category", bw, colour, minSqCm, uncertain] ],   // display rates PER SQ CM; ONE row per edition+category
 "p": [ ["Position", "Edition or null", percent, perSqCm] ],                // page premiums (Front, Back, Page 3, Page 5/Business, Solus...)
 "c": [ ["Edition or ALL", "ml|en", perWord, perLine, minWords, minLines, uncertain] ],   // classified word / line rates
 "a": { "boldPerLine": rupees, "boxFee": rupees, "boxPercent": percent, "tintPercent": percent, "underlinePercent": percent }   // classified add-on charges exactly as printed (omit any that are not printed)
}
category is one of: normal, personal, obituary, matrimonial, recruitment, financial, tender, other. Use null for any cell that is absent or unreadable; uncertain is 1 or 0.`;

/** System prompt: strict grounding. The model must never produce a number that is not printed in the PDF. */
export const EXTRACTION_SYSTEM = `You are a meticulous data-entry clerk transcribing a newspaper advertising tariff (rate card) PDF into JSON.
GROUNDING RULES (absolute):
1. Extract ONLY exact numbers that are explicitly printed in the PDF. Never guess, estimate, round, average, interpolate, extrapolate, convert or invent any number, and never use general knowledge of what newspapers usually charge.
2. If a rate, percentage, edition, date or minimum is not explicitly printed in the PDF, output null for it (or omit the row). A blank cell in the PDF is null, not 0.
3. Copy edition names and labels exactly as printed. Do not add editions or packages that are not printed.
4. If a figure is hard to read or two readings are possible, output null and add a short note; use the uncertain flag when you are not sure.
5. Do not compute totals, differences or percentages yourself; transcribe what is printed (rupee rates as printed, percentages as printed).
Return ONLY the JSON requested, with no commentary.`;

/** User prompt for the PDF extraction (shared by the API route and offline checks). */
export function buildExtractionPrompt(paperName: string, editionNames: string[]): string {
  return `Transcribe the attached tariff for "${paperName}" into JSON. Our system's names for its editions are: ${editionNames.join(", ")} (the app maps spelling variants such as Trivandrum / Thiruvananthapuram itself, so keep the printed spelling).

Read every page, including multi-column tables and footnotes, and capture the COMPLETE tariff structure:
- e: every individual edition, every combination package (All Kerala, All India, All Kerala + Overseas/Gulf, All Metros, Outside Kerala...) with the editions it includes exactly as listed, and every "any N editions" tier.
- d: display / classified-display prices PER SQUARE CM. One row per edition (or combination package) + category: Normal / Commercial, Personal / Obituary / Remembrance, Matrimonial, Recruitment, Financial, Tender / Notice. Put the black & white and the colour rate in the SAME row.
- p: page-position rates or premiums: Front page, Back page, Page 3, Page 5 / Business, Solus and any others, as the printed percentage and/or printed per-sq-cm rate.
- c: classified per-word (or per-line) rates for Malayalam ("ml") and English ("en") with minimum words / lines, one row per edition and language.
- a: the classified add-on charges as printed: bold / heading extra per line (rupees), box fee (rupees) or box percentage, background tint %, underline %.
- date (the effective date, e.g. "w.e.f. 1 April 2024") and gst (1 only if the card states the rates INCLUDE GST).

Output ONLY minified JSON on a single line (no markdown, no indentation) in exactly this shape:
${COMPACT_SHAPE}`;
}

type Cell = string | number | null | undefined | unknown[];
const cn = (v: Cell): number | null => { const n = Array.isArray(v) ? null : typeof v === "string" ? Number(v.replace(/[₹,%\s]/g, "")) : v; return typeof n === "number" && Number.isFinite(n) ? n : null; };
const cs = (v: Cell): string => (v == null ? "" : String(v));

/** Turns the compact reply into a RateExtraction. Also accepts the long format (displayRates / classifiedText...). */
export function expandCompact(raw: unknown): RateExtraction {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!("d" in o || "c" in o || "p" in o || "e" in o) && ("displayRates" in o || "classifiedText" in o)) return extractionSchema.parse(o);
  const rows = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter(Array.isArray) as Cell[][] : []);
  const kind = (v: Cell) => (cs(v).toLowerCase().startsWith("c") ? "combo" : cs(v).toLowerCase().startsWith("n") ? "any-n" : "single");
  const lang = (v: Cell) => (/^e/i.test(cs(v)) ? "en" : /^m/i.test(cs(v)) ? "ml" : "other");
  return extractionSchema.parse({
    effectiveDate: typeof o.date === "string" ? o.date : null,
    gstIncluded: o.gst == null ? null : o.gst === 1 || o.gst === true || o.gst === "1",
    confidence: cn(o.conf as Cell),
    notes: Array.isArray(o.n) ? (o.n as unknown[]).map(String).slice(0, 12) : [],
    editions: rows("e").map((r) => ({ name: cs(r[0]), kind: kind(r[1]), count: cn(r[2]), includes: Array.isArray(r[3]) ? (r[3] as unknown[]).map(String) : null })),
    displayRates: rows("d").map((r) => ({ edition: cs(r[0]) || "ALL", category: cs(r[1]).toLowerCase() || "normal", categoryLabel: cs(r[1]), bw: cn(r[2]), colour: cn(r[3]), minSqCm: cn(r[4]), uncertain: r[5] === 1 || r[5] === "1" })),
    pagePremiums: rows("p").map((r) => ({ position: cs(r[0]), edition: cs(r[1]) || null, surchargePercent: cn(r[2]), ratePerSqCm: cn(r[3]), text: null })),
    classifiedText: rows("c").map((r) => ({ edition: cs(r[0]) || "ALL", language: lang(r[1]), perWord: cn(r[2]), perLine: cn(r[3]), minWords: cn(r[4]), minLines: cn(r[5]), uncertain: r[6] === 1 || r[6] === "1" || r[10] === 1 })),
    addons: o.a && typeof o.a === "object" ? { boldPerLine: cn((o.a as Record<string, Cell>).boldPerLine), boxFee: cn((o.a as Record<string, Cell>).boxFee), boxPercent: cn((o.a as Record<string, Cell>).boxPercent), tintPercent: cn((o.a as Record<string, Cell>).tintPercent), underlinePercent: cn((o.a as Record<string, Cell>).underlinePercent) } : null,
  });
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9ഀ-ൿ ]+/g, " ").replace(/\s+/g, " ").trim();
const ALIASES: Record<string, string> = {
  trivandrum: "thiruvananthapuram", tvm: "thiruvananthapuram", calicut: "kozhikode", cochin: "kochi", ernakulam: "kochi", trichur: "thrissur",
  cannanore: "kannur", quilon: "kollam", bangalore: "bengaluru", madras: "chennai", bombay: "mumbai", palghat: "palakkad", alleppey: "alappuzha",
};

export type ImportField = "base_rate" | "extra_line_rate" | "sq_cm_rate" | "color_surcharge_percent" | "color_sq_cm_rate" | "min_lines" | "min_sq_cm" | "bold_heading_rate" | "border_rate";
export interface ImportRow extends RateRow {
  /** Stable client id for the review table. */
  uid: string;
  include: boolean;
  /** Where the numbers came from (shown next to the row). */
  source: string;
  /** Cells the admin should check: "missing" = needed but not found, "uncertain" = derived or flagged by the model. */
  flags: Partial<Record<ImportField, "missing" | "uncertain">>;
}

/** A non-row tariff item to save with the import: page premium, combo package, or add-on percentages. */
export interface ImportExtra {
  uid: string;
  include: boolean;
  kind: "page_premium" | "combo" | "addon";
  name: string;
  /** Human label for the review table. */
  label: string;
  data: Record<string, unknown>;
  source: string;
}
export interface ImportMapping { rows: ImportRow[]; extras: ImportExtra[]; notes: string[] }

const POSITION_IDS: [RegExp, string, string][] = [
  [/front|first page|page 1\b|page one/i, "front", "Front page"],
  [/back|last page/i, "back", "Back page"],
  [/page 3\b|third|page three/i, "page3", "Page 3"],
  [/page 5\b|fifth|business|page five/i, "page5", "Page 5 / Business"],
  [/solus/i, "solus", "Solus"],
];
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "position";

type EditionTarget = { kind: "edition"; name: string } | { kind: "all" } | { kind: "none"; reason: string };
function resolveEdition(paper: Newspaper, raw: string): EditionTarget {
  const n = norm(raw);
  if (!n || n === "all" || n === "all editions" || n === "any") return { kind: "all" };
  const alias = ALIASES[n] ?? n;
  const hit = paper.editions.find((e) => norm(e.name) === alias || norm(e.name) === n);
  if (hit) return { kind: "edition", name: hit.name };
  if (/\b(all|any|combo|combined|package|gulf|overseas|metros?|india|kerala)\b/.test(n) || /\d/.test(n)) return { kind: "none", reason: `"${raw}" is a combination / package rate; the booking calculator prices single editions (bundle discounts are configured separately).` };
  return { kind: "none", reason: `"${raw}" is not one of ${paper.name}'s editions in this app.` };
}

const DISPLAY_TARGETS: Record<string, { adType: AdType; categories: string[]; uncertain?: string }> = {
  normal: { adType: "commercial-display", categories: [ALL] },
  personal: { adType: "classified-display", categories: ["obituary", "remembrance"], uncertain: "Personal rate applied to obituary and remembrance" },
  obituary: { adType: "classified-display", categories: ["obituary", "remembrance"] },
  matrimonial: { adType: "classified-display", categories: ["matrimonial"] },
  recruitment: { adType: "classified-display", categories: ["recruitment"] },
  financial: { adType: "classified-display", categories: ["business"], uncertain: "Financial rate applied to the Business category" },
  tender: { adType: "classified-display", categories: ["tender"] },
};

const r2 = (n: number) => Math.round(n * 100) / 100;
let uidSeq = 0;

function blank(paper: Newspaper, edition: string, category: string, adType: AdType, gst: boolean): ImportRow {
  return {
    uid: `imp${++uidSeq}`, include: true, source: "", flags: {},
    newspaper_name: paper.name, edition, category, ad_type: adType,
    base_rate: 0, extra_line_rate: 0, sq_cm_rate: 0, color_surcharge_percent: 0, color_sq_cm_rate: null, min_lines: null, min_sq_cm: null, cutoff_days: null, cutoff_time: null,
    gst_included: gst, bold_heading_rate: 0, tick_rate: 0, border_rate: 0,
  };
}

/**
 * Maps the extraction to rows of our pricing table. Anything that doesn't fit the schema (page premiums, tint and
 * underline percentages, combination packages) is returned in `notes` rather than guessed.
 */
export function mapExtraction(paper: Newspaper, ex: RateExtraction, opts: { wordsPerLine?: number } = {}): ImportMapping {
  const wpl = Math.max(1, opts.wordsPerLine ?? 4);
  const gst = ex.gstIncluded === true;
  const rows = new Map<string, ImportRow>();
  const notes: string[] = [];
  const unmapped = new Set<string>();
  const combos = new Map<string, { includes: string[]; gst_included: boolean; rates: { ad_type: AdType; category: string; sq_cm_rate: number; color_surcharge_percent: number; color_sq_cm_rate?: number | null; min_sq_cm?: number | null }[] }>();
  const extras: ImportExtra[] = [];
  let tint: number | null = null, underline: number | null = null, boxPct: number | null = null;
  const put = (edition: string, category: string, adType: AdType) => {
    const k = [edition, category, adType].join("|");
    let r = rows.get(k);
    if (!r) { r = blank(paper, edition, category, adType, gst); rows.set(k, r); }
    return r;
  };

  // Models sometimes emit one entry per column (B/W, then Colour): merge entries for the same edition + category.
  const merged = new Map<string, (typeof ex.displayRates)[number]>();
  for (const d of ex.displayRates) {
    const k = `${norm(d.edition)}|${norm(d.category)}`;
    const m = merged.get(k);
    if (!m) { merged.set(k, { ...d }); continue; }
    m.bw ??= d.bw; m.colour ??= d.colour; m.minSqCm ??= d.minSqCm; m.uncertain = m.uncertain || d.uncertain;
  }
  for (const d of merged.values()) {
    const t = DISPLAY_TARGETS[norm(d.category)];
    const ed = resolveEdition(paper, d.edition);
    if (ed.kind === "none") {
      // A combination package: usable only if the card lists its editions and every one is an edition of this paper.
      const decl = ex.editions.find((e) => e.kind === "combo" && norm(e.name) === norm(d.edition));
      const inc = (decl?.includes ?? []).map((n) => resolveEdition(paper, n));
      const incNames = inc.filter((x): x is { kind: "edition"; name: string } => x.kind === "edition").map((x) => x.name);
      if (!t || !decl || incNames.length < 2 || incNames.length !== inc.length) { unmapped.add(`Combo "${d.edition}": ${!decl?.includes?.length ? "the card doesn't list which editions it includes" : "includes editions that aren't in this app"}, so it can't be applied to a booking (not imported).`); continue; }
      const prev = combos.get(d.edition) ?? { includes: incNames, gst_included: gst, rates: [] as { ad_type: AdType; category: string; sq_cm_rate: number; color_surcharge_percent: number; color_sq_cm_rate?: number | null; min_sq_cm?: number | null }[] };
      for (const cat of t.categories) {
        if (!d.bw) continue;
        prev.rates = prev.rates.filter((r) => !(r.ad_type === t.adType && r.category === cat));
        prev.rates.push({ ad_type: t.adType, category: cat, sq_cm_rate: d.bw, color_surcharge_percent: d.bw && d.colour && d.colour >= d.bw ? r2((d.colour / d.bw - 1) * 100) : 0, color_sq_cm_rate: d.colour && d.bw && d.colour >= d.bw ? d.colour : null, min_sq_cm: d.minSqCm ?? null });
      }
      combos.set(d.edition, prev);
      continue;
    }
    if (!t) { unmapped.add(`Display rate "${d.categoryLabel ?? d.category}" has no matching category in this app (not imported).`); continue; }
    const edition = ed.kind === "all" ? ALL : ed.name;
    for (const cat of t.categories) {
      const r = put(edition, cat, t.adType);
      r.source = `Display · ${d.categoryLabel ?? d.category}`;
      r.sq_cm_rate = d.bw ?? 0;
      if (!d.bw) r.flags.sq_cm_rate = "missing";
      if (d.bw && d.colour && d.colour >= d.bw) {
        r.color_surcharge_percent = r2((d.colour / d.bw - 1) * 100); // display only; pricing uses the exact printed colour rate below
        r.color_sq_cm_rate = d.colour;
      } else if (d.colour && !d.bw) r.flags.color_sq_cm_rate = "missing";
      if (d.minSqCm) r.min_sq_cm = d.minSqCm;
      if (d.uncertain) { r.flags.sq_cm_rate ??= "uncertain"; }
      if (t.uncertain) { r.flags.sq_cm_rate ??= "uncertain"; unmapped.add(`${t.uncertain} (check the category).`); }
    }
  }

  const lang = paper.language.toLowerCase().startsWith("mal") ? "ml" : "en";
  const textRows = ex.classifiedText.filter((c) => !c.language || c.language === lang || c.language === "other");
  if (ex.classifiedText.length && textRows.length < ex.classifiedText.length) unmapped.add(`Classified rates in the other language were not imported (this app prices one language per publication: ${paper.language}).`);
  for (const c of textRows) {
    const ed = resolveEdition(paper, c.edition);
    if (ed.kind === "none") { unmapped.add(ed.reason); continue; }
    const edition = ed.kind === "all" ? ALL : ed.name;
    const r = put(edition, ALL, "classified-text");
    r.source = c.perLine ? "Classified · per line" : `Classified · per word × ${wpl} words/line`;
    const perLine = c.perLine ?? (c.perWord ? r2(c.perWord * wpl) : 0);
    const minLines = c.minLines ?? (c.minWords ? Math.max(1, Math.ceil(c.minWords / wpl)) : null);
    r.extra_line_rate = perLine;
    r.base_rate = perLine ? r2(perLine * (minLines ?? 1)) : 0;
    r.min_lines = minLines;
    if (!perLine) { r.flags.base_rate = "missing"; r.flags.extra_line_rate = "missing"; }
    else if (!c.perLine) { r.flags.base_rate = "uncertain"; r.flags.extra_line_rate = "uncertain"; r.flags.min_lines = c.minWords ? "uncertain" : undefined; }
    if (c.uncertain) { r.flags.base_rate ??= "uncertain"; }
    if (c.tintPercent) tint ??= c.tintPercent;
    if (c.underlinePercent) underline ??= c.underlinePercent;
  }
  const ad = ex.addons;
  if (ad) {
    for (const r of rows.values()) {
      if (r.ad_type !== "classified-text") continue;
      if (ad.boldPerLine) { r.bold_heading_rate = ad.boldPerLine; r.flags.bold_heading_rate = "uncertain"; }
      if (ad.boxFee) { r.border_rate = ad.boxFee; r.flags.border_rate = "uncertain"; }
    }
    if (ad.tintPercent) tint ??= ad.tintPercent;
    if (ad.underlinePercent) underline ??= ad.underlinePercent;
    if (ad.boxPercent && !ad.boxFee) boxPct = ad.boxPercent;
  }
  for (const r of rows.values()) Object.keys(r.flags).forEach((k) => r.flags[k as ImportField] === undefined && delete r.flags[k as ImportField]);

  for (const p of ex.pagePremiums) {
    if (!p.surchargePercent && !p.ratePerSqCm) { unmapped.add(`Page position "${p.position}": no printed percentage or per-sq-cm rate found (not imported).`); continue; }
    const pos = POSITION_IDS.find(([re]) => re.test(p.position));
    const id = pos?.[1] ?? slug(p.position), label = pos?.[2] ?? p.position;
    let edition: string | null = null;
    if (p.edition && !/^(all|any|null)$/i.test(p.edition.trim())) {
      const ed = resolveEdition(paper, p.edition);
      if (ed.kind === "edition") edition = ed.name; else if (ed.kind === "none") { unmapped.add(`Page position "${p.position}" for "${p.edition}": ${ed.reason}`); continue; }
    }
    extras.push({ uid: `imp${++uidSeq}`, include: true, kind: "page_premium", name: edition ? `${id}|${edition}` : id,
      label: `${label}${edition ? ` · ${edition}` : ""}`, source: "Page premium",
      data: { label, edition, percent: p.surchargePercent ?? null, rate_per_sq_cm: p.ratePerSqCm ?? null } });
  }
  for (const [name, c] of combos) extras.push({ uid: `imp${++uidSeq}`, include: true, kind: "combo", name, label: `${name} (${c.includes.join(" + ")})`, source: "Combo package", data: c });
  if (tint || underline || boxPct) extras.push({ uid: `imp${++uidSeq}`, include: true, kind: "addon", name: "classified", label: "Classified add-ons", source: "Classified", data: { tint_percent: tint, underline_percent: underline, box_percent: boxPct } });
  for (const e of ex.editions.filter((e) => e.kind && e.kind !== "single" && !combos.has(e.name))) {
    unmapped.add(`${e.kind === "any-n" ? "Any-N-editions tier" : "Combination"} "${e.name}"${e.count ? ` (${e.count})` : ""}: not imported (${e.kind === "any-n" ? "the calculator has no any-N tier pricing" : "no rate row or edition list it could be applied from"}).`);
  }
  notes.push(...ex.notes, ...unmapped);
  return { rows: [...rows.values()], extras, notes };
}

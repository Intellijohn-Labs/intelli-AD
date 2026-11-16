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

/** Prompt for the PDF extraction (shared by the API route and offline checks). Asks for compact JSON to keep the reply fast. */
export function buildExtractionPrompt(paperName: string, editionNames: string[]): string {
  return `You are extracting a newspaper advertising TARIFF / RATE CARD from the attached PDF into structured JSON. The publication is "${paperName}". Our system's edition names for it are: ${editionNames.join(", ")}.

Read every page, including multi-column tables and footnotes. Extract:
- editions: every individual edition, combination package (All Kerala, All India, Gulf / Overseas, Metros...) and "any N editions" tier.
- displayRates: display / classified-display prices PER SQUARE CM, by edition and category: Normal (general display), Personal / Obituary, Matrimonial, Recruitment, Financial, Tender / Notice. Give ONE object per edition + category, with both "bw" and "colour" filled in that same object (never one object per column).
- pagePremiums: Front page, Back page, Page 3, Page 5 / Business, Solus and similar position surcharges (percent, or per sq cm).
- classifiedText: per-word (or per-line) rates for Malayalam and English classifieds, minimum words / lines, bold / heading charge per line, box fee, background tint % and underline %.
- effectiveDate (ISO YYYY-MM-DD) if a date such as "w.e.f. 1 April 2024" appears, and whether rates include GST.

Rules:
- Copy numbers exactly as printed (rupees). NEVER guess or invent a number: omit a value that is absent, illegible or ambiguous, set "uncertain": true when you are not sure, and explain briefly in "notes".
- Use edition names exactly as printed (the app maps spelling variants such as Trivandrum / Thiruvananthapuram itself). Use "ALL" only when one rate truly applies to the whole card.
- Be COMPACT so the reply is quick: output minified JSON on a single line (no indentation or line breaks), omit any key whose value is null, empty or false, keep "notes" to at most 8 short entries, and add no commentary.
- Output ONLY one JSON object with this shape (every key optional except where you have data):
${EXTRACTION_SHAPE}`;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9ഀ-ൿ ]+/g, " ").replace(/\s+/g, " ").trim();
const ALIASES: Record<string, string> = {
  trivandrum: "thiruvananthapuram", tvm: "thiruvananthapuram", calicut: "kozhikode", cochin: "kochi", ernakulam: "kochi", trichur: "thrissur",
  cannanore: "kannur", quilon: "kollam", bangalore: "bengaluru", madras: "chennai", bombay: "mumbai", palghat: "palakkad", alleppey: "alappuzha",
};

export type ImportField = "base_rate" | "extra_line_rate" | "sq_cm_rate" | "color_surcharge_percent" | "min_lines" | "min_sq_cm" | "bold_heading_rate" | "border_rate";
export interface ImportRow extends RateRow {
  /** Stable client id for the review table. */
  uid: string;
  include: boolean;
  /** Where the numbers came from (shown next to the row). */
  source: string;
  /** Cells the admin should check: "missing" = needed but not found, "uncertain" = derived or flagged by the model. */
  flags: Partial<Record<ImportField, "missing" | "uncertain">>;
}

export interface ImportMapping { rows: ImportRow[]; notes: string[] }

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
    base_rate: 0, extra_line_rate: 0, sq_cm_rate: 0, color_surcharge_percent: 0, min_lines: null, min_sq_cm: null, cutoff_days: null, cutoff_time: null,
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
    if (ed.kind === "none") { unmapped.add(ed.reason); continue; }
    if (!t) { unmapped.add(`Display rate "${d.categoryLabel ?? d.category}" has no matching category in this app (not imported).`); continue; }
    const edition = ed.kind === "all" ? ALL : ed.name;
    for (const cat of t.categories) {
      const r = put(edition, cat, t.adType);
      r.source = `Display · ${d.categoryLabel ?? d.category}`;
      r.sq_cm_rate = d.bw ?? 0;
      if (!d.bw) r.flags.sq_cm_rate = "missing";
      if (d.bw && d.colour && d.colour >= d.bw) {
        r.color_surcharge_percent = r2((d.colour / d.bw - 1) * 100);
        r.flags.color_surcharge_percent = "uncertain"; // derived: colour ÷ B&W − 1
      } else if (d.colour && !d.bw) r.flags.color_surcharge_percent = "missing";
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
    if (c.boldHeadingPerLine) { r.bold_heading_rate = c.boldHeadingPerLine; r.flags.bold_heading_rate = "uncertain"; }
    if (c.boxFee) { r.border_rate = c.boxFee; r.flags.border_rate = "uncertain"; }
    if (c.uncertain) { r.flags.base_rate ??= "uncertain"; }
    if (c.tintPercent) unmapped.add(`Background tint +${c.tintPercent}% (not part of this app's pricing; set up separately if needed).`);
    if (c.underlinePercent) unmapped.add(`Underline +${c.underlinePercent}% (not part of this app's pricing).`);
  }
  for (const r of rows.values()) Object.keys(r.flags).forEach((k) => r.flags[k as ImportField] === undefined && delete r.flags[k as ImportField]);

  for (const p of ex.pagePremiums) {
    const amt = p.surchargePercent ? `+${p.surchargePercent}%` : p.ratePerSqCm ? `₹${p.ratePerSqCm}/cm²` : (p.text ?? "");
    unmapped.add(`Page premium · ${p.position}${p.edition ? ` (${p.edition})` : ""}: ${amt} (not part of this app's pricing).`);
  }
  for (const e of ex.editions.filter((e) => e.kind && e.kind !== "single")) {
    unmapped.add(`${e.kind === "any-n" ? "Any-N tier" : "Combination"} "${e.name}"${e.count ? ` (${e.count})` : ""}: not imported; bundle discounts use the publication's configured discount.`);
  }
  notes.push(...ex.notes, ...unmapped);
  return { rows: [...rows.values()], notes };
}

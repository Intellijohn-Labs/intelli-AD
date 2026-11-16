/**
 * Rate card PDF import: the shape the AI extracts from a tariff PDF, and the deterministic mapping from that
 * extraction to rows of our pricing table (`publication_rates`). Client-safe (no server imports).
 */
import { z } from "zod";
import type { AdType, Newspaper } from "./types";
import { ALL, indianEditionNames, keralaEditionNames, outsideKeralaEditionNames, overseasEditionNames, type ComboRate, type RateRow } from "./rates";

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
  pagePremiums: z.array(z.object({ position: z.string(), edition: str, surchargePercent: num, ratePerSqCm: num, colourRatePerSqCm: num, text: str })).default([]),
  addons: z.object({ boldPerLine: num, boxFee: num, boxPercent: num, tintPercent: num, underlinePercent: num, highlighter: z.array(z.object({ min: num, max: num, fee: num })).nullable().optional() }).nullable().optional(),
  classifiedText: z.array(z.object({
    edition: z.string().default("ALL"),
    language: str,
    perWord: num, perLine: num, minWords: num, minLines: num,
    engPerWord: num, capsPerWord: num, headingPerLine: num, engHeadingPerLine: num, baseAmount: num,
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
 * Compact reply formats requested from the model (arrays and short keys, so a pass is ~1–3k tokens and can't run
 * out of room mid-JSON). `expandCompact` turns a reply back into a RateExtraction; `mergeExtractions` joins the passes.
 * The tariff is read in TWO parallel passes so no page is skipped: A = display / editions / page positions / combos,
 * B = classified text (per word and per line), slabs and add-on rules.
 */
export type ExtractionPass = "A" | "B";
const COMPACT_A = `{
 "date": "YYYY-MM-DD",          // effective date (omit if not printed)
 "gst": 1 | 0,                  // 1 only if the card says rates INCLUDE GST
 "conf": 0.0-1.0,               // overall confidence
 "n": ["short note", ...],      // at most 8 notes: ambiguity, illegible values, things not captured by the tables
 "e": [ ["Edition / package name as printed", "s|c|n", count, ["included edition", ...]] ],   // s = single edition, c = combination package (list its included editions ONLY if printed), n = "any N editions" slab
 "t": [ { "ti": "table title as printed", "h": ["column header EXACTLY as printed, including B&W / CLR", ...], "r": [ ["row label as printed", value1, value2, ...] ] } ],
 "d": [ ["Edition / package as printed, or ALL", "normal|personal|financial|recruitment|tender|matrimonial|realestate|education|other", bw, colour, minSqCm, uncertain] ],   // per-sq-cm rates printed OUTSIDE tables (sentences); never repeat a table
 "p": [ ["Position as printed", "Edition / package as printed, or null", percent, bwPerSqCm, colourPerSqCm] ]   // page positions printed OUTSIDE tables, e.g. "Front page +50%" or "Solus Rs 900 per sq cm"; never repeat a table column
}
"t" is a VERBATIM copy of each per-sq-cm table: "h" lists every value column header left to right (NOT the row-label column); each row in "r" starts with its label and then has exactly one entry per header, in the same order, with null where the cell is blank. Section rows ("Inside Kerala Editions") have all-null values.`;
const COMPACT_B = `{
 "n": ["short note", ...],      // at most 8 notes: ambiguity, illegible values, things not captured by the tables
 "t": [ { "ti": "table title as printed", "h": ["column header EXACTLY as printed", ...], "r": [ ["row label as printed", value1, value2, ...] ] } ],
 "c": [ ["Edition / package / slab label as printed, or ALL when one rate covers every edition", "ml|en", perWord, perLine, minWords, minLines, uncertain, engOrdinaryPerWord, engCapsPerWord, headingPerLine, engBoldCapsHeadingPerLine] ],   // classified-text rates printed OUTSIDE tables (sentences such as "Rs 45 per word, minimum 10 words"); never repeat a table
 "a": { "boldPerLine": rupees, "boxFee": rupees, "boxPercent": percent, "tintPercent": percent, "underlinePercent": percent, "hl": [[minEditions, maxEditions|null, rupees], ...] }   // add-on charges exactly as printed (omit any not printed). hl = highlighter-symbol fee by number of editions
}
"t" is a VERBATIM copy of each classified-text tariff table (including the "Combinations" / slab tables): "h" lists every value column header left to right (NOT the row-label column); each row in "r" starts with its label and then has exactly one entry per header, in order, null where blank.`;

/** System prompt: strict grounding. The model must never produce a number that is not printed in the PDF. */
export const EXTRACTION_SYSTEM = `You are a meticulous data-entry clerk transcribing a newspaper advertising tariff (rate card) PDF into JSON.
GROUNDING RULES (absolute):
1. Extract ONLY exact numbers that are explicitly printed in the PDF. Never guess, estimate, round, average, interpolate, extrapolate, convert or invent any number, and never use general knowledge of what newspapers usually charge.
2. If a rate, percentage, edition, date or minimum is not explicitly printed in the PDF, output null for it (or omit the row). A blank cell in the PDF is null, not 0.
3. Copy edition names and labels exactly as printed. Do not add editions or packages that are not printed.
4. If a figure is hard to read or two readings are possible, output null and add a short note; use the uncertain flag when you are not sure.
5. Do not compute totals, differences or percentages yourself; transcribe what is printed (rupee rates as printed, percentages as printed).
6. Read EVERY page, table, box and footnote of the PDF. Wide tables have many columns: capture every column. Never stop after the first table.
Return ONLY the JSON requested, with no commentary.`;

/** User prompt for one extraction pass (shared by the API route and offline checks). */
export function buildExtractionPrompt(paperName: string, editionNames: string[], pass: ExtractionPass = "A"): string {
  const head = `Transcribe part of the attached tariff for "${paperName}" into JSON. Our system's names for its editions are: ${editionNames.join(", ")} (the app maps spelling variants such as Trivandrum / Thiruvananthapuram itself, so keep the printed spelling).`;
  if (pass === "A") return `${head}

THIS PASS: every DISPLAY and CLASSIFIED-DISPLAY table (prices per square cm or per column cm), from every page. Ignore per-word / per-line classified text tables (another pass reads them).
- t: copy EACH such table verbatim as described below (one "t" entry per table). Keep every row (individual editions, All Kerala, All India, Outside Kerala, Gulf / Overseas, Mumbai + Bangalore + Chennai + Delhi, "Add on rate for ...", combination and "any N editions" rows) and EVERY column, including page-position columns (Front Page, Back Page, Page 3, Page 5 / Business, Night News Page, Solus) and Commercial / Financial / Personal / Avasarangal / Tender / Real Estate columns, B&W and CLR/colour. Double-check that every value sits under the header it is printed under; do not shift columns.
- p / d: ONLY for page-position or per-sq-cm rates written outside the tables (for example a sentence "Front page +50%, Back page +40%").
- e: the combination packages / slabs named in those tables.
- date and gst as described.

Output ONLY minified JSON on a single line (no markdown) in exactly this shape:
${COMPACT_A}`;
  return `${head}

THIS PASS: every CLASSIFIED TEXT tariff (charged per WORD or per LINE), including multi-edition combination / slab tables, plus the add-on rules, from every page, box and footnote. Ignore per-sq-cm display tables (another pass reads them).
- t: copy EACH classified-text table verbatim (one "t" entry per table, including the "Combinations" table: Any 2 Editions ... More than 11 Indian Editions). Keep every row label exactly as printed ("Any other Edition within Kerala", "All Kerala", "Kottayam Edition only", "Any 3 Outside Kerala Indian Editions", ...) and every column (local-language per word, per line / extra line, minimum words or lines, English ordinary per word, English caps per word, heading per line ...).
- c: ONLY for classified-text rates written outside tables (for example "Rs 45 per word, minimum 10 words"); use ALL as the label when one rate covers every edition.
- a: add-ons exactly as printed (also when written as a sentence, e.g. "Bold/heading Rs 60 per line extra. Box +25%"): underline %, background colour / tint / shading %, box number fee (rupees or %), bold / caps surcharge per line, highlighter symbol fees by number of editions.

Output ONLY minified JSON on a single line (no markdown) in exactly this shape:
${COMPACT_B}`;
}

type Cell = string | number | null | undefined | unknown[];
const cn = (v: Cell): number | null => { const n = Array.isArray(v) ? null : typeof v === "string" ? Number(v.replace(/[₹,%\s]/g, "")) : v; return typeof n === "number" && Number.isFinite(n) ? n : null; };
const cs = (v: Cell): string => (v == null ? "" : String(v));

type Tbl = { title: string; h: string[]; r: Cell[][] };
const DISPLAY_CATS: [RegExp, string][] = [
  [/commercial|normal|general|\bdisplay\b/, "normal"], [/financial|finance/, "financial"], [/personal|obituar|remembrance|condolence/, "personal"],
  [/avasarang|padavukal|recruit|appointment|situation|career|\bjobs?\b/, "recruitment"], [/tender|notice|public/, "tender"],
  [/matrimon/, "matrimonial"], [/real estate|property|realty/, "realestate"], [/educat/, "education"],
];
const POSITION_HDR = /front|back page|page\s*[1-9]\b|business|night|solus|semi.?solus/;

/**
 * Reads verbatim tables (headers + rows) deterministically: each column header is classified (category / page position
 * / per-word / per-line, B&W vs colour) here, in code, so the AI only has to copy numbers under their printed headers.
 */
function interpretTables(tables: Tbl[], notes: string[]) {
  const displayRates: unknown[] = [], pagePremiums: unknown[] = [], classifiedText: unknown[] = [];
  for (const t of tables) {
    const cols = t.h.map((h) => {
      const raw = cs(h);
      const s = raw.toLowerCase().replace(/[#@*₹()]/g, " ").replace(/\s+/g, " ").trim();
      const tone: "bw" | "clr" | null = /\b(clr|colou?r|multi.?colou?r)\b/.test(s) ? "clr" : /b\s*&\s*w|\bbw\b|b\/w|black|mono/.test(s) ? "bw" : null;
      const label = raw.replace(/[#@*]/g, "").replace(/\b(b\s*&\s*w|bw|clr|colou?r)\b/gi, "").replace(/\s+/g, " ").trim();
      if (/per word|word rate|\bword\b/.test(s)) return { kind: "word" as const, s, raw, label, tone, caps: /caps|capital/.test(s), eng: /\beng/.test(s) };
      if (/head/.test(s) && /line/.test(s)) return { kind: "heading" as const, s, raw, label, tone, eng: /\beng/.test(s) };
      if (/min.*word/.test(s)) return { kind: "minwords" as const, s, raw, label, tone };
      if (/min.*line/.test(s)) return { kind: "minlines" as const, s, raw, label, tone };
      if (/base|min.*(charge|amount)/.test(s) && !/sq|cm/.test(s)) return { kind: "base" as const, s, raw, label, tone };
      if (/per line|extra line|additional line|\bline\b/.test(s)) return { kind: "line" as const, s, raw, label, tone };
      if (POSITION_HDR.test(s)) return { kind: "position" as const, s, raw, label, tone };
      const cat = DISPLAY_CATS.find(([re]) => re.test(s))?.[1];
      if (cat) return { kind: "category" as const, s, raw, label, tone, cat };
      return { kind: "unknown" as const, s, raw, label, tone };
    });
    const unknown = cols.filter((c) => c.kind === "unknown").map((c) => c.raw);
    if (unknown.length) notes.push(`Table "${t.title}": column${unknown.length > 1 ? "s" : ""} ${unknown.map((u) => `"${u}"`).join(", ")} not recognised, so ${unknown.length > 1 ? "they were" : "it was"} not imported.`);
    for (const row of t.r) {
      const label = cs(row[0]).trim();
      const vals = cols.map((_, i) => cn(row[i + 1]));
      if (!label || vals.every((v) => v == null)) continue; // section header rows
      const cat = new Map<string, { label: string; bw: number | null; clr: number | null }>();
      const pos = new Map<string, { bw: number | null; clr: number | null }>();
      const txt: Record<string, number | null> = {};
      cols.forEach((c, i) => {
        const v = vals[i];
        if (v == null) return;
        if (c.kind === "category") { const e = cat.get(c.cat) ?? { label: c.label, bw: null, clr: null }; if (c.tone === "clr") e.clr = v; else e.bw = v; cat.set(c.cat, e); }
        else if (c.kind === "position") { const e = pos.get(c.label) ?? { bw: null, clr: null }; if (c.tone === "clr") e.clr = v; else e.bw = v; pos.set(c.label, e); }
        else if (c.kind === "word") txt[c.caps ? "caps" : c.eng ? "engWord" : "word"] ??= v;
        else if (c.kind === "heading") txt[c.eng ? "engHeading" : "heading"] ??= v;
        else if (c.kind === "minwords") txt.minWords = v;
        else if (c.kind === "minlines") txt.minLines = v;
        else if (c.kind === "base") txt.base = v;
        else if (c.kind === "line") txt.line ??= v;
      });
      for (const [k, e] of cat) displayRates.push({ edition: label, category: k, categoryLabel: e.label, bw: e.bw, colour: e.clr, minSqCm: null, uncertain: false });
      for (const [k, e] of pos) { if (e.bw == null) { if (e.clr != null) notes.push(`Page position "${k}" for "${label}": only a colour rate is printed, so it was not imported.`); continue; } pagePremiums.push({ position: k, edition: label, surchargePercent: null, ratePerSqCm: e.bw, colourRatePerSqCm: e.clr, text: null }); }
      if (Object.keys(txt).length) classifiedText.push({ edition: label, language: null, perWord: txt.word ?? null, perLine: txt.line ?? null, minWords: txt.minWords ?? null, minLines: txt.minLines ?? null, engPerWord: txt.engWord ?? null, capsPerWord: txt.caps ?? null, headingPerLine: txt.heading ?? null, engHeadingPerLine: txt.engHeading ?? null, baseAmount: txt.base ?? null, uncertain: false });
    }
  }
  return { displayRates, pagePremiums, classifiedText };
}

/** Turns the compact reply into a RateExtraction. Also accepts the long format (displayRates / classifiedText...). */
export function expandCompact(raw: unknown): RateExtraction {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!("d" in o || "c" in o || "p" in o || "e" in o) && ("displayRates" in o || "classifiedText" in o)) return extractionSchema.parse(o);
  const rows = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter(Array.isArray) as Cell[][] : []);
  const kind = (v: Cell) => (cs(v).toLowerCase().startsWith("c") ? "combo" : cs(v).toLowerCase().startsWith("n") ? "any-n" : "single");
  const lang = (v: Cell) => (/^e/i.test(cs(v)) ? "en" : /^m/i.test(cs(v)) ? "ml" : "other");
  const tables: Tbl[] = (Array.isArray(o.t) ? (o.t as unknown[]) : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object").map((x) => ({ title: cs(x.ti as Cell), h: Array.isArray(x.h) ? (x.h as Cell[]).map(cs) : [], r: Array.isArray(x.r) ? (x.r as unknown[]).filter(Array.isArray) as Cell[][] : [] }));
  const tNotes: string[] = [];
  const fromTables = interpretTables(tables, tNotes);
  return extractionSchema.parse({
    effectiveDate: typeof o.date === "string" ? o.date : null,
    gstIncluded: o.gst == null ? null : o.gst === 1 || o.gst === true || o.gst === "1",
    confidence: cn(o.conf as Cell),
    notes: [...(Array.isArray(o.n) ? (o.n as unknown[]).map(String).slice(0, 12) : []), ...tNotes],
    editions: rows("e").map((r) => ({ name: cs(r[0]), kind: kind(r[1]), count: cn(r[2]), includes: Array.isArray(r[3]) ? (r[3] as unknown[]).map(String) : null })),
    displayRates: [...fromTables.displayRates, ...rows("d").map((r) => ({ edition: cs(r[0]) || "ALL", category: cs(r[1]).toLowerCase() || "normal", categoryLabel: cs(r[1]), bw: cn(r[2]), colour: cn(r[3]), minSqCm: cn(r[4]), uncertain: r[5] === 1 || r[5] === "1" }))],
    pagePremiums: [...fromTables.pagePremiums, ...rows("p").map((r) => ({ position: cs(r[0]), edition: cs(r[1]) || null, surchargePercent: cn(r[2]), ratePerSqCm: cn(r[3]), colourRatePerSqCm: cn(r[4]), text: null }))],
    classifiedText: [...fromTables.classifiedText, ...rows("c").map((r) => ({ edition: cs(r[0]) || "ALL", language: lang(r[1]), perWord: cn(r[2]), perLine: cn(r[3]), minWords: cn(r[4]), minLines: cn(r[5]), uncertain: r[6] === 1 || r[6] === "1", engPerWord: cn(r[7]), capsPerWord: cn(r[8]), headingPerLine: cn(r[9]), engHeadingPerLine: cn(r[10]) }))],
    addons: o.a && typeof o.a === "object" ? { boldPerLine: cn((o.a as Record<string, Cell>).boldPerLine), boxFee: cn((o.a as Record<string, Cell>).boxFee), boxPercent: cn((o.a as Record<string, Cell>).boxPercent), tintPercent: cn((o.a as Record<string, Cell>).tintPercent), underlinePercent: cn((o.a as Record<string, Cell>).underlinePercent), highlighter: Array.isArray((o.a as Record<string, unknown>).hl) ? ((o.a as Record<string, unknown[]>).hl).filter(Array.isArray).map((h) => ({ min: cn((h as Cell[])[0]), max: cn((h as Cell[])[1]), fee: cn((h as Cell[])[2]) })) : null } : null,
  });
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9ഀ-ൿ ]+/g, " ").replace(/\s+/g, " ").trim();
const ALIASES: Record<string, string> = {
  trivandrum: "thiruvananthapuram", tvm: "thiruvananthapuram", calicut: "kozhikode", cochin: "kochi", ernakulam: "kochi", trichur: "thrissur",
  cannanore: "kannur", quilon: "kollam", bangalore: "bengaluru", madras: "chennai", bombay: "mumbai", palghat: "palakkad", alleppey: "alappuzha", alapuzha: "alappuzha",
  allappuzha: "alappuzha", pathanamthita: "pathanamthitta", malapuram: "malappuram",
};

/** Joins the two parallel extraction passes (A = display / positions / combos, B = classified text / slabs / add-ons). */
export function mergeExtractions(a: RateExtraction, b: RateExtraction): RateExtraction {
  const addons = { ...(a.addons ?? {}), ...Object.fromEntries(Object.entries(b.addons ?? {}).filter(([, v]) => v != null)) };
  return {
    publication: a.publication ?? b.publication ?? null,
    effectiveDate: a.effectiveDate ?? b.effectiveDate ?? null,
    gstIncluded: a.gstIncluded ?? b.gstIncluded ?? null,
    confidence: a.confidence != null && b.confidence != null ? Math.min(a.confidence, b.confidence) : a.confidence ?? b.confidence ?? null,
    notes: [...new Set([...a.notes, ...b.notes])],
    editions: [...a.editions, ...b.editions.filter((e) => !a.editions.some((x) => norm(x.name) === norm(e.name)))],
    displayRates: [...a.displayRates, ...b.displayRates],
    pagePremiums: [...a.pagePremiums, ...b.pagePremiums],
    addons: Object.keys(addons).length ? addons : null,
    classifiedText: [...a.classifiedText, ...b.classifiedText],
  };
}

export type ImportField = "base_rate" | "extra_line_rate" | "sq_cm_rate" | "color_surcharge_percent" | "color_sq_cm_rate" | "min_lines" | "min_sq_cm" | "bold_heading_rate" | "border_rate" | "word_rate" | "eng_word_rate" | "caps_word_rate" | "heading_line_rate" | "min_words";
export interface ImportRow extends RateRow {
  /** Stable client id for the review table. */
  uid: string;
  include: boolean;
  /** Where the numbers came from (shown next to the row). */
  source: string;
  /** Cells the admin should check: "missing" = needed but not found, "uncertain" = derived or flagged by the model. */
  flags: Partial<Record<ImportField, "missing" | "uncertain">>;
}



/** A non-row tariff item to save with the import: page premium, combo package / slab, or add-on rules. */
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
  [/night/i, "night", "Night News page"],
  [/semi.?solus/i, "semisolus", "Semi-solus"],
  [/solus/i, "solus", "Solus"],
];
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "position";
/** "Page 3/ Back Page" is one printed column that serves two positions. */
function positionIds(text: string): [string, string][] {
  const out = new Map<string, string>();
  for (const seg of text.split(/\/|&|,|\band\b/i)) {
    const hit = POSITION_IDS.find(([re]) => re.test(seg));
    if (hit) out.set(hit[1], hit[2]); else if (seg.trim()) out.set(slug(seg), seg.trim());
  }
  return [...out];
}

type Tier = { min: number; max: number; scope: "any" | "kerala" | "outside-kerala" | "india" };
type Target =
  | { kind: "edition"; name: string }
  | { kind: "all" }
  | { kind: "group"; includes: string[] }
  | { kind: "tier"; tier: Tier }
  | { kind: "other-kerala" }
  | { kind: "none"; reason: string };

const keralaOf = keralaEditionNames, overseasOf = overseasEditionNames, outsideOf = outsideKeralaEditionNames, indiaOf = indianEditionNames;

function resolveEditionName(paper: Newspaper, raw: string): string | null {
  const n = norm(raw).replace(/\b(editions?|edns?|only)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return null;
  const alias = ALIASES[n] ?? n;
  return paper.editions.find((e) => norm(e.name) === alias || norm(e.name) === n)?.name ?? null;
}

/**
 * Turns a printed row label into what it means for THIS publication: one edition, every edition, a package whose members
 * follow from its name ("All Kerala", "All India", "A + B + C"), a count slab ("Any 3 Editions") or "Any other edition within Kerala".
 */
function resolveLabel(paper: Newspaper, raw: string): Target {
  const n = norm(raw);
  if (!n || n === "all" || n === "any") return { kind: "all" };
  let m: RegExpMatchArray | null;
  const scopeOf = (t: string): Tier["scope"] => (t.includes("outside kerala") ? "outside-kerala" : t.includes("indian") ? "india" : t.includes("kerala") ? "kerala" : "any");
  if ((m = n.match(/^any (\d+)(?: (\d+))?(?: outside kerala)?(?: indian)? (?:editions?|edns?)$/))) return { kind: "tier", tier: { min: +m[1], max: +(m[2] ?? m[1]), scope: scopeOf(n) } };
  if ((m = n.match(/^all (\d+) (?:outside kerala )?(?:indian )?(?:editions?|edns?)$/))) return { kind: "tier", tier: { min: +m[1], max: +m[1], scope: scopeOf(n) } };
  if ((m = n.match(/^more than (\d+) (?:indian )?(?:editions?|edns?)$/))) return { kind: "tier", tier: { min: +m[1] + 1, max: 999, scope: scopeOf(n) } };
  if (/other (?:editions?|edns?)? ?(?:within|in) kerala|rest of kerala|other kerala/.test(n)) return { kind: "other-kerala" };
  const grp = (names: string[], what: string): Target => names.length >= 2 ? { kind: "group", includes: names } : { kind: "none", reason: `"${raw}" means ${what}, which this app doesn't have as separate editions.` };
  if (/^all kerala (?:editions?|edns?)?\s*(?:overseas|gulf)/.test(n) || /^all kerala overseas/.test(n)) { const o = overseasOf(paper); return o.length ? grp([...keralaOf(paper), ...o], "Kerala + overseas") : { kind: "none", reason: `"${raw}" includes overseas editions, which this app doesn't have.` }; }
  if (/^all (?:editions?|edns?).*(?:india.*overseas|overseas.*india)/.test(n)) return overseasOf(paper).length ? grp(paper.editions.map((e) => e.name), "all editions") : { kind: "none", reason: `"${raw}" includes overseas editions, which this app doesn't have.` };
  if (/^all india/.test(n)) return grp(indiaOf(paper), "all Indian editions");
  if (/^all kerala/.test(n)) return grp(keralaOf(paper), "all Kerala editions");
  if (/^(?:all )?(?:outside kerala|metros?)(?: .*)?$/.test(n) && !/\d/.test(n)) return grp(outsideOf(paper), "the outside-Kerala editions");
  if (/^(?:overseas|gulf)(?: (?:editions?|edns?))?(?: only)?$/.test(n)) { const o = overseasOf(paper); return o.length === 1 ? { kind: "edition", name: o[0] } : o.length ? { kind: "group", includes: o } : { kind: "none", reason: `"${raw}" is an overseas edition, which this app doesn't have.` }; }
  if (/\+/.test(raw)) {
    const parts = raw.split("+").map((x) => resolveEditionName(paper, x));
    if (parts.every(Boolean) && parts.length >= 2) return { kind: "group", includes: parts as string[] };
    return { kind: "none", reason: `"${raw}" lists editions that aren't all in this app.` };
  }
  const one = resolveEditionName(paper, raw);
  if (one) return { kind: "edition", name: one };
  if (/^add on|add-on/.test(n)) return { kind: "none", reason: `"${raw}" is an add-on rate (not a bookable edition); not imported.` };
  return { kind: "none", reason: `"${raw}" is not one of ${paper.name}'s editions in this app.` };
}

const DISPLAY_TARGETS: Record<string, { adType: AdType; categories: string[]; uncertain?: string }> = {
  normal: { adType: "commercial-display", categories: [ALL] },
  commercial: { adType: "commercial-display", categories: [ALL] },
  personal: { adType: "classified-display", categories: ["obituary", "remembrance"], uncertain: "Personal rate applied to obituary and remembrance" },
  obituary: { adType: "classified-display", categories: ["obituary", "remembrance"] },
  matrimonial: { adType: "classified-display", categories: ["matrimonial"] },
  recruitment: { adType: "classified-display", categories: ["recruitment"] },
  financial: { adType: "classified-display", categories: ["business"], uncertain: "Financial rate applied to the Business category" },
  tender: { adType: "classified-display", categories: ["tender", "public-notice"] },
  realestate: { adType: "classified-display", categories: ["property"] },
  "real estate": { adType: "classified-display", categories: ["property"] },
};

const r2 = (n: number) => Math.round(n * 100) / 100;
let uidSeq = 0;

function blank(paper: Newspaper, edition: string, category: string, adType: AdType, gst: boolean): ImportRow {
  return {
    uid: `imp${++uidSeq}`, include: true, source: "", flags: {},
    newspaper_name: paper.name, edition, category, ad_type: adType,
    base_rate: 0, extra_line_rate: 0, sq_cm_rate: 0, color_surcharge_percent: 0, color_sq_cm_rate: null,
    word_rate: null, eng_word_rate: null, caps_word_rate: null, heading_line_rate: null, min_words: null,
    min_lines: null, min_sq_cm: null, cutoff_days: null, cutoff_time: null,
    gst_included: gst, bold_heading_rate: 0, tick_rate: 0, border_rate: 0,
  };
}

type ComboAcc = { includes: string[]; tier?: Tier; gst_included: boolean; rates: ComboRate[] };

/**
 * Maps the extraction to rows of our pricing table and to extras (page premiums, combo packages / slabs, add-on rules).
 * Anything that doesn't fit is returned in `notes` rather than guessed. Group labels ("Any other Edition within Kerala",
 * "All Kerala", "Any 3 Editions") are expanded deterministically from this publication's own edition list.
 */
export function mapExtraction(paper: Newspaper, ex: RateExtraction, _opts: { wordsPerLine?: number } = {}): ImportMapping {
  const gst = ex.gstIncluded === true;
  const rows = new Map<string, ImportRow>();
  const notes: string[] = [];
  const unmapped = new Set<string>();
  const combos = new Map<string, ComboAcc>();
  const extras: ImportExtra[] = [];
  let tint: number | null = null, underline: number | null = null, boxPct: number | null = null, boxFee: number | null = null;
  const put = (edition: string, category: string, adType: AdType) => {
    const k = [edition, category, adType].join("|");
    let r = rows.get(k);
    if (!r) { r = blank(paper, edition, category, adType, gst); rows.set(k, r); }
    return r;
  };
  const comboName = new Map<string, string>(); // printed label → canonical package name (same member list = same package)
  const combo = (label: string, t: Extract<Target, { kind: "group" | "tier" }>) => {
    if (t.kind === "group") {
      // The same printed package appears in several tables under slightly different spellings ("All Edns" / "All Editions"): merge those.
      const key = (x: string) => norm(x).replace(/\b(edns?|editions?)\b/g, "ed");
      const same = [...combos].find(([name]) => key(name) === key(label));
      if (same) { comboName.set(label, same[0]); return same[1]; }
    }
    comboName.set(label, label);
    let c = combos.get(label);
    if (!c) { c = { includes: t.kind === "group" ? t.includes : [], tier: t.kind === "tier" ? t.tier : undefined, gst_included: gst, rates: [] }; combos.set(label, c); }
    return c;
  };
  const setRate = (c: ComboAcc, rate: ComboRate) => { c.rates = c.rates.filter((x) => !(x.ad_type === rate.ad_type && x.category === rate.category)); c.rates.push(rate); };

  // ── Display / classified display ──
  // Models sometimes emit one entry per column (B/W, then Colour): merge entries for the same edition + category.
  const merged = new Map<string, (typeof ex.displayRates)[number]>();
  for (const d of ex.displayRates) {
    const k = `${norm(d.edition)}|${norm(d.category)}`;
    const m = merged.get(k);
    if (!m) { merged.set(k, { ...d }); continue; }
    m.bw ??= d.bw; m.colour ??= d.colour; m.minSqCm ??= d.minSqCm; m.uncertain = m.uncertain || d.uncertain;
  }
  const otherKeralaDisplay: { d: (typeof ex.displayRates)[number]; t: NonNullable<(typeof DISPLAY_TARGETS)[string]> }[] = [];
  for (const d of merged.values()) {
    const t = DISPLAY_TARGETS[norm(d.category)];
    if (!t) { unmapped.add(`Display rate "${d.categoryLabel ?? d.category}" has no matching category in this app (not imported).`); continue; }
    const tg = resolveLabel(paper, d.edition);
    if (tg.kind === "none") { unmapped.add(tg.reason); continue; }
    if (tg.kind === "other-kerala") { otherKeralaDisplay.push({ d, t }); continue; }
    if (tg.kind === "group" || tg.kind === "tier") {
      if (!d.bw) continue;
      const c = combo(d.edition, tg);
      for (const cat of t.categories) setRate(c, { ad_type: t.adType, category: cat, sq_cm_rate: d.bw, color_surcharge_percent: d.colour && d.colour >= d.bw ? r2((d.colour / d.bw - 1) * 100) : 0, color_sq_cm_rate: d.colour && d.colour >= d.bw ? d.colour : null, min_sq_cm: d.minSqCm ?? null });
      continue;
    }
    const edition = tg.kind === "all" ? ALL : tg.name;
    for (const cat of t.categories) fillDisplay(put(edition, cat, t.adType), d, t);
  }
  function fillDisplay(r: ImportRow, d: (typeof ex.displayRates)[number], t: (typeof DISPLAY_TARGETS)[string]) {
    r.source = `Display · ${d.categoryLabel ?? d.category}`;
    r.sq_cm_rate = d.bw ?? 0;
    if (!d.bw) r.flags.sq_cm_rate = "missing";
    if (d.bw && d.colour && d.colour >= d.bw) {
      r.color_surcharge_percent = r2((d.colour / d.bw - 1) * 100); // informational; pricing uses the exact printed colour rate
      r.color_sq_cm_rate = d.colour;
    } else if (d.colour && !d.bw) r.flags.color_sq_cm_rate = "missing";
    if (d.minSqCm) r.min_sq_cm = d.minSqCm;
    if (d.uncertain) r.flags.sq_cm_rate ??= "uncertain";
    if (t.uncertain) { r.flags.sq_cm_rate ??= "uncertain"; unmapped.add(`${t.uncertain} (check the category).`); }
  }
  for (const { d, t } of otherKeralaDisplay) {
    for (const name of keralaOf(paper)) for (const cat of t.categories) {
      if (rows.has([name, cat, t.adType].join("|"))) continue; // an explicit row for that edition wins
      const r = put(name, cat, t.adType); fillDisplay(r, d, t); r.flags.sq_cm_rate ??= "uncertain";
      r.source += ` (from "${d.edition}")`;
    }
  }

  // ── Classified text: per word and per line ──
  const lang = paper.language.toLowerCase().startsWith("mal") ? "ml" : "en";
  const textRows = ex.classifiedText.filter((c) => !c.language || c.language === lang || c.language === "other");
  if (ex.classifiedText.length && textRows.length < ex.classifiedText.length) unmapped.add(`Classified rates in the other language were not imported (this app prices one language per publication: ${paper.language}).`);
  const fillText = (r: ImportRow, c: (typeof textRows)[number]) => {
    const word = c.perWord ?? c.engPerWord ?? null;
    if (word) {
      r.source = "Classified · per word";
      r.word_rate = word;
      r.eng_word_rate = c.engPerWord ?? null;
      r.caps_word_rate = c.capsPerWord ?? null;
      r.heading_line_rate = c.headingPerLine ?? c.engHeadingPerLine ?? null;
      r.min_words = c.minWords ? Math.round(c.minWords) : null;
      if (c.headingPerLine && c.engHeadingPerLine && c.headingPerLine !== c.engHeadingPerLine) unmapped.add(`"${c.edition}": the English heading rate (₹${c.engHeadingPerLine}) differs from the local-language heading rate (₹${c.headingPerLine}); only the latter is used.`);
      if (c.uncertain) r.flags.word_rate = "uncertain";
    } else if (c.perLine) {
      r.source = "Classified · per line";
      r.extra_line_rate = c.perLine;
      r.min_lines = c.minLines ?? null;
      r.base_rate = c.baseAmount ?? r2(c.perLine * (c.minLines ?? 1));
      if (c.uncertain) r.flags.base_rate = "uncertain";
    } else { r.flags.word_rate = "missing"; }
    if (c.tintPercent) tint ??= c.tintPercent;
    if (c.underlinePercent) underline ??= c.underlinePercent;
  };
  const otherKeralaText: (typeof textRows)[number][] = [];
  for (const c of textRows) {
    const tg = resolveLabel(paper, c.edition);
    if (tg.kind === "none") { unmapped.add(tg.reason); continue; }
    if (tg.kind === "other-kerala") { otherKeralaText.push(c); continue; }
    if (tg.kind === "group" || tg.kind === "tier") {
      const word = c.perWord ?? c.engPerWord ?? null;
      if (!word && !c.perLine) continue;
      setRate(combo(c.edition, tg), {
        ad_type: "classified-text", category: ALL, sq_cm_rate: 0, color_surcharge_percent: 0,
        word_rate: word, eng_word_rate: c.engPerWord ?? null, caps_word_rate: c.capsPerWord ?? null, heading_line_rate: c.headingPerLine ?? c.engHeadingPerLine ?? null, min_words: c.minWords ? Math.round(c.minWords) : null,
        ...(!word && c.perLine ? { base_rate: r2(c.perLine * (c.minLines ?? 1)), extra_line_rate: c.perLine, min_lines: c.minLines ?? null } : {}),
      });
      continue;
    }
    fillText(put(tg.kind === "all" ? ALL : tg.name, ALL, "classified-text"), c);
  }
  for (const c of otherKeralaText) {
    for (const name of keralaOf(paper)) {
      if (rows.has([name, ALL, "classified-text"].join("|"))) continue;
      const r = put(name, ALL, "classified-text"); fillText(r, c);
      r.source += ` (from "${c.edition}")`;
    }
  }

  // ── Add-on rules ──
  const ad = ex.addons;
  let highlighter: { min: number; max: number | null; fee: number }[] | null = null;
  if (ad) {
    for (const r of rows.values()) {
      if (r.ad_type !== "classified-text") continue;
      if (r.word_rate) { if (ad.boldPerLine && !r.heading_line_rate) { r.heading_line_rate = ad.boldPerLine; r.flags.heading_line_rate = "uncertain"; } continue; } // per-word cards: heading rate per line; box fee stays in the add-on rules
      if (ad.boldPerLine) { r.bold_heading_rate = ad.boldPerLine; r.flags.bold_heading_rate = "uncertain"; }
      if (ad.boxFee) { r.border_rate = ad.boxFee; r.flags.border_rate = "uncertain"; }
    }
    if (ad.tintPercent) tint ??= ad.tintPercent;
    if (ad.underlinePercent) underline ??= ad.underlinePercent;
    if (ad.boxFee) boxFee = ad.boxFee;
    if (ad.boxPercent && !ad.boxFee) boxPct = ad.boxPercent;
    const hl = (ad.highlighter ?? []).filter((h) => h.fee && h.min != null).map((h) => ({ min: h.min as number, max: h.max ?? null, fee: h.fee as number }));
    if (hl.length) highlighter = hl;
  }
  for (const r of rows.values()) Object.keys(r.flags).forEach((k) => r.flags[k as ImportField] === undefined && delete r.flags[k as ImportField]);

  // ── Page positions (percent and / or per-sq-cm B/W + colour rate, per edition or package) ──
  for (const p of ex.pagePremiums) {
    if (!p.surchargePercent && !p.ratePerSqCm) { unmapped.add(`Page position "${p.position}"${p.edition ? ` for "${p.edition}"` : ""}: no printed percentage or per-sq-cm rate found (not imported).`); continue; }
    let edition: string | null = null;
    if (p.edition && !/^(all|any|null)$/i.test(p.edition.trim())) {
      const tg = resolveLabel(paper, p.edition);
      if (tg.kind === "edition") edition = tg.name;
      else if (tg.kind === "group") edition = comboName.get(p.edition) ?? p.edition.trim();
      else if (tg.kind === "none") { unmapped.add(`Page position "${p.position}" for "${p.edition}": ${tg.reason}`); continue; }
      else continue; // slabs / "other Kerala" have no page-position rates in the calculator
    }
    for (const [id, label] of positionIds(p.position)) {
      extras.push({ uid: `imp${++uidSeq}`, include: true, kind: "page_premium", name: edition ? `${id}|${edition}` : id,
        label: `${label}${edition ? ` · ${edition}` : ""}`, source: "Page position",
        data: { label, edition, percent: p.surchargePercent ?? null, rate_per_sq_cm: p.ratePerSqCm ?? null, color_rate_per_sq_cm: p.colourRatePerSqCm ?? null } });
    }
  }
  for (const [name, c] of combos) {
    const tierTxt = c.tier ? `any ${c.tier.min}${c.tier.max !== c.tier.min ? `–${c.tier.max >= 999 ? "+" : c.tier.max}` : ""} editions${c.tier.scope === "any" ? "" : ` (${c.tier.scope})`}` : "";
    extras.push({ uid: `imp${++uidSeq}`, include: true, kind: "combo", name, label: c.tier ? `${name} (${tierTxt})` : `${name} (${c.includes.join(" + ")})`, source: c.tier ? "Multi-edition slab" : "Combo package", data: c as unknown as Record<string, unknown> });
  }
  if (tint || underline || boxPct || boxFee || highlighter) extras.push({ uid: `imp${++uidSeq}`, include: true, kind: "addon", name: "classified", label: "Classified add-ons", source: "Classified", data: { tint_percent: tint, underline_percent: underline, box_percent: boxPct, box_fee: boxFee, highlighter } });
  for (const e of ex.editions.filter((e) => e.kind && e.kind !== "single" && !combos.has(e.name))) {
    if (resolveLabel(paper, e.name).kind === "none" || !ex.displayRates.some((d) => norm(d.edition) === norm(e.name)) && !ex.classifiedText.some((c) => norm(c.edition) === norm(e.name))) {
      unmapped.add(`${e.kind === "any-n" ? "Slab" : "Combination"} "${e.name}"${e.count ? ` (${e.count})` : ""}: no rate row was found for it, so nothing was imported.`);
    }
  }
  notes.push(...ex.notes, ...unmapped);
  return { rows: [...rows.values()], extras, notes };
}

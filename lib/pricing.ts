import { getCategory } from "@/data/categories";
import { getNewspaper, newspapers } from "@/data/newspapers";
import type { AdType, CategoryId, DisplaySpec, Enhancements, Newspaper } from "./types";
import { displayWidth } from "./display";
import { countWords, round2, wrapText } from "./utils";
import { addonsFor, combosFor, findRate, getActiveExtras, getActiveRates, headlineRate, indianEditionNames, keralaEditionNames, outsideKeralaEditionNames, pagePremium, paperConfig, visibleEditions, type PagePremiumData, type RateBook, type RateExtra, type RateRow } from "./rates";

/** GST on newspaper advertising services (5%). Every price shown adds this once, on the taxable subtotal. */
export const GST_RATE = 0.05;

/** Bold, tick and border are flat rates from the rate row. Tint and underline are percentages printed on the rate card (publication_extras), never hardcoded. */
/** Rate-sheet column holding each flat enhancement charge. */
export const ENHANCEMENT_RATE_KEY = { bold: "bold_heading_rate", tick: "tick_rate", border: "border_rate" } as const;

export const ENHANCEMENT_LABEL: Record<Exclude<keyof Enhancements, "tintColor">, string> = {
  bold: "Bold first line",
  tick: "Tick mark ✔",
  border: "Border box",
  tint: "Background tint",
  underline: "Underline",
  highlighter: "Highlighter symbol",
  caps: "All caps",
};

/** Per-publication discount when several of its editions are booked together. */
export const VOLUME_TIERS = [
  { minEditions: 5, pct: 12 },
  { minEditions: 3, pct: 8 },
  { minEditions: 2, pct: 5 },
];

/** Extra discount for running the same ad on several dates, on the taxable subtotal. */
export const MULTI_DAY_TIERS = [
  { minDays: 7, pct: 15 },
  { minDays: 5, pct: 10 },
  { minDays: 3, pct: 5 },
];
export const multiDayPct = (insertions: number) => MULTI_DAY_TIERS.find((t) => insertions >= t.minDays)?.pct ?? 0;

export const DEFAULT_ENHANCEMENTS: Enhancements = { bold: false, border: false, tick: false, tint: false, underline: false };
export const DEFAULT_DISPLAY: DisplaySpec = { columns: 2, heightCm: 10, colorMode: "bw" };

export type Selection = Record<string, string[]>;

export interface QuoteInput {
  adType: AdType;
  category?: CategoryId | null;
  selection: Selection;
  text?: string;
  enhancements?: Enhancements;
  display?: DisplaySpec;
  /** Number of publication dates (insertions) the ad runs on; default 1. */
  insertions?: number;
  /** Database rate book; defaults to the one loaded from `publication_rates`. Editions without a published rule are not priced. */
  rates?: RateBook | null;
  /** Imported page premiums / combos / add-on percentages; defaults to the loaded ones. */
  extras?: RateExtra[] | null;
}

export interface EditionLine {
  newspaperId: string;
  newspaperName: string;
  editionId: string;
  editionName: string;
  unitLabel: string;
  baseUnits: number;
  extraUnits: number;
  extraUnitLabel: string;
  /** Effective rate per base unit for this edition, after weight and category. */
  rate: number;
  base: number;
  extra: number;
  enhancements: number;
  gross: number;
  discountPct: number;
  discountLabel: string;
  discount: number;
  net: number;
  /** Display ads: the exact per-cm² rate actually multiplied (B/W, exact printed colour, or position rate), and the exact per-insertion product. Absent when colour is a derived percentage. */
  appliedRate?: number;
  appliedTotal?: number;
  /** Combo / slab lines: the package name and how many editions it covers (1 for a single edition). */
  packageName?: string;
  editionsCovered?: number;
  /** Per-word classified: the capitals rate (not the ordinary word rate) was applied. */
  capsApplied?: boolean;
  /** Colour was requested but this page position only prints a B/W rate: priced at the printed B/W rate. */
  bwOnly?: boolean;
}

export interface Quote {
  lines: EditionLine[];
  editionCount: number;
  metrics: {
    chars: number;
    words: number;
    lines: number;
    minLines: number;
    areaCm2: number;
    minAreaCm2: number;
    charsPerLine: number;
  };
  enhancementItems: { key: string; label: string; amount: number }[];
  totals: {
    /** Insertion count and the multi-day discount (a % of the taxable subtotal) applied on top of edition discounts. */
    insertions: number;
    multiDayPct: number;
    multiDay: number;
    /** Subtotal for one insertion, after edition discounts and before the multi-day discount. */
    perInsertion: number;
    base: number;
    extra: number;
    enhancements: number;
    gross: number;
    discount: number;
    taxable: number;
    gst: number;
    total: number;
  };
}

export function measureText(text: string, charsPerLine: number) {
  return {
    chars: text.replace(/\s+$/g, "").length,
    words: countWords(text),
    lines: wrapText(text, charsPerLine).length,
  };
}

export function volumeDiscountPct(editionCount: number) {
  return VOLUME_TIERS.find((t) => editionCount >= t.minEditions)?.pct ?? 0;
}

export function displayArea(spec: DisplaySpec, paper: Newspaper) {
  return round2(displayWidth(spec, paper.rates.colWidthCm) * spec.heightCm);
}

/**
 * Pure rate calculator. Order of operations per edition:
 *   base (minimum lines / area) + extra (beyond minimum) + enhancements
 *   → combo/volume discount → sum → GST on the discounted amount.
 */
export function calculateQuote(input: QuoteInput): Quote {
  const enh = input.enhancements ?? DEFAULT_ENHANCEMENTS;
  const display = input.display ?? DEFAULT_DISPLAY;
  const count = Math.max(1, Math.floor(input.insertions ?? 1) || 1);
  const text = input.text ?? "";
  const isText = input.adType === "classified-text";
  const rates = input.rates === undefined ? getActiveRates() : input.rates;
  const extras = input.extras === undefined ? getActiveExtras() : input.extras ?? [];

  const lines: EditionLine[] = [];
  const enhTotals: Record<string, number> = {};
  let metrics: Quote["metrics"] | null = null;

  for (const paper of newspapers) {
    const ids = input.selection[paper.id];
    if (!ids?.length) continue;
    const selected = paper.editions.filter((e) => ids.includes(e.id));
    if (!selected.length) continue;

    const r = paper.rates;
    const m = measureText(text, r.charsPerLine);
    const area = displayArea(display, paper);
    const cfg = paperConfig(paper, input.adType, rates);
    metrics ??= {
      ...m,
      minLines: cfg.minLines,
      areaCm2: area,
      minAreaCm2: cfg.minSqCm,
      charsPerLine: r.charsPerLine,
    };

    const volumePct = volumeDiscountPct(selected.length);
    const bundlePct = new Map<string, { pct: number; name: string }>();
    for (const g of paper.groups) {
      const size = visibleEditions(paper).filter((e) => e.groupId === g.id).length;
      const chosen = selected.filter((e) => e.groupId === g.id).length;
      if (size >= 2 && chosen === size && g.bundleDiscountPct > 0) {
        bundlePct.set(g.id, { pct: g.bundleDiscountPct, name: g.name });
      }
    }

    // ── Pricing of one rate source (an edition's rate row, or a combo / slab entry from the rate card) ─────────────────
    const addon = addonsFor(extras, paper.name);
    type Src = Partial<Pick<RateRow, "word_rate" | "eng_word_rate" | "caps_word_rate" | "heading_line_rate" | "min_words" | "base_rate" | "extra_line_rate" | "min_lines" | "bold_heading_rate" | "tick_rate" | "border_rate" | "color_sq_cm_rate" | "min_sq_cm">> & { sq_cm_rate: number; color_surcharge_percent: number };
    interface Charge { capsApplied?: boolean; appliedRate?: number; appliedTotal?: number; bwOnly?: boolean; unitLabel: string; extraUnitLabel: string; baseUnits: number; extraUnits: number; rate: number; base: number; extra: number; enh: number; parts: Record<string, number> }
    const charge = (src: Src, net: number, prem: PagePremiumData | null): Charge | null => {
      const parts: Record<string, number> = {};
      const add = (k: string, v: number) => { if (v) parts[k] = round2((parts[k] ?? 0) + v); };
      if (isText) {
        const addPct = (key: "tint" | "underline" | "border", amountBase: number) => {
          if (!enh[key]) return;
          const pct = key === "tint" ? addon.tint_percent : key === "underline" ? addon.underline_percent : !src.border_rate && !addon.box_fee ? addon.box_percent : null;
          const amt = pct ? round2(amountBase * (pct / 100)) : key === "border" ? round2((src.border_rate || addon.box_fee || 0) * net) : 0; // tint / underline: only the exact percentage printed on the card
          add(key, amt);
        };
        if ((src.word_rate ?? 0) > 0) {
          // Per-word tariff: exact word count × the printed word rate (local language, English ordinary or English caps).
          const malayalam = /[ഀ-ൿ]/.test(text);
          const allCaps = !malayalam && (!!enh.caps || (/[A-Za-z]/.test(text) && !/[a-z]/.test(text)));
          const wr = malayalam ? src.word_rate! : allCaps && (src.caps_word_rate ?? 0) > 0 ? src.caps_word_rate! : (src.eng_word_rate ?? 0) > 0 ? src.eng_word_rate! : src.word_rate!;
          const rate = round2(wr * net);
          const capsApplied = allCaps && (src.caps_word_rate ?? 0) > 0;
          const billed = Math.max(m.words, src.min_words ?? 0);
          const base = round2(billed * rate);
          if (enh.bold && (src.heading_line_rate ?? 0) > 0) add("bold", round2(src.heading_line_rate! * net)); // heading: one line at the printed heading rate
          addPct("tint", base); addPct("underline", base); addPct("border", base);
          if (enh.tick && src.tick_rate) add("tick", round2(src.tick_rate * net));
          return { capsApplied, unitLabel: "words", extraUnitLabel: "words", baseUnits: billed, extraUnits: 0, rate, base, extra: 0, enh: round2(Object.values(parts).reduce((a, b) => a + b, 0)), parts };
        }
        // Per-line tariff: base_rate covers the minimum lines, then extra_line_rate per additional line.
        const baseUnits = src.min_lines ?? r.textMinLines;
        const base = round2((src.base_rate ?? 0) * net);
        const extraUnits = Math.max(0, m.lines - baseUnits);
        const extra = round2(extraUnits * (src.extra_line_rate ?? 0) * net);
        for (const key of ["bold", "tick"] as const) if (enh[key] && src[ENHANCEMENT_RATE_KEY[key]]) add(key, round2((src[ENHANCEMENT_RATE_KEY[key]] ?? 0) * net));
        addPct("tint", base + extra); addPct("underline", base + extra); addPct("border", base + extra);
        return { unitLabel: "lines", extraUnitLabel: "lines", baseUnits, extraUnits, rate: round2(base / Math.max(1, baseUnits)), base, extra, enh: round2(Object.values(parts).reduce((a, b) => a + b, 0)), parts };
      }
      // Display: sq_cm_rate is final for the edition / category; a chosen page position uses the card's printed position rate / premium.
      if (display.position && !prem) return null;
      const rate = round2((prem?.rate_per_sq_cm ?? src.sq_cm_rate) * net);
      const baseUnits = src.min_sq_cm ?? cfg.minSqCm;
      const base = round2(baseUnits * rate);
      const extraUnits = Math.max(0, round2(area - baseUnits));
      const extra = round2(extraUnits * rate);
      let appliedRate: number | undefined = rate, appliedTotal: number | undefined = round2(base + extra), bwOnly = false;
      if (display.colorMode === "color") {
        let exact = 0;
        if (prem?.rate_per_sq_cm) { if ((prem.color_rate_per_sq_cm ?? 0) > 0) exact = round2(prem.color_rate_per_sq_cm! * net); else bwOnly = true; } // position prints only a B/W rate: priced at that printed rate, never ₹0
        else if ((src.color_sq_cm_rate ?? 0) > 0) exact = round2(src.color_sq_cm_rate! * net);
        if (exact) {
          const colourTotal = round2(round2(baseUnits * exact) + round2(extraUnits * exact));
          add("color", round2(colourTotal - base - extra));
          appliedRate = exact; appliedTotal = colourTotal;
        } else if (!bwOnly) { add("color", round2((base + extra) * (src.color_surcharge_percent / 100))); appliedRate = undefined; appliedTotal = undefined; }
      }
      if (prem?.percent && !prem.rate_per_sq_cm) add(`pos:${prem.label} (+${prem.percent}%)`, round2((base + extra) * (prem.percent / 100)));
      return { appliedRate, appliedTotal, bwOnly, unitLabel: "cm²", extraUnitLabel: "cm²", baseUnits, extraUnits, rate, base, extra, enh: round2(Object.values(parts).reduce((a, b) => a + b, 0)), parts };
    };
    const totalOf = (c: Charge) => round2(c.base + c.extra + c.enh);

    // Each selected edition priced on its own (null = no published rate / position rate → not priced).
    const indiv = new Map<string, { rule: RateRow; ch: Charge }>();
    for (const e of selected) {
      const rule = findRate(rates, paper.name, e.name, input.category, input.adType);
      if (!rule) continue;
      const prem = !isText && display.position ? pagePremium(extras, paper.name, e.name, display.position) : null;
      const ch = charge(rule, rule.gst_included ? 1 / (1 + GST_RATE) : 1, prem);
      if (ch) indiv.set(e.id, { rule, ch });
    }

    // Combo packages and count slabs printed on the rate card ("All Kerala", "Any 3 Editions"...): one line prices a set of
    // editions together at the card's own rate. A package is used only when it is no dearer than pricing the editions one by one.
    const paperStart = lines.length;
    const consumed = new Set<string>();
    const kerala = new Set(keralaEditionNames(paper)), outside = new Set(outsideKeralaEditionNames(paper)), india = new Set(indianEditionNames(paper));
    const inScope = (scope: "any" | "kerala" | "outside-kerala" | "india", name: string) => scope === "any" || (scope === "kerala" ? kerala.has(name) : scope === "outside-kerala" ? outside.has(name) : india.has(name));
    const allCombos = combosFor(extras, paper.name);
    interface Cand { name: string; label: string; members: typeof selected; ch: Charge; total: number; saving: number }
    const buildCands = (remaining: typeof selected): Cand[] => {
      const out: Cand[] = [];
      const remNames = new Set(remaining.map((e) => e.name.trim().toLowerCase()));
      for (const c of allCombos) {
        let members: typeof selected;
        if (c.tier) members = remaining.filter((e) => inScope(c.tier!.scope, e.name));
        else if (c.includes.length >= 2 && c.includes.every((n) => remNames.has(n.trim().toLowerCase()))) members = remaining.filter((e) => c.includes.some((n) => n.trim().toLowerCase() === e.name.trim().toLowerCase()));
        else continue;
        if (c.tier && (members.length < c.tier.min || members.length > c.tier.max || members.length < 2)) continue;
        const row = [...c.rates].filter((x) => x.ad_type === input.adType && (x.category === "all" || x.category === input.category)).sort((a, b) => Number(b.category !== "all") - Number(a.category !== "all"))[0];
        if (!row || !((row.sq_cm_rate ?? 0) > 0 || (row.word_rate ?? 0) > 0 || (row.base_rate ?? 0) > 0)) continue;
        const prem = !isText && display.position ? (c.tier ? null : pagePremium(extras, paper.name, c.name, display.position)) : null;
        const ch = charge(row, c.gst_included ? 1 / (1 + GST_RATE) : 1, prem);
        if (!ch) continue;
        const total = totalOf(ch);
        const parts = members.map((e) => indiv.get(e.id));
        const sum = parts.every(Boolean) ? parts.reduce((a, x) => a + totalOf(x!.ch), 0) : Infinity;
        if (total > sum) continue;
        out.push({ name: c.name, label: c.tier ? `${c.name} · ${members.length} editions` : `${c.name} (combo)`, members, ch, total, saving: sum === Infinity ? 1e12 : sum - total });
      }
      return out.sort((a, b) => b.saving - a.saving || b.members.length - a.members.length);
    };
    for (let remaining = selected, guard = 0; guard < 6; guard++) {
      const best = buildCands(remaining)[0];
      if (!best) break;
      for (const [k, v] of Object.entries(best.ch.parts)) enhTotals[k] = (enhTotals[k] ?? 0) + v;
      best.members.forEach((e) => consumed.add(e.id));
      remaining = remaining.filter((e) => !consumed.has(e.id));
      lines.push({
        newspaperId: paper.id, newspaperName: paper.name, editionId: `combo:${paper.id}:${best.name}`, // scoped by publication so two papers' same-named packages never share an id
        editionName: best.label,
        unitLabel: best.ch.unitLabel, baseUnits: best.ch.baseUnits, extraUnits: best.ch.extraUnits, extraUnitLabel: best.ch.extraUnitLabel, rate: best.ch.rate,
        base: round2(best.ch.base * count), extra: round2(best.ch.extra * count), enhancements: round2(best.ch.enh * count), gross: round2(best.total * count),
        discountPct: 0, discountLabel: "", discount: 0, net: round2(best.total * count),
        appliedRate: best.ch.appliedRate, appliedTotal: best.ch.appliedTotal, bwOnly: best.ch.bwOnly, capsApplied: best.ch.capsApplied, packageName: best.name, editionsCovered: best.members.length,
      });
    }

    for (const e of selected) {
      if (consumed.has(e.id)) continue;
      const hit = indiv.get(e.id);
      if (!hit) continue; // no published rule (or no printed position rate) → this edition is not priced, never a default
      const { ch } = hit;
      for (const [k, v] of Object.entries(ch.parts)) enhTotals[k] = (enhTotals[k] ?? 0) + v;
      const gross = totalOf(ch);
      const bundle = bundlePct.get(e.groupId);
      let discountPct = volumePct;
      let discountLabel = volumePct ? `${selected.length} editions of ${paper.name}` : "";
      if (bundle && bundle.pct >= discountPct) {
        discountPct = bundle.pct;
        discountLabel = `All ${bundle.name} editions bundle`;
      }
      const discount = round2((gross * discountPct) / 100);
      const k = count; // every insertion costs the same: line values below are for the whole run
      lines.push({
        newspaperId: paper.id, newspaperName: paper.name, editionId: e.id, editionName: e.name,
        unitLabel: ch.unitLabel, baseUnits: ch.baseUnits, extraUnits: ch.extraUnits, extraUnitLabel: ch.extraUnitLabel, rate: ch.rate,
        base: round2(ch.base * k), extra: round2(ch.extra * k), enhancements: round2(ch.enh * k), gross: round2(gross * k),
        discountPct, discountLabel, discount: round2(discount * k), net: round2((gross - discount) * k),
        appliedRate: ch.appliedRate, appliedTotal: ch.appliedTotal, bwOnly: ch.bwOnly, capsApplied: ch.capsApplied, editionsCovered: 1,
      });
    }

    // Highlighter symbol (classified text): one flat fee for the ad, set by how many editions it runs in.
    if (isText && enh.highlighter) {
      const priced = consumed.size + [...indiv.keys()].filter((id) => !consumed.has(id)).length;
      const tier = (addon.highlighter ?? []).find((h) => priced >= h.min && (h.max == null || priced <= h.max));
      const idx = lines.length > paperStart ? paperStart : -1;
      if (tier && idx >= 0) {
        const fee = round2(tier.fee * count);
        enhTotals.highlighter = (enhTotals.highlighter ?? 0) + tier.fee;
        const l = lines[idx];
        lines[idx] = { ...l, enhancements: round2(l.enhancements + fee), gross: round2(l.gross + fee), net: round2(l.net + fee) };
      }
    }

  }

  const sum = (f: (l: EditionLine) => number) => round2(lines.reduce((a, l) => a + f(l), 0));
  const gross = sum((l) => l.gross);
  const discount = sum((l) => l.discount);
  const subtotal = round2(gross - discount);
  const mdPct = multiDayPct(count);
  const multiDay = round2((subtotal * mdPct) / 100);
  const taxable = round2(subtotal - multiDay);
  const gst = round2(taxable * GST_RATE);

  const colorLabel = "Colour printing";
  const enhancementItems = Object.entries(enhTotals).map(([key, amount]) => ({
    key,
    label: key === "color" ? colorLabel : key.startsWith("pos:") ? `Page position: ${key.slice(4)}` : ENHANCEMENT_LABEL[key as keyof typeof ENHANCEMENT_LABEL],
    amount: round2(amount * count),
  }));

  return {
    lines,
    editionCount: lines.length,
    metrics:
      metrics ?? {
        chars: 0,
        words: 0,
        lines: 0,
        minLines: 3,
        areaCm2: 0,
        minAreaCm2: 0,
        charsPerLine: 28,
      },
    enhancementItems,
    totals: {
      insertions: count,
      multiDayPct: mdPct,
      multiDay,
      perInsertion: round2(subtotal / count),
      base: sum((l) => l.base),
      extra: sum((l) => l.extra),
      enhancements: sum((l) => l.enhancements),
      gross,
      discount,
      taxable,
      gst,
      total: round2(taxable + gst),
    },
  };
}

export interface ComboSuggestion {
  groupId: string;
  groupName: string;
  discountPct: number;
  missingEditionIds: string[];
  selectedCount: number;
  label: string;
}

/** Bundles the user could complete to unlock the group discount. */
export function comboSuggestions(newspaperId: string, selectedIds: string[]): ComboSuggestion[] {
  const paper = getNewspaper(newspaperId);
  if (!paper || !selectedIds.length) return [];
  const out: ComboSuggestion[] = [];
  for (const g of paper.groups) {
    const all = visibleEditions(paper).filter((e) => e.groupId === g.id);
    if (all.length < 2 || g.bundleDiscountPct <= 0) continue;
    const missing = all.filter((e) => !selectedIds.includes(e.id));
    if (!missing.length) continue;
    out.push({
      groupId: g.id,
      groupName: g.name,
      discountPct: g.bundleDiscountPct,
      missingEditionIds: missing.map((e) => e.id),
      selectedCount: all.length - missing.length,
      label: `Add all ${g.name} editions for ${g.bundleDiscountPct}% off`,
    });
  }
  return out.sort((a, b) => b.selectedCount - a.selectedCount || b.discountPct - a.discountPct).slice(0, 2);
}

/** Starting-rate estimate used by the homepage widget (minimum billable ad). */
export function estimateQuote(adType: AdType, selection: Selection, size?: { lines?: number; heightCm?: number }) {
  // Synthesize an ad of the requested size so the widget can show a live calculator.
  const text = size?.lines ? Array.from({ length: size.lines }, () => "A".repeat(28)).join("\n") : "";
  return calculateQuote({
    adType,
    selection,
    text,
    display: { columns: size?.heightCm ? 2 : 1, heightCm: size?.heightCm ?? 1, colorMode: "bw" },
  });
}

/** Lowest published per-unit rate for a publication, or null when the admin hasn't published rates for it. */
export function startingRate(paper: Newspaper, adType: AdType, categoryId?: string | null) {
  return headlineRate(getActiveRates(), paper.name, adType, paperConfig(paper, adType).minLines, categoryId);
}

/** The headline edition of a publication (first listed, weight-leading). */
export function flagshipEdition(paper: Newspaper) {
  const list = visibleEditions(paper);
  return [...(list.length ? list : paper.editions)].sort((a, b) => b.weight - a.weight)[0];
}

/** Headline published rate for an ad type, tagged with the flagship edition; null when not published. */
export function flagshipRate(paper: Newspaper, adType: AdType) {
  const r = startingRate(paper, adType);
  return r ? { ...r, edition: flagshipEdition(paper) } : null;
}

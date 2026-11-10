import { getCategory } from "@/data/categories";
import { getNewspaper, newspapers } from "@/data/newspapers";
import type { AdType, CategoryId, DisplaySpec, Enhancements, Newspaper } from "./types";
import { displayWidth } from "./display";
import { countWords, round2, wrapText } from "./utils";
import { findRate, getActiveRates, headlineRate, paperConfig, visibleEditions, type RateBook } from "./rates";

export const GST_RATE = 0.18;

/** Background tint is still a fraction of the text charge; bold, tick and border are flat rates from the rate sheet. */
export const ENHANCEMENT_PCT = { tint: 0.3 } as const;
/** Rate-sheet column holding each flat enhancement charge. */
export const ENHANCEMENT_RATE_KEY = { bold: "bold_heading_rate", tick: "tick_rate", border: "border_rate" } as const;

export const ENHANCEMENT_LABEL: Record<keyof Enhancements, string> = {
  bold: "Bold first line",
  tick: "Tick mark ✔",
  border: "Border box",
  tint: "Background tint",
};

/** Per-publication discount when several of its editions are booked together. */
export const VOLUME_TIERS = [
  { minEditions: 5, pct: 12 },
  { minEditions: 3, pct: 8 },
  { minEditions: 2, pct: 5 },
];

export const DEFAULT_ENHANCEMENTS: Enhancements = { bold: false, border: false, tick: false, tint: false };
export const DEFAULT_DISPLAY: DisplaySpec = { columns: 2, heightCm: 10, colorMode: "bw" };

export type Selection = Record<string, string[]>;

export interface QuoteInput {
  adType: AdType;
  category?: CategoryId | null;
  selection: Selection;
  text?: string;
  enhancements?: Enhancements;
  display?: DisplaySpec;
  /** Database rate book; defaults to the one loaded from `publication_rates`. Editions without a published rule are not priced. */
  rates?: RateBook | null;
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
  const text = input.text ?? "";
  const isText = input.adType === "classified-text";
  const rates = input.rates === undefined ? getActiveRates() : input.rates;

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

    for (const e of selected) {
      // Prices come only from the published rate sheet. No rule → this edition is not priced (never a default).
      const rule = findRate(rates, paper.name, e.name, input.category, input.adType);
      if (!rule) continue;
      const net = rule.gst_included ? 1 / (1 + GST_RATE) : 1; // sheet rates that already include GST are backed out; GST is added once on the total
      let unitLabel: string, extraUnitLabel: string;
      let baseUnits: number, extraUnits: number, rate: number, base: number, extra: number;
      let enhancements = 0;

      if (isText) {
        // base_rate covers the minimum lines, then extra_line_rate per additional line.
        baseUnits = rule.min_lines ?? r.textMinLines;
        unitLabel = "lines";
        rate = round2((rule.base_rate * net) / Math.max(1, baseUnits));
        base = round2(rule.base_rate * net);
        extraUnits = Math.max(0, m.lines - baseUnits);
        extraUnitLabel = "lines";
        extra = round2(extraUnits * rule.extra_line_rate * net);
        // total = base/lines + bold + tick + border (flat, from the rate row) [+ tint %]; GST is added once afterwards.
        for (const key of ["bold", "tick", "border", "tint"] as const) {
          if (!enh[key]) continue;
          const amt = key === "tint" ? round2((base + extra) * ENHANCEMENT_PCT.tint) : round2(rule[ENHANCEMENT_RATE_KEY[key]] * net);
          if (!amt) continue;
          enhancements += amt;
          enhTotals[key] = (enhTotals[key] ?? 0) + amt;
        }
      } else {
        // sq_cm_rate is final for this edition/category; colour adds color_surcharge_percent.
        rate = round2(rule.sq_cm_rate * net);
        baseUnits = rule.min_sq_cm ?? r.minDisplayCm2;
        unitLabel = "cm²";
        base = round2(baseUnits * rate);
        extraUnits = Math.max(0, round2(area - baseUnits));
        extraUnitLabel = "cm²";
        extra = round2(extraUnits * rate);
        if (display.colorMode === "color") {
          const amt = round2((base + extra) * (rule.color_surcharge_percent / 100));
          enhancements += amt;
          enhTotals.color = (enhTotals.color ?? 0) + amt;
        }
      }
      enhancements = round2(enhancements);

      const gross = round2(base + extra + enhancements);
      const bundle = bundlePct.get(e.groupId);
      let discountPct = volumePct;
      let discountLabel = volumePct ? `${selected.length} editions of ${paper.name}` : "";
      if (bundle && bundle.pct >= discountPct) {
        discountPct = bundle.pct;
        discountLabel = `All ${bundle.name} editions bundle`;
      }
      const discount = round2((gross * discountPct) / 100);

      lines.push({
        newspaperId: paper.id,
        newspaperName: paper.name,
        editionId: e.id,
        editionName: e.name,
        unitLabel,
        baseUnits,
        extraUnits,
        extraUnitLabel,
        rate,
        base,
        extra,
        enhancements,
        gross,
        discountPct,
        discountLabel,
        discount,
        net: round2(gross - discount),
      });
    }
  }

  const sum = (f: (l: EditionLine) => number) => round2(lines.reduce((a, l) => a + f(l), 0));
  const gross = sum((l) => l.gross);
  const discount = sum((l) => l.discount);
  const taxable = round2(gross - discount);
  const gst = round2(taxable * GST_RATE);

  const colorLabel = "Colour printing";
  const enhancementItems = Object.entries(enhTotals).map(([key, amount]) => ({
    key,
    label: key === "color" ? colorLabel : ENHANCEMENT_LABEL[key as keyof Enhancements],
    amount: round2(amount),
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
export function startingRate(paper: Newspaper, adType: AdType) {
  return headlineRate(getActiveRates(), paper.name, adType, paperConfig(paper, adType).minLines);
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

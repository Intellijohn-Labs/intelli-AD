"use client";

import { useSyncExternalStore } from "react";
import { getActiveRates, getRatesVersion, headlineRate, matchRateAliased, paperHasRates, setActiveExtras, setActiveRates, setActiveSettings, subscribeRates, type PaperSettings, type RateExtra, type RateRow } from "./rates";
import { createClient } from "./supabase/client";

/** Re-renders the caller whenever the active rate book changes; include the value in useMemo deps of quote calculations. */
export function useRatesVersion() {
  return useSyncExternalStore(subscribeRates, getRatesVersion, getRatesVersion);
}

/** Per-newspaper print days and enabled editions. Optional: if the table is missing, every day / edition stays enabled. */
async function loadSettings(sb: NonNullable<ReturnType<typeof createClient>>) {
  const { data, error } = await sb.from("newspaper_settings").select("*");
  if (error) { console.warn("[rates] newspaper_settings unavailable: all print days and editions stay enabled.", error.message); setActiveSettings([]); return; }
  setActiveSettings((data ?? []) as PaperSettings[]);
}

/** Imported page premiums / combos / add-on percentages. Optional: if the table is missing, only the base rates apply. */
async function loadExtras(sb: NonNullable<ReturnType<typeof createClient>>) {
  const { data, error } = await sb.from("publication_extras").select("newspaper_name,kind,name,data");
  if (error) { console.warn("[rates] publication_extras unavailable: page premiums, combos and add-on percentages are off.", error.message); setActiveExtras([]); return; }
  setActiveExtras((data ?? []) as RateExtra[]);
}

/** Fetches `publication_rates`. On any failure the calculator keeps its built-in rates (logged to the console). */
export async function loadRates(): Promise<RateRow[] | null> {
  const sb = createClient();
  if (!sb) {
    console.warn("[rates] Supabase isn't configured: no rates are published.");
    if (!getActiveRates()) setActiveRates([]); // strict: nothing is bookable without published rates
    return null;
  }
  try {
    // PostgREST caps every response at the project's max-rows (1000 by default) no matter what .limit() says,
    // so page through the table with .range() until a short page comes back.
    const PAGE = 1000;
    const data: Record<string, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (let from = 0; from < 50000; from += PAGE) {
      const { data: page, error } = await sb.from("publication_rates").select("*").order("id").range(from, from + PAGE - 1);
      if (error) throw error;
      data.push(...(page ?? []));
      if ((page?.length ?? 0) < PAGE) break;
    }
    const rows = data.map((r) => ({
      ...r,
      base_rate: Number(r.base_rate), extra_line_rate: Number(r.extra_line_rate),
      sq_cm_rate: Number(r.sq_cm_rate), color_surcharge_percent: Number(r.color_surcharge_percent),
      color_sq_cm_rate: r.color_sq_cm_rate == null ? null : Number(r.color_sq_cm_rate),
      word_rate: r.word_rate == null ? null : Number(r.word_rate), eng_word_rate: r.eng_word_rate == null ? null : Number(r.eng_word_rate),
      caps_word_rate: r.caps_word_rate == null ? null : Number(r.caps_word_rate), heading_line_rate: r.heading_line_rate == null ? null : Number(r.heading_line_rate),
      min_words: r.min_words == null ? null : Number(r.min_words),
      min_lines: r.min_lines ?? null, min_sq_cm: r.min_sq_cm == null ? null : Number(r.min_sq_cm),
      cutoff_days: r.cutoff_days ?? null, cutoff_time: r.cutoff_time ?? null, gst_included: r.gst_included === true,
      bold_heading_rate: Number(r.bold_heading_rate ?? 0), tick_rate: Number(r.tick_rate ?? 0), border_rate: Number(r.border_rate ?? 0),
    })) as RateRow[];
    await loadSettings(sb);
    await loadExtras(sb);
    setActiveRates(rows);
    return rows;
  } catch (e) {
    console.warn("[rates] Couldn't load publication_rates (offline or table missing): no rates are published.", e instanceof Error ? e.message : e);
    if (!getActiveRates()) setActiveRates([]); // strict: no placeholder rates; keep any rates already loaded
    return null;
  }
}

/**
 * Rate availability. `loaded` is false only until the first fetch settles (cards show "checking"); after that a
 * newspaper is available only if the database has a usable rule for it. There are no built-in fallback rates.
 */
export function useRateAvailability() {
  useRatesVersion();
  const book = getActiveRates();
  return {
    loaded: book !== null,
    hasRates: (paperName: string, adType?: Parameters<typeof paperHasRates>[2]) => book !== null && paperHasRates(book, paperName, adType),
    /** True when this exact edition has a published rate for the ad type and category (what the calculator needs). */
    canPrice: (paperName: string, editionName: string, categoryId: string | null | undefined, adType: Parameters<typeof matchRateAliased>[4]) => matchRateAliased(book, paperName, editionName, categoryId, adType) !== null,
    headline: (paperName: string, adType: Parameters<typeof headlineRate>[2], minLines: number, categoryId?: string | null) => headlineRate(book, paperName, adType, minLines, categoryId),
  };
}

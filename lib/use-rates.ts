"use client";

import { useSyncExternalStore } from "react";
import { getActiveRates, getRatesVersion, headlineRate, matchRate, paperHasRates, setActiveRates, subscribeRates, type RateRow } from "./rates";
import { createClient } from "./supabase/client";

/** Re-renders the caller whenever the active rate book changes; include the value in useMemo deps of quote calculations. */
export function useRatesVersion() {
  return useSyncExternalStore(subscribeRates, getRatesVersion, getRatesVersion);
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
    const { data, error } = await sb.from("publication_rates").select("*").order("newspaper_name").limit(5000);
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({
      ...r,
      base_rate: Number(r.base_rate), extra_line_rate: Number(r.extra_line_rate),
      sq_cm_rate: Number(r.sq_cm_rate), color_surcharge_percent: Number(r.color_surcharge_percent),
    })) as RateRow[];
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
    canPrice: (paperName: string, editionName: string, categoryId: string | null | undefined, adType: Parameters<typeof matchRate>[4]) => matchRate(book, paperName, editionName, categoryId, adType) !== null,
    headline: (paperName: string, adType: Parameters<typeof headlineRate>[2], minLines: number) => headlineRate(book, paperName, adType, minLines),
  };
}

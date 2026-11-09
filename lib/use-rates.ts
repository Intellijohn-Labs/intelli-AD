"use client";

import { useSyncExternalStore } from "react";
import { getRatesVersion, setActiveRates, subscribeRates, type RateRow } from "./rates";
import { createClient } from "./supabase/client";

/** Re-renders the caller whenever the active rate book changes; include the value in useMemo deps of quote calculations. */
export function useRatesVersion() {
  return useSyncExternalStore(subscribeRates, getRatesVersion, getRatesVersion);
}

/** Fetches `publication_rates`. On any failure the calculator keeps its built-in rates (logged to the console). */
export async function loadRates(): Promise<RateRow[] | null> {
  const sb = createClient();
  if (!sb) {
    console.warn("[rates] Supabase isn't configured: using built-in default rates.");
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
    console.warn("[rates] Couldn't load publication_rates (offline or table missing): using built-in default rates.", e instanceof Error ? e.message : e);
    return null;
  }
}

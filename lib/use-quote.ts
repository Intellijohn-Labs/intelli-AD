"use client";

import { useMemo } from "react";
import { calculateQuote, type QuoteInput } from "./pricing";
import type { BookingState } from "./booking-store";
import { applySpacing } from "./paragraphs";
import { useRatesVersion } from "./use-rates";

/** Reactive wrapper around the pure rate calculator. */
export function useQuote(input: QuoteInput) {
  const { adType, category, selection, text, enhancements, display, insertions } = input;
  const ratesVersion = useRatesVersion(); // recompute when database rates load or change
  return useMemo(
    () => calculateQuote({ adType, category, selection, text, enhancements, display, insertions }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adType, category, selection, text, enhancements, display, insertions, ratesVersion],
  );
}

export function useBookingQuote(state: BookingState) {
  return useQuote({
    adType: state.adType,
    category: state.categoryId,
    selection: state.selection,
    text: state.adType === "classified-text" ? applySpacing(state.text, state.paragraphSpacing) : state.text,
    enhancements: state.enhancements,
    display: state.display,
    insertions: state.insertionDates?.length || 1,
  });
}

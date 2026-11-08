"use client";

import { useMemo } from "react";
import { calculateQuote, type QuoteInput } from "./pricing";
import type { BookingState } from "./booking-store";
import { applySpacing } from "./paragraphs";

/** Reactive wrapper around the pure rate calculator. */
export function useQuote(input: QuoteInput) {
  const { adType, category, selection, text, enhancements, display } = input;
  return useMemo(
    () => calculateQuote({ adType, category, selection, text, enhancements, display }),
    [adType, category, selection, text, enhancements, display],
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
  });
}

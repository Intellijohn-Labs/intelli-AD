"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AdType, CategoryId, DisplaySpec, Enhancements, FileMeta } from "./types";
import type { Selection } from "./pricing";
import { DEFAULT_DISPLAY, DEFAULT_ENHANCEMENTS } from "./pricing";
import type { ReceiptData } from "./receipt";
import type { ObituaryFields } from "@/data/obituary";
import type { TenderFields } from "@/data/tender";
import type { CreativeMode } from "./display";
import type { ParagraphSpacing } from "./paragraphs";

export type Step = 1 | 2 | 3 | 4;

export interface BookingState {
  step: Step;
  adType: AdType;
  categoryId: CategoryId | null;
  selection: Selection;
  text: string;
  enhancements: Enhancements;
  display: DisplaySpec;
  artwork: FileMeta | null;
  documents: Record<string, FileMeta>;
  releaseDate: string | null;
  templateTitle: string | null;
  receipt: ReceiptData | null;
  /** Obituary / death-anniversary composer fields (only used by the obituary category). */
  obituary: ObituaryFields | null;
  /** Tender notice composer fields (only used by the tender category). */
  tender: TenderFields | null;
  /** Display flow for obituary/tender: upload a finished creative, or build one from a template. */
  creativeMode: CreativeMode;
  /** Set when the user jumped from checkout back to Compose: the primary action then returns straight to checkout. */
  returnToCheckout: boolean;
  /** Paragraph spacing for line-billed text ads (tight / normal / double-spaced). */
  paragraphSpacing: ParagraphSpacing;
  /** Print styling of a line-billed text ad, edited from the proof box toolbar. Italic and alignment are free. */
  textStyle: TextStyle;
}

export interface TextStyle {
  italic: boolean;
  align: "left" | "center" | "justify";
  /** Look of the border when the Border box enhancement is on (floral is for obituaries). */
  borderStyle: "single" | "double" | "floral";
}

export const initialBookingState: BookingState = {
  step: 1,
  adType: "classified-text",
  categoryId: null,
  selection: {},
  text: "",
  enhancements: DEFAULT_ENHANCEMENTS,
  display: DEFAULT_DISPLAY,
  artwork: null,
  documents: {},
  releaseDate: null,
  templateTitle: null,
  receipt: null,
  obituary: null,
  tender: null,
  creativeMode: "builder",
  returnToCheckout: false,
  paragraphSpacing: "normal",
  textStyle: { italic: false, align: "justify", borderStyle: "single" },
};

const STORAGE_KEY = "intelliad.booking.v1";

interface Ctx {
  state: BookingState;
  hydrated: boolean;
  update: (patch: Partial<BookingState>) => void;
  reset: () => void;
}

const BookingContext = createContext<Ctx | null>(null);

function stripPreview(state: BookingState): BookingState {
  const clean = (f: FileMeta | null) => (f ? { name: f.name, size: f.size, type: f.type } : null);
  return {
    ...state,
    artwork: clean(state.artwork),
    documents: Object.fromEntries(Object.entries(state.documents).map(([k, v]) => [k, clean(v)!])),
  };
}

export function BookingProvider({ initial, children }: { initial?: Partial<BookingState>; children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initialBookingState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hasInitial = !!initial && Object.keys(initial).length > 0;
    let base = initialBookingState;
    if (hasInitial) {
      base = { ...initialBookingState, ...initial };
    } else {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) base = { ...initialBookingState, ...JSON.parse(raw) };
      } catch {
        /* storage unavailable */
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(base);
    setHydrated(true);
  }, [initial]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stripPreview(state)));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<BookingState>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(initialBookingState);
  }, []);

  const value = useMemo(() => ({ state, hydrated, update, reset }), [state, hydrated, update, reset]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}

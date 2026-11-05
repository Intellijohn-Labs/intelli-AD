"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { brandFor } from "@/data/brand-colors";
import { getNewspaper, newspapers } from "@/data/newspapers";
import type { Newspaper } from "@/lib/types";

const KEY = "intelliad.activePublication";
const DEFAULT_ID = "malayala-manorama";

interface Ctx {
  activeId: string;
  paper: Newspaper;
  setActive: (id: string) => void;
}
const PublicationContext = createContext<Ctx | null>(null);

/** Global "active publication" shared by the masthead bar, rate card, wizard and templates. */
export function PublicationProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(DEFAULT_ID);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && getNewspaper(saved)) setActiveId(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Retheme the whole page to the active publication's colours.
  useEffect(() => {
    const b = brandFor(activeId);
    document.documentElement.style.setProperty("--brand", b.primary);
    document.documentElement.style.setProperty("--brand-accent", b.accent);
  }, [activeId]);

  const setActive = useCallback((id: string) => {
    if (!getNewspaper(id)) return;
    setActiveId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ activeId, setActive, paper: getNewspaper(activeId) ?? newspapers[0] }), [activeId, setActive]);
  return <PublicationContext.Provider value={value}>{children}</PublicationContext.Provider>;
}

export function usePublication() {
  const ctx = useContext(PublicationContext);
  if (!ctx) throw new Error("usePublication must be used inside <PublicationProvider>");
  return ctx;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, PLACES } from "@/lib/translations";

export type Lang = "en" | "ml";
const KEY = "intelliad.lang";

type Vars = Record<string, string | number>;

function interpolate(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
}

/** English source strings are the dictionary keys; unknown strings fall back to English. */
export function translate(lang: Lang, en: string, vars?: Vars) {
  const ml = lang === "ml" ? dict[en]?.[0] : undefined;
  return interpolate(ml ?? en, vars);
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate an English source string from the dictionary. */
  t: (en: string, vars?: Vars) => string;
  /** Pick from explicit data fields (English / Malayalam). */
  tl: (en: string, ml?: string) => string;
  /** Localise an edition or edition-group name. */
  place: (name: string) => string;
  /** Publication name in the active language. */
  pn: (paper: { name: string; nameMl: string }) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Restore the saved choice after mount (server render is always English).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "en" || saved === "ml") setLangState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (en, vars) => translate(lang, en, vars),
      tl: (en, ml) => (lang === "ml" && ml ? ml : en),
      place: (name) => (lang === "ml" ? (PLACES[name] ?? name) : name),
      pn: (paper) => (lang === "ml" ? paper.nameMl : paper.name),
    }),
    [lang, setLang],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
export const useLanguage = useI18n;

/** Inline translated text for use inside server components. */
export function T({ k, vars }: { k: string; vars?: Vars }) {
  const { t } = useI18n();
  return <>{t(k, vars)}</>;
}

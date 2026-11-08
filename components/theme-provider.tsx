"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const THEME_STORAGE_KEY = "intelliad.theme";
type Theme = "light" | "dark" | "system";

/**
 * Runs before first paint (rendered once by the root layout, a server component) so the saved theme is on <html>
 * with no flash. Kept out of the client provider because React 19 warns about <script> inside client components.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"light";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}`;

interface Ctx {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}
const ThemeContext = createContext<Ctx | null>(null);

const prefersDark = () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
const resolve = (t: Theme): "light" | "dark" => (t === "dark" || (t === "system" && prefersDark()) ? "dark" : "light");

function apply(mode: "light" | "dark") {
  const el = document.documentElement;
  // Switch without animating every element's colours.
  const style = document.createElement("style");
  style.appendChild(document.createTextNode("*,*::before,*::after{transition:none!important}"));
  document.head.appendChild(style);
  el.classList.toggle("dark", mode === "dark");
  el.style.colorScheme = mode;
  window.getComputedStyle(document.body);
  window.setTimeout(() => style.remove(), 1);
}

/** Class-based light/dark theme with the same storage key and `useTheme` shape the app used before. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    let saved: Theme = "light";
    try { saved = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "light"; } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(saved);
    setResolved(resolve(saved));
  }, []);

  // Follow the OS while set to "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => { const m = resolve("system"); setResolved(m); apply(m); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const m = resolve(t);
    setResolved(m);
    apply(m);
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

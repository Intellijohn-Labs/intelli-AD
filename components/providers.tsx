"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/theme-provider";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageProvider } from "@/context/language-context";
import { PublicationProvider } from "@/lib/publication";
import { useEffect } from "react";
import { loadRates } from "@/lib/use-rates";

/** Loads live publication rates once per page load; the calculator uses built-in rates until (or unless) they arrive. */
function RatesSync() {
  useEffect(() => { void loadRates(); }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider><RatesSync /><PublicationProvider>{children}</PublicationProvider></AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </MotionConfig>
    </ThemeProvider>
  );
}

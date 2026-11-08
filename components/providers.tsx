"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/theme-provider";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageProvider } from "@/context/language-context";
import { PublicationProvider } from "@/lib/publication";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider><PublicationProvider>{children}</PublicationProvider></AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </MotionConfig>
    </ThemeProvider>
  );
}

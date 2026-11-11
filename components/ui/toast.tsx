"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Variant = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  variant: Variant;
}
/** `toast(message)` shows a success toast (✓); `toast.error(message)` a destructive one (red, alert icon). */
export type ToastFn = ((message: string, variant?: Variant) => void) & { error: (message: string) => void };
const ToastContext = createContext<{ toast: ToastFn } | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useMemo<ToastFn>(() => {
    const show = (message: string, variant: Variant = "success") => {
      const id = ++counter;
      setItems((l) => [...l.slice(-2), { id, message, variant }]);
      window.setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), variant === "error" ? 5000 : 3200);
    };
    return Object.assign(show, { error: (message: string) => show(message, "error") });
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {items.map((i) => (
            <motion.div
              key={i.id}
              layout
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              role={i.variant === "error" ? "alert" : undefined}
              className={i.variant === "error"
                ? "pointer-events-auto flex max-w-sm items-start gap-2 rounded bg-red-700 px-4 py-3 text-sm font-medium text-white shadow-md"
                : "pointer-events-auto flex items-center gap-2 rounded bg-[#0F172A] px-4 py-3 text-sm font-medium text-white shadow-md dark:bg-[#FFFFFF] dark:text-[#0F172A]"}
            >
              {i.variant === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />} {i.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

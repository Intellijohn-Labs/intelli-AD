"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
}
const ToastContext = createContext<{ toast: (message: string) => void } | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string) => {
    const id = ++counter;
    setItems((l) => [...l.slice(-2), { id, message }]);
    window.setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 3200);
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
              className="pointer-events-auto flex items-center gap-2 rounded bg-[#0F172A] px-4 py-3 text-sm font-medium text-white shadow-md dark:bg-[#eaeaea] dark:text-[#0F172A]"
            >
              <Check className="h-4 w-4" aria-hidden="true" /> {i.message}
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

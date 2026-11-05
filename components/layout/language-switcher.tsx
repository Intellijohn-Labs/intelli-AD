"use client";

import { motion } from "framer-motion";
import { useI18n, type Lang } from "@/context/language-context";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Lang; label: string; aria: string }[] = [
  { id: "en", label: "EN", aria: "English" },
  { id: "ml", label: "മലയാളം", aria: "മലയാളം" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div role="group" aria-label="Language" className={cn("relative flex rounded-full border border-navy-200 bg-white/70 p-0.5 text-xs font-semibold", className)}>
      {OPTIONS.map((o) => (
        <button key={o.id} type="button" aria-pressed={lang === o.id} aria-label={o.aria} onClick={() => setLang(o.id)} className={cn("relative rounded-full px-3 py-1.5 transition-colors", lang === o.id ? "text-white" : "text-zinc-600 hover:text-zinc-900")}>
          {lang === o.id && <motion.span layoutId="lang-pill" aria-hidden="true" className="absolute inset-0 rounded-full bg-gradient-to-r from-navy-600 to-navy-500" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

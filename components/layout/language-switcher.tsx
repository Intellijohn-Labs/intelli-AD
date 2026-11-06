"use client";

import { useI18n, type Lang } from "@/context/language-context";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Lang; label: string; aria: string }[] = [
  { id: "en", label: "EN", aria: "English" },
  { id: "ml", label: "മലയാളം", aria: "മലയാളം" },
];

/** Segmented pill: the active language is a white chip lifted off the grey track. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div role="group" aria-label="Language" className={cn("inline-flex items-center rounded-full bg-slate-100 p-1 text-xs font-semibold dark:bg-[#202125]", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={lang === o.id}
          aria-label={o.aria}
          onClick={() => setLang(o.id)}
          className={cn(
            "rounded-full transition-all",
            lang === o.id
              ? "bg-white px-2.5 py-1 text-slate-900 shadow-xs dark:bg-[#2a2b30] dark:text-white"
              : "px-2 py-1 text-slate-500 hover:text-slate-800 dark:text-[#9a9ba2] dark:hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

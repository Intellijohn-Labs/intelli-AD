"use client";

import { useI18n } from "@/context/language-context";

export function BookHeader() {
  const { t, lang } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl dark:text-zinc-50">
        {lang === "en" ? (
          <>
            Book your{" "}
            <span className="sketch-underline bg-gradient-to-r from-navy-600 to-indigo-500 bg-clip-text text-transparent">newspaper ad</span>
          </>
        ) : (
          <span className="bg-gradient-to-r from-navy-600 to-indigo-500 bg-clip-text text-transparent">{t("Book your newspaper ad")}</span>
        )}
      </h1>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-sans text-base font-medium tracking-normal text-zinc-600 sm:text-lg dark:text-zinc-300">{t("Four quick steps. Live pricing updates as you go.")}</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t("Live Pricing Engine")}
        </span>
      </div>
    </div>
  );
}

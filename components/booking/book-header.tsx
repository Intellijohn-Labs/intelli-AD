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
            <span className="sketch-underline text-navy-700">newspaper ad</span>
          </>
        ) : (
          <span className="text-navy-700">{t("Book your newspaper ad")}</span>
        )}
      </h1>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-sans text-base font-medium tracking-normal text-zinc-600 sm:text-lg dark:text-zinc-300">{t("Four quick steps. Live pricing updates as you go.")}</p>
        <span className="inline-flex items-center gap-2 rounded-sm border border-dashed border-zinc-500 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-700">
          <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
          {t("Live Pricing Engine")}
        </span>
      </div>
    </div>
  );
}

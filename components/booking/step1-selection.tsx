"use client";

import { motion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AD_TYPES, categories, getCategory } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { brandFor } from "@/data/brand-colors";
import { AD_TYPE_TINT, CATEGORY_TINT } from "@/lib/tints";
import { useBooking } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { usePublication } from "@/lib/publication";
import { comboSuggestions, flagshipEdition, startingRate } from "@/lib/pricing";
import { validateStep1 } from "@/lib/validation";
import { cn, formatINR } from "@/lib/utils";
import { StepNav } from "./step-nav";

export function Step1Selection() {
  const { state, update } = useBooking();
  const { t, tl, place, pn } = useI18n();
  const [open, setOpen] = useState<string | null>(() => Object.keys(state.selection)[0] ?? newspapers[0].id);
  const [scope, setScope] = useState<"all" | "national" | "regional">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { activeId, setActive } = usePublication();
  const firstRun = useRef(true);

  // Masthead bar switched the active paper: open its panel and make sure it has an edition.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const paper = newspapers.find((n) => n.id === activeId);
    if (!paper) return;
    const alreadyOpen = open === activeId; // the user expanded the panel themselves
    setOpen(activeId);
    setScope("all");
    setQuery("");
    if (!alreadyOpen && !(state.selection[activeId]?.length)) update({ selection: { ...state.selection, [activeId]: [flagshipEdition(paper).id] } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const visible = useMemo(
    () =>
      newspapers.filter(
        (n) =>
          (scope === "all" || n.scope === scope) &&
          (!query || (n.name + n.nameMl + n.language + n.editions.map((e) => e.name).join(" ")).toLowerCase().includes(query.toLowerCase())),
      ),
    [scope, query],
  );

  const setEditions = (paperId: string, ids: string[]) => {
    const selection = { ...state.selection };
    if (ids.length) selection[paperId] = ids;
    else delete selection[paperId];
    update({ selection });
  };

  const total = Object.values(state.selection).reduce((a, ids) => a + ids.length, 0);
  const cardBase = "relative cursor-pointer rounded-md border p-4 transition-[border-color,background-color,box-shadow] duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500";
  const cardMotion = {};
  const Tick = () => (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }} className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-sm bg-[#0F172A] text-white dark:bg-[#FFFFFF] dark:text-[#0F172A]" aria-hidden="true">
      <Check className="h-3 w-3" />
    </motion.span>
  );

  return (
    <div className="space-y-8">
      {state.templateTitle && (
        <p className="rounded border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/20 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">
          {t("Template loaded: {title}. Pick your publications, then edit the text in the next step.", { title: state.templateTitle })}
        </p>
      )}

      <fieldset>
        <legend className="mb-3 text-lg font-bold text-navy-900">{t("1. Ad type")}</legend>
        <div className="grid grid-cols-3 gap-4">
          {AD_TYPES.map((a) => (
            <motion.label key={a.id} {...cardMotion} className={cn(cardBase, AD_TYPE_TINT[a.id].base, state.adType === a.id && AD_TYPE_TINT[a.id].on)}>
              <input type="radio" name="adType" className="sr-only" checked={state.adType === a.id} onChange={() => update({ adType: a.id })} />
              {state.adType === a.id && <Tick />}
              <span className="block text-sm font-bold">{t(a.label)}</span>
              <span className="mt-1 block text-xs text-zinc-600">{t(a.description)}</span>
            </motion.label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold text-navy-900">{t("2. Category")}</legend>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <motion.label key={c.id} {...cardMotion} className={cn(cardBase, "flex flex-col items-start gap-1.5", CATEGORY_TINT[c.id].base, state.categoryId === c.id && CATEGORY_TINT[c.id].on)}>
              <input type="radio" name="category" className="sr-only" checked={state.categoryId === c.id} onChange={() => update({ categoryId: c.id })} />
              {state.categoryId === c.id && <Tick />}
              <CategoryIcon name={c.icon} className="h-5 w-5" />
              <span className="text-sm font-bold">{tl(c.name, c.nameMl)}</span>
              {c.badge && <span className="text-xs text-zinc-500">{tl(c.badge.en, c.badge.ml)}</span>}
              {c.documents.some((d) => d.required) && <Badge tone="amber">{t("Documents needed")}</Badge>}
            </motion.label>
          ))}
        </div>
        {state.categoryId && (() => {
          const c = getCategory(state.categoryId)!;
          return <p className="mt-2 text-sm text-zinc-600">{tl(c.description, c.descriptionMl)}</p>;
        })()}
      </fieldset>

      <section aria-labelledby="pubs-h">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 id="pubs-h" className="text-lg font-bold text-navy-900">
            {t("3. Publications & editions")} <span className="text-sm font-normal text-zinc-500">{t("({n} selected)", { n: total })}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <Input aria-label={t("Search paper or city…")} placeholder={t("Search paper or city…")} className="h-9 w-48" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div role="group" aria-label="Publication scope" className="flex rounded border border-zinc-300 bg-white p-0.5 text-xs font-semibold">
              {(["all", "national", "regional"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)} className={cn("rounded-md px-2.5 py-1.5", scope === s ? "bg-navy-800 text-white" : "text-zinc-600 hover:bg-zinc-100")}>
                  {t(s === "all" ? "All" : s === "national" ? "National" : "Regional")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {visible.length === 0 && <p className="text-sm text-zinc-500">{t("No publications match your search.")}</p>}
          {visible.map((paper) => {
            const selected = state.selection[paper.id] ?? [];
            const isOpen = open === paper.id;
            const rate = startingRate(paper, state.adType);
            const suggestions = comboSuggestions(paper.id, selected);
            return (
              <motion.div key={paper.id} className={cn("overflow-hidden rounded-md border transition-shadow duration-300", selected.length ? "ring-2 ring-[var(--c)]" : "hover:ring-1 hover:ring-[var(--c)]")} style={{ ["--c" as string]: brandFor(paper.id).primary, backgroundColor: `color-mix(in srgb, ${brandFor(paper.id).primary} 6%, var(--surface))`, borderColor: `color-mix(in srgb, ${brandFor(paper.id).primary} ${selected.length ? 70 : 28}%, var(--surface))`, boxShadow: selected.length ? `0 0 22px color-mix(in srgb, ${brandFor(paper.id).primary} 25%, transparent)` : undefined }}>
                <button type="button" aria-expanded={isOpen} aria-controls={`panel-${paper.id}`} onClick={() => { setOpen(isOpen ? null : paper.id); if (!isOpen) setActive(paper.id); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <span>
                    <span className="text-lg font-bold">{pn(paper)}</span>
                    <span className="ml-2 inline-flex gap-1.5 align-middle">
                      <Badge tone="slate">{t(paper.language)}</Badge>
                      <Badge tone={paper.scope === "national" ? "navy" : "green"}>{t(paper.scope)}</Badge>
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {t("{n}M readers", { n: parseFloat(paper.readership) })} · {t("from {price}/{unit}", { price: formatINR(rate.amount), unit: t(rate.unit) })}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {selected.length > 0 && <Badge>{t("{n} selected", { n: selected.length })}</Badge>}
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>
                {isOpen && (
                  <div id={`panel-${paper.id}`} className="border-t border-zinc-200/80 px-4 py-3">
                    {suggestions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <button key={s.groupId} type="button" onClick={() => setEditions(paper.id, [...new Set([...selected, ...s.missingEditionIds])])} className="inline-flex items-center gap-1.5 rounded border border-dashed border-zinc-500 bg-transparent px-3 py-1.5 font-mono text-xs font-semibold text-zinc-800 hover:bg-black/5 dark:bg-amber-500/20">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t("Add all {group} editions for {pct}% off", { group: place(s.groupName), pct: s.discountPct })}
                            <span className="font-normal">(+{s.missingEditionIds.length})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {paper.groups.map((g) => {
                      const eds = paper.editions.filter((e) => e.groupId === g.id);
                      const all = eds.every((e) => selected.includes(e.id));
                      return (
                        <div key={g.id} className="mb-3 last:mb-0">
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{place(g.name)}</p>
                            {eds.length > 1 && (
                              <button type="button" className="text-xs font-semibold text-navy-700 hover:underline" onClick={() => setEditions(paper.id, all ? selected.filter((id) => !eds.some((e) => e.id === id)) : [...new Set([...selected, ...eds.map((e) => e.id)])])}>
                                {all ? t("Clear") : t("Select all · {pct}% off", { pct: g.bundleDiscountPct })}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {eds.map((e) => {
                              const on = selected.includes(e.id);
                              return (
                                <label key={e.id} className={cn("cursor-pointer rounded border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", on ? "border-navy-600 bg-navy-700 text-white" : "border-zinc-300 bg-white hover:border-navy-400")}>
                                  <input type="checkbox" className="sr-only" checked={on} onChange={() => setEditions(paper.id, on ? selected.filter((id) => id !== e.id) : [...selected, e.id])} />
                                  {place(e.name)}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      <StepNav
        error={error}
        onNext={() => {
          const err = validateStep1(state);
          setError(err);
          if (!err) update({ step: 2 });
        }}
      />
    </div>
  );
}

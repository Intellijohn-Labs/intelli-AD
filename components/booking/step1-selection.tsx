"use client";

import { motion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AD_TYPES, categories, getCategory } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import { useRateAvailability } from "@/lib/use-rates";
import { editionEnabled, visibleEditions } from "@/lib/rates";
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
import { isDisplayOnlyCategory } from "@/lib/display";
import { cn, formatINR } from "@/lib/utils";
import { StepNav } from "./step-nav";
import type { CategoryId } from "@/lib/types";

export function Step1Selection() {
  const { state, update } = useBooking();
  const { t, tl, place, pn } = useI18n();
  const [open, setOpen] = useState<string | null>(() => Object.keys(state.selection)[0] ?? newspapers[0].id);
  const [scope, setScope] = useState<"all" | "national" | "regional">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { activeId, setActive } = usePublication();
  const firstRun = useRef(true);
  const [pendingCategory, setPendingCategory] = useState<CategoryId | null>(null);
  const switchCategory = (id: CategoryId) => {
    setPendingCategory(null);
    update({ categoryId: id, text: "", artwork: null, obituary: null, tender: null, documents: {}, templateTitle: null });
  };
  const { loaded, canPrice } = useRateAvailability();
  const edOk = (paper: (typeof newspapers)[number], editionName: string) => editionEnabled(paper.name, editionName) && canPrice(paper.name, editionName, state.categoryId, state.adType);
  const availableFor = (paper: (typeof newspapers)[number]) => visibleEditions(paper).some((e) => edOk(paper, e.name));

  // Drop papers that lost their rate sheet (e.g. from a saved draft) so they can't be booked.
  useEffect(() => {
    if (!loaded) return;
    const cleaned: Record<string, string[]> = {};
    for (const [id, eds] of Object.entries(state.selection)) {
      const p = newspapers.find((n) => n.id === id);
      const ok = p ? eds.filter((eid) => { const e = p.editions.find((x) => x.id === eid); return !!e && edOk(p, e.name); }) : [];
      if (ok.length) cleaned[id] = ok;
    }
    if (JSON.stringify(cleaned) !== JSON.stringify(state.selection)) update({ selection: cleaned });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state.selection, state.adType, state.categoryId]);

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
          (!query || (n.name + n.nameMl + n.language + visibleEditions(n).map((e) => e.name).join(" ")).toLowerCase().includes(query.toLowerCase())),
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
              <input type="radio" name="category" className="sr-only" checked={state.categoryId === c.id} onChange={() => {
                if (state.categoryId === c.id) return;
                // Category-specific content (template text, memorial photo, notice fields) must not leak into another category.
                const hasContent = !!state.text.trim() || !!state.artwork || !!state.obituary || !!state.tender;
                // Ask inline (a native confirm() blocks the whole tab).
                if (hasContent && state.categoryId) { setPendingCategory(c.id); return; }
                switchCategory(c.id);
              }} />
              {state.categoryId === c.id && <Tick />}
              <CategoryIcon name={c.icon} className="h-5 w-5" />
              <span className="text-sm font-bold">{tl(c.name, c.nameMl)}</span>
              {c.badge && <span className="text-xs text-zinc-500">{tl(c.badge.en, c.badge.ml)}</span>}
              {isDisplayOnlyCategory(c.id) && <Badge tone="navy">{state.adType === "classified-text" ? t("Billed per line") : state.adType === "classified-display" ? t("Billed by size (cm²)") : t("Billed by size")}</Badge>}
              {c.documents.some((d) => d.required) && <Badge tone="amber">{t("Documents needed")}</Badge>}
            </motion.label>
          ))}
        </div>
        {pendingCategory && (
          <div role="alertdialog" aria-label="Confirm category change" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <span className="flex-1">{t("Switching category clears your ad text, photo and notice details. Continue?")}</span>
            <button type="button" onClick={() => switchCategory(pendingCategory)} className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">{t("Yes, switch")}</button>
            <button type="button" onClick={() => setPendingCategory(null)} className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold">{t("Cancel")}</button>
          </div>
        )}
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
            const locked = !availableFor(paper);
            return (
              <motion.div key={paper.id} aria-disabled={locked || undefined} className={cn("overflow-hidden rounded-md border transition-shadow duration-300", locked && "pointer-events-none cursor-not-allowed opacity-50", selected.length ? "ring-2 ring-[var(--c)]" : "hover:ring-1 hover:ring-[var(--c)]")} style={{ ["--c" as string]: brandFor(paper.id).primary, backgroundColor: `color-mix(in srgb, ${brandFor(paper.id).primary} 6%, var(--surface))`, borderColor: `color-mix(in srgb, ${brandFor(paper.id).primary} ${selected.length ? 70 : 28}%, var(--surface))`, boxShadow: selected.length ? `0 0 22px color-mix(in srgb, ${brandFor(paper.id).primary} 25%, transparent)` : undefined }}>
                <button type="button" aria-expanded={isOpen} aria-controls={`panel-${paper.id}`} disabled={locked} tabIndex={locked ? -1 : undefined} onClick={() => { setOpen(isOpen ? null : paper.id); if (!isOpen) setActive(paper.id); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <span>
                    <span className="text-lg font-bold">{pn(paper)}</span>
                    <span className="ml-2 inline-flex gap-1.5 align-middle">
                      <Badge tone="slate">{t(paper.language)}</Badge>
                      <Badge tone={paper.scope === "national" ? "navy" : "green"}>{t(paper.scope)}</Badge>
                      {locked && <Badge tone="amber">{t(loaded ? "Rates Updating / Unavailable" : "Checking rates…")}</Badge>}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {t("{n}M readers", { n: parseFloat(paper.readership) })} · {rate ? t("from {price}/{unit}", { price: formatINR(rate.amount), unit: t(rate.unit) }) : t(loaded ? "Rates not yet published by admin" : "Checking rates…")}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {selected.length > 0 && <Badge>{t("{n} selected", { n: selected.length })}</Badge>}
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>
                {isOpen && !locked && (
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
                      const eds = visibleEditions(paper).filter((e) => e.groupId === g.id);
                      if (!eds.length) return null; // group with no enabled editions: hidden
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
                                <label key={e.id} title={edOk(paper, e.name) ? undefined : t("Rates not yet published by admin")} className={cn(!edOk(paper, e.name) && "pointer-events-none cursor-not-allowed opacity-50", "cursor-pointer rounded border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", on ? "border-navy-600 bg-navy-700 text-white" : "border-zinc-300 bg-white hover:border-navy-400")}>
                                  <input type="checkbox" className="sr-only" checked={on} disabled={!edOk(paper, e.name)} onChange={() => setEditions(paper.id, on ? selected.filter((id) => id !== e.id) : [...selected, e.id])} />
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

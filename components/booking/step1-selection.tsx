"use client";

import { motion } from "framer-motion";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AD_TYPES, categories, getCategory } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import { useRateAvailability, useRatesVersion } from "@/lib/use-rates";
import { combosFor, districtMatches, editionEnabled, getActiveExtras, visibleEditions } from "@/lib/rates";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { brandFor } from "@/data/brand-colors";
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
  useRatesVersion(); // re-render when imported combo packages load
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

  const districtHits = useMemo(() => districtMatches(query), [query]); // Idukki, Wayanad, Kasaragod, Pathanamthitta... → the edition that serves them
  const visible = useMemo(
    () =>
      newspapers.filter(
        (n) =>
          (scope === "all" || n.scope === scope) &&
          (!query || (n.name + n.nameMl + n.language + visibleEditions(n).map((e) => e.name).join(" ")).toLowerCase().includes(query.toLowerCase()) || districtHits.some((d) => d.editions.some((ed) => visibleEditions(n).some((e) => e.name === ed)))),
      ),
    [scope, query, districtHits],
  );

  const setEditions = (paperId: string, ids: string[]) => {
    const selection = { ...state.selection };
    if (ids.length) selection[paperId] = ids;
    else delete selection[paperId];
    update({ selection });
  };

  const total = Object.values(state.selection).reduce((a, ids) => a + ids.length, 0);
  const cardBase = "relative cursor-pointer rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_22px_-10px_rgba(15,23,42,0.14)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600";
  const cardOn = "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/15";
  const tag = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-none font-semibold";
  const cardMotion = {};
  const Tick = () => (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }} className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white" aria-hidden="true">
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
        <legend className="mb-2.5 text-sm font-semibold text-slate-900">{t("Ad type")}</legend>
        <div className="grid grid-cols-3 gap-4">
          {AD_TYPES.map((a) => (
            <motion.label key={a.id} {...cardMotion} className={cn(cardBase, state.adType === a.id && cardOn)}>
              <input type="radio" name="adType" className="sr-only" checked={state.adType === a.id} onChange={() => update({ adType: a.id })} />
              {state.adType === a.id && <Tick />}
              <span className="block pr-6 text-sm font-semibold text-slate-900">{t(a.label)}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{t(a.description)}</span>
              <span className={cn(tag, "mt-2.5 border-slate-200 bg-slate-50 text-slate-600")}>{a.id === "classified-text" ? t("Per line") : t("Per cm²")}</span>
            </motion.label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold text-slate-900">{t("Category")}</legend>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <motion.label key={c.id} {...cardMotion} className={cn(cardBase, "flex flex-col items-start gap-1.5", state.categoryId === c.id && cardOn)}>
              <input type="radio" name="category" className="sr-only" checked={state.categoryId === c.id} onChange={() => {
                if (state.categoryId === c.id) return;
                // Category-specific content (template text, memorial photo, notice fields) must not leak into another category.
                const hasContent = !!state.text.trim() || !!state.artwork || !!state.obituary || !!state.tender;
                // Ask inline (a native confirm() blocks the whole tab).
                if (hasContent && state.categoryId) { setPendingCategory(c.id); return; }
                switchCategory(c.id);
              }} />
              {state.categoryId === c.id && <Tick />}
              <span className={cn("grid h-9 w-9 place-items-center rounded-xl", state.categoryId === c.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}><CategoryIcon name={c.icon} className="h-[18px] w-[18px]" /></span>
              <span className="mt-0.5 text-sm font-semibold text-slate-900">{tl(c.name, c.nameMl)}</span>
              {c.badge && <span className="text-xs text-slate-500">{tl(c.badge.en, c.badge.ml)}</span>}
              <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {isDisplayOnlyCategory(c.id) && <span className={cn(tag, "border-slate-200 bg-slate-50 text-slate-600")}>{state.adType === "classified-text" ? t("Per line") : t("Per cm²")}</span>}
                {c.documents.some((d) => d.required) && <span className={cn(tag, "border-amber-200 bg-amber-50 text-amber-700")}>{t("Docs required")}</span>}
              </span>
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
          <h3 id="pubs-h" className="text-sm font-semibold text-slate-900">
            {t("Publications & editions")} <span className="text-sm font-normal text-zinc-500">{t("({n} selected)", { n: total })}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <Input aria-label={t("Search paper or city…")} placeholder={t("Search paper or city…")} className="h-9 w-48" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div role="group" aria-label="Publication scope" className="flex rounded-xl border border-slate-200/70 bg-white p-0.5 text-xs font-semibold">
              {(["all", "national", "regional"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)} className={cn("rounded-lg px-2.5 py-1.5 transition-colors", scope === s ? "bg-[#0F172A] text-white" : "text-slate-600 hover:bg-slate-100")}>
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
              <motion.div key={paper.id} aria-disabled={locked || undefined} className={cn("overflow-hidden rounded-2xl border transition-all duration-150", locked && "pointer-events-none cursor-not-allowed opacity-50", selected.length ? "" : "hover:-translate-y-0.5 hover:border-slate-300")} style={{ ["--c" as string]: brandFor(paper.id).primary, backgroundColor: "#fff", borderColor: selected.length ? "#2563EB" : "rgb(226 232 240 / .7)", boxShadow: selected.length ? "0 0 0 2px rgba(37,99,235,.15), 0 8px 22px -12px rgba(15,23,42,.25)" : "0 2px 10px -3px rgba(15,23,42,.06)" }}>
                <button type="button" aria-expanded={isOpen} aria-controls={`panel-${paper.id}`} disabled={locked} tabIndex={locked ? -1 : undefined} onClick={() => { setOpen(isOpen ? null : paper.id); if (!isOpen) setActive(paper.id); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <span>
                    <span className="text-lg font-bold">{pn(paper)}</span>
                    <span className="ml-2 inline-flex gap-1.5 align-middle">
                      <Badge tone="slate">{t(paper.language)}</Badge>
                      <Badge tone={paper.scope === "national" ? "navy" : "green"}>{t(paper.scope)}</Badge>
                      {locked && <Badge tone="amber">{t(loaded ? "Rate card pending" : "Checking rates…")}</Badge>}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {t("{n}M readers", { n: parseFloat(paper.readership) })} · {rate ? t("from {price}/{unit}", { price: formatINR(rate.amount), unit: t(rate.unit) }) : t(loaded ? "Rate not available — upload rate card" : "Checking rates…")}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {selected.length > 0 && <Badge>{t("{n} selected", { n: selected.length })}</Badge>}
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>
                {isOpen && !locked && (
                  <div id={`panel-${paper.id}`} className="border-t border-zinc-200/80 px-4 py-3">
                    {districtHits.map((d) => {
                      const edName = d.editions.find((n) => visibleEditions(paper).some((e) => e.name === n));
                      const ed = edName ? visibleEditions(paper).find((e) => e.name === edName) : null;
                      if (!ed) return null;
                      const on = selected.includes(ed.id), ok = edOk(paper, ed.name);
                      return (
                        <p key={d.district} className="mb-2 flex flex-wrap items-center gap-2 rounded border border-dashed border-zinc-400 bg-white/60 px-3 py-1.5 text-sm">
                          <span><b>{d.district}</b> {edName === d.district ? t("has its own edition") : t("is covered by the {edition} edition", { edition: place(ed.name) })}</span>
                          <button type="button" disabled={!ok} onClick={() => setEditions(paper.id, on ? selected : [...selected, ed.id])} className="rounded border border-navy-600 px-2 py-0.5 text-xs font-semibold text-navy-700 hover:bg-navy-50 disabled:opacity-50">{on ? t("Selected") : ok ? t("Select {edition}", { edition: place(ed.name) }) : t("Rate not available — upload rate card")}</button>
                        </p>
                      );
                    })}
                    {suggestions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <button key={s.groupId} type="button" onClick={() => setEditions(paper.id, [...new Set([...selected, ...s.missingEditionIds])])} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 dark:bg-amber-500/20">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t("Add all {group} editions for {pct}% off", { group: place(s.groupName), pct: s.discountPct })}
                            <span className="font-normal">(+{s.missingEditionIds.length})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {(() => {
                      // Combo packages from the imported rate card: one click selects every edition the package includes.
                      const pkgs = combosFor(getActiveExtras(), paper.name).map((c) => {
                        const eds = c.includes.map((n) => visibleEditions(paper).find((e) => e.name.trim().toLowerCase() === n.trim().toLowerCase()));
                        const rate = c.rates.filter((r) => r.ad_type === state.adType && (r.category === "all" || r.category === state.categoryId)).sort((a, b) => Number(b.category !== "all") - Number(a.category !== "all"))[0];
                        return { name: c.name, ids: eds.every(Boolean) ? eds.map((e) => e!.id) : [], rate };
                      }).filter((c) => c.ids.length >= 2 && c.rate && (c.rate.sq_cm_rate > 0 || (c.rate.word_rate ?? 0) > 0));
                      const slabs = combosFor(getActiveExtras(), paper.name).filter((c) => c.tier).map((c) => {
                        const rate = c.rates.find((r) => r.ad_type === state.adType && (r.category === "all" || r.category === state.categoryId));
                        const per = (rate?.word_rate ?? 0) > 0 ? `${formatINR(rate!.word_rate!)}/${t("word")}` : (rate?.sq_cm_rate ?? 0) > 0 ? `${formatINR(rate!.sq_cm_rate)}/cm²` : "";
                        return per ? { name: c.name, per } : null;
                      }).filter((x): x is { name: string; per: string } => !!x);
                      if (!pkgs.length && !slabs.length) return null;
                      return (
                        <div className="mb-3">
                          {pkgs.length > 0 && <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">{t("Combo packages")}</p>}
                          <div className="flex flex-wrap gap-2">
                            {pkgs.map((c) => {
                              const on = c.ids.every((id) => selected.includes(id));
                              return (
                                <button key={c.name} type="button" aria-pressed={on} onClick={() => setEditions(paper.id, on ? selected.filter((id) => !c.ids.includes(id)) : [...new Set([...selected, ...c.ids])])}
                                  className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all duration-150", on ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50")}>
                                  {c.name} <span className="font-normal opacity-80">· {(c.rate!.word_rate ?? 0) > 0 ? `${formatINR(c.rate!.word_rate!)}/${t("word")}` : state.display.colorMode === "color" && (c.rate!.color_sq_cm_rate ?? 0) > 0 ? `${formatINR(c.rate!.color_sq_cm_rate!)}/cm² (${t("Colour")})` : `${formatINR(c.rate!.sq_cm_rate)}/cm² (${t("B/W")})`}</span>
                                </button>
                              );
                            })}
                          </div>
                          {slabs.length > 0 && <p className="mt-1.5 text-xs text-zinc-500">{t("Multi-edition slab rates apply automatically when you pick that many editions")}: {slabs.map((x) => `${x.name} ${x.per}`).join(" · ")}</p>}
                        </div>
                      );
                    })()}
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
                                <label key={e.id} title={edOk(paper, e.name) ? undefined : t("Rate not available — upload rate card")} className={cn(!edOk(paper, e.name) && "pointer-events-none cursor-not-allowed opacity-50", "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600", on ? "border-blue-600 bg-blue-600 text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.5)]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50")}>
                                  <input type="checkbox" className="sr-only" checked={on} disabled={!edOk(paper, e.name)} onChange={() => setEditions(paper.id, on ? selected.filter((id) => id !== e.id) : [...selected, e.id])} />
                                  {place(e.name)}
                                </label>
                              );
                            })}
                          </div>
                          {eds.some((e) => !edOk(paper, e.name)) && (
                            <p className="mt-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">{t("Rate not available — upload rate card")}: {eds.filter((e) => !edOk(paper, e.name)).map((e) => place(e.name)).join(", ")}</p>
                          )}
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

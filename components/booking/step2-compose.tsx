"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { getCategory, templatesFor } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useBooking } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { useBookingQuote } from "@/lib/use-quote";
import { formatINR } from "@/lib/utils";
import { ENHANCEMENT_PCT, measureText } from "@/lib/pricing";
import { composeSchema, MAX_TEXT_CHARS, PLACEHOLDER_RE, requiredDocIds, type ComposeValues } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { FileDropzone } from "./file-dropzone";
import { ObituaryComposer } from "./templates/obituary-template";
import { StepNav } from "./step-nav";

const COLUMN_OPTIONS = [
  { n: 1, label: "Single column" },
  { n: 2, label: "Double column" },
  { n: 3, label: "3 columns" },
  { n: 4, label: "4 columns" },
];

export function Step2Compose() {
  const { state, update } = useBooking();
  const { t, tl, pn } = useI18n();
  const liveQuote = useBookingQuote(state);
  const category = getCategory(state.categoryId);
  const docs = category?.documents ?? [];
  const isText = state.adType === "classified-text";
  const isObituary = state.categoryId === "obituary";
  const paperIds = Object.keys(state.selection).filter((k) => state.selection[k].length);
  const paper = getNewspaper(paperIds[0]);
  const rates = paper?.rates;
  const cpl = rates?.charsPerLine ?? 28;

  const schema = useMemo(() => composeSchema(state.adType, requiredDocIds(state.categoryId)), [state.adType, state.categoryId]);
  const form = useForm<ComposeValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ComposeValues>,
    mode: "onChange",
    defaultValues: {
      text: state.text,
      columns: state.display.columns,
      heightCm: state.display.heightCm,
      colorMode: state.display.colorMode,
      enhancements: state.enhancements,
      artwork: state.artwork,
      documents: state.documents,
    },
  });
  const { register, control, watch, setValue, handleSubmit, formState } = form;
  const errors = formState.errors;
  const v = watch();

  // Keep the shared booking state (and therefore the live quote) in sync with the form.
  useEffect(() => {
    const sub = watch((val) => {
      update({
        text: val.text ?? "",
        enhancements: { bold: !!val.enhancements?.bold, border: !!val.enhancements?.border, tint: !!val.enhancements?.tint },
        display: {
          columns: val.columns ?? 2,
          heightCm: Number.isFinite(val.heightCm) ? (val.heightCm as number) : 10,
          colorMode: val.colorMode ?? "bw",
        },
        artwork: (val.artwork as ComposeValues["artwork"]) ?? null,
        documents: (val.documents ?? {}) as ComposeValues["documents"],
      });
    });
    return () => sub.unsubscribe();
  }, [watch, update]);

  const m = measureText(v.text ?? "", cpl);
  const placeholders = (v.text ?? "").match(new RegExp(PLACEHOLDER_RE, "g"))?.length ?? 0;
  const tpls = templatesFor(state.categoryId);
  const requiredDone = docs.filter((d) => d.required && v.documents?.[d.id]).length;
  const requiredTotal = docs.filter((d) => d.required).length;

  return (
    <form onSubmit={handleSubmit(() => update({ step: 3 }))} noValidate>
      <div>
        <div className="space-y-6">
          {isObituary && (
            <ObituaryComposer
              onText={(txt) => setValue("text", txt, { shouldValidate: true, shouldDirty: true })}
              onSize={(c, h) => { setValue("columns", c, { shouldValidate: true }); setValue("heightCm", h, { shouldValidate: true }); }}
            />
          )}
          {isText ? (
            <>
              <div>
                {tpls.length > 0 && (
                  <Field id="tpl" label={t("Start from a template")} className="mb-4" hint={t("Replaces the current text.")}>
                    <Select
                      id="tpl"
                      defaultValue=""
                      onChange={(e) => {
                        const t = tpls.find((x) => x.id === e.target.value);
                        if (t) setValue("text", t.body, { shouldValidate: true, shouldDirty: true });
                      }}
                    >
                      <option value="">{t("Choose a {category} template…", { category: tl(category?.name ?? "", category?.nameMl) })}</option>
                      {tpls.map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          {tl(tp.title, tp.titleMl)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field id="ad-text" label={t("Ad text")} required error={errors.text?.message} hint={t("Write as it should appear in print. Abbreviations save lines.")}>
                  <Textarea
                    id="ad-text"
                    rows={8}
                    placeholder={t("Type your ad content here")}
                    spellCheck
                    aria-invalid={!!errors.text}
                    aria-describedby={`ad-text-${errors.text ? "error" : "hint"} ad-counts`}
                    className="font-clipping text-[15px] leading-relaxed"
                    {...register("text")}
                  />
                </Field>
                <div id="ad-counts" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600" aria-live="polite">
                  <span className="font-bold text-zinc-900">{t("Word Counter")}</span>
                  <span className={cn(m.chars > MAX_TEXT_CHARS && "font-bold text-red-700 dark:text-red-200")}>
                    {t("{chars}/{max} characters", { chars: m.chars, max: MAX_TEXT_CHARS })}
                  </span>
                  <span>{t("{n} words", { n: m.words })}</span>
                  <span>
                    <AnimatedNumber value={m.lines} className="font-semibold tabular-nums" /> {t(" Lines ({min} base) • Extra Lines: {rate}/line", { min: rates?.textMinLines ?? 3, rate: formatINR(liveQuote.lines[0]?.rate ?? 0) })}
                  </span>
                  {placeholders > 0 && <Badge tone="amber">{t("{n} placeholder(s) to fill", { n: placeholders })}</Badge>}
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-bold">{t("Visual enhancements")}</legend>
                <Controller control={control} name="enhancements.bold" render={({ field }) => <Switch id="enh-bold" label={t("Bold text")} description={t("+{pct}% of text charge", { pct: ENHANCEMENT_PCT.bold * 100 })} checked={field.value} onChange={field.onChange} />} />
                <Controller control={control} name="enhancements.border" render={({ field }) => <Switch id="enh-border" label={t("Border box")} description={t("+{pct}% of text charge", { pct: ENHANCEMENT_PCT.border * 100 })} checked={field.value} onChange={field.onChange} />} />
                <Controller control={control} name="enhancements.tint" render={({ field }) => <Switch id="enh-tint" label={t("Background tint")} description={t("+{pct}% of text charge", { pct: ENHANCEMENT_PCT.tint * 100 })} checked={field.value} onChange={field.onChange} />} />
              </fieldset>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">{t("Ad size")}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COLUMN_OPTIONS.map((o) => (
                    <label key={o.n} className={cn("cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", v.columns === o.n ? "border-navy-600 bg-gradient-to-r from-navy-600 to-navy-500 text-white" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-zinc-800")}>
                      <input type="radio" className="sr-only" checked={v.columns === o.n} onChange={() => setValue("columns", o.n, { shouldValidate: true })} />
                      {t(o.label)}
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <Field id="height" label={t("Height (cm)")} required error={errors.heightCm?.message} className="w-40">
                    <Input id="height" type="number" step="0.5" min={3} max={60} inputMode="decimal" aria-invalid={!!errors.heightCm} aria-describedby={errors.heightCm ? "height-error" : undefined} {...register("heightCm", { valueAsNumber: true })} />
                  </Field>
                  <div className="flex gap-1.5 pb-1" role="group" aria-label="Quick heights">
                    {[5, 8, 10, 15, 20].map((h) => (
                      <button key={h} type="button" onClick={() => setValue("heightCm", h, { shouldValidate: true })} className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:border-navy-400">
                        {h} cm
                      </button>
                    ))}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-bold">{t("Colour mode")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["bw", "color"] as const).map((c) => (
                    <label key={c} className={cn("cursor-pointer rounded-lg border px-3 py-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", v.colorMode === c ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white dark:bg-zinc-800")}>
                      <input type="radio" className="sr-only" checked={v.colorMode === c} onChange={() => setValue("colorMode", c)} />
                      <span className="font-semibold">{c === "bw" ? t("Black & white") : t("Full colour")}</span>
                      <span className="block text-xs text-zinc-500">{c === "bw" ? t("Standard rate") : t("+{pct}% colour premium", { pct: rates?.colorPremiumPct ?? 40 })}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Controller
                control={control}
                name="artwork"
                render={({ field }) => (
                  <FileDropzone label={isObituary ? t("Portrait photo / artwork") : t("Artwork")} required hint={t("PDF, JPG or PNG · print-ready at 300 dpi · up to 25 MB")} value={field.value} onChange={field.onChange} error={errors.artwork?.message} />
                )}
              />
            </>
          )}

          {docs.length > 0 && (
            <section aria-labelledby="docs-h" className="rounded-xl border border-amber-300/70 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 id="docs-h" className="font-bold text-amber-950 dark:text-amber-200">
                  {t("Supporting documents — {category}", { category: tl(category?.name ?? "", category?.nameMl) })}
                </h3>
                {requiredTotal > 0 && (
                  <Badge tone={requiredDone === requiredTotal ? "green" : "amber"}>
                    {t("{done}/{total} required", { done: requiredDone, total: requiredTotal })}
                  </Badge>
                )}
              </div>
              <p className="mb-3 text-xs text-amber-900/80">{t("Legally sensitive notices are verified by the publication before they go to print.")}</p>
              <div className="space-y-4">
                {docs.map((d) => (
                  <Controller
                    key={d.id}
                    control={control}
                    name={`documents.${d.id}` as `documents.${string}`}
                    render={({ field }) => (
                      <FileDropzone
                        label={t(d.label)}
                        hint={t(d.hint)}
                        required={d.required}
                        maxMb={10}
                        value={field.value}
                        onChange={(f) => {
                          const next = { ...(v.documents ?? {}) };
                          if (f) next[d.id] = f;
                          else delete next[d.id];
                          setValue("documents", next, { shouldValidate: true, shouldDirty: true });
                        }}
                        error={(errors.documents as Record<string, { message?: string }> | undefined)?.[d.id]?.message}
                      />
                    )}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

      </div>
      <StepNav onBack={() => update({ step: 1 })} onNext={() => void handleSubmit(() => update({ step: 3 }))()} />
    </form>
  );
}

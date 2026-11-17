"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { getCategory, templatesFor } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Field, FieldError, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useBooking } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { useBookingQuote } from "@/lib/use-quote";
import { formatINR } from "@/lib/utils";
import { measureText } from "@/lib/pricing";
import { composeSchema, MAX_TEXT_CHARS, PLACEHOLDER_RE, requiredDocIds, type ComposeValues } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { FileDropzone } from "./file-dropzone";
import { CreativeUpload } from "./creative-upload";
import { DisplaySizer } from "./display-sizer";
import { columnsFor, displayWidth, isDisplayOnlyCategory, type CreativeMode } from "@/lib/display";
import { uploadArtwork } from "@/lib/supabase/storage";
import { CanvaReturn } from "./canva-return";
import type { FileMeta } from "@/lib/types";
import { ObituaryComposer } from "./templates/obituary-template";
import { TenderComposer } from "./templates/tender-template";
import { StepNav } from "./step-nav";
import { InteractiveMatterComposer } from "./interactive-matter-composer";
import { NewspaperPreviewModal } from "./newspaper-preview-modal";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateComposer } from "./template-composer";
import { applySpacing } from "@/lib/paragraphs";
import { getActiveRates, matchRate, paperConfig } from "@/lib/rates";
import { useRatesVersion } from "@/lib/use-rates";
import { addonsFor, commonPositions, getActiveExtras } from "@/lib/rates";

const FIELD_LABEL: Record<string, string> = { text: "Ad text", artwork: "Artwork", heightCm: "Height", widthCm: "Width", columns: "Size", documents: "Supporting documents", colorMode: "Colour mode", enhancements: "Enhancements" };

export function Step2Compose() {
  const { state, update } = useBooking();
  const { t, tl, pn } = useI18n();
  const liveQuote = useBookingQuote(state);
  const category = getCategory(state.categoryId);
  const docs = category?.documents ?? [];
  // Obituary, remembrance and tender can be booked either way. The visual builder / upload paths apply to their display bookings.
  const isText = state.adType === "classified-text";
  const displayOnly = isDisplayOnlyCategory(state.categoryId) && !isText;
  const mode: CreativeMode = displayOnly ? state.creativeMode : "builder";
  const isObituary = state.categoryId === "obituary" || state.categoryId === "remembrance";
  const isTender = state.categoryId === "tender";
  const paperIds = Object.keys(state.selection).filter((k) => state.selection[k].length);
  const paper = getNewspaper(paperIds[0]);
  const rates = paper?.rates;
  useRatesVersion();
  // Published rule for the first chosen edition: the only source of colour surcharge and per-line prices.
  const firstEdition = paper?.editions.find((e) => state.selection[paper.id]?.includes(e.id));
  const rule = paper && firstEdition ? matchRate(getActiveRates(), paper.name, firstEdition.name, state.categoryId, state.adType) : null;
  const colourPct = rule?.color_surcharge_percent ?? 0;
  // Page positions and add-on percentages exist only when the selected publications' rate cards print them.
  const extras = getActiveExtras();
  const selectedPaperNames = paperIds.map((id) => getNewspaper(id)?.name).filter((n): n is string => !!n);
  const positions = commonPositions(extras, selectedPaperNames);
  const pctOf = (k: "tint_percent" | "underline_percent" | "box_percent") => [...new Set(selectedPaperNames.map((n) => addonsFor(extras, n)[k]).filter((x): x is number => !!x))];
  const tintPcts = pctOf("tint_percent"), underlinePcts = pctOf("underline_percent"), boxPcts = pctOf("box_percent");
  // Highlighter symbol: a flat fee printed on the card, by number of editions booked.
  const hlTiers = selectedPaperNames.map((n) => addonsFor(extras, n).highlighter).find((h) => h?.length) ?? null;
  const editionCount = paperIds.reduce((a, id) => a + (state.selection[id]?.length ?? 0), 0);
  const hlFee = hlTiers?.find((h) => editionCount >= h.min && (h.max == null || editionCount <= h.max))?.fee ?? null;
  const cfg = paper ? paperConfig(paper, state.adType) : null;
  const cpl = rates?.charsPerLine ?? 28;
  const colW = rates?.colWidthCm ?? 4;

  const schema = useMemo(() => composeSchema(state.adType, requiredDocIds(state.categoryId), displayOnly ? mode : "std"), [state.adType, state.categoryId, displayOnly, mode]);
  const form = useForm<ComposeValues>({
    resolver: zodResolver(schema) as unknown as Resolver<ComposeValues>,
    mode: "onChange",
    defaultValues: {
      text: state.text,
      columns: state.display.columns,
      widthCm: displayWidth(state.display, colW),
      heightCm: state.display.heightCm,
      colorMode: state.display.colorMode,
      position: state.display.position ?? "",
      enhancements: { ...state.enhancements, tick: !!state.enhancements.tick, underline: !!state.enhancements.underline, highlighter: !!state.enhancements.highlighter, caps: !!state.enhancements.caps },
      artwork: state.artwork,
      documents: state.documents ?? {},
    },
  });
  const { register, control, watch, setValue, getValues, handleSubmit, formState } = form;
  const errors = formState.errors;
  const v = watch();

  // Edits made in the proof box (inline text, bold/border toolbar, replaced photo) land in the booking state;
  // mirror them into the form so it never writes stale values back.
  useEffect(() => {
    const cur = getValues();
    if (state.text !== cur.text) setValue("text", state.text, { shouldValidate: true });
    if ((state.artwork?.previewUrl ?? null) !== (cur.artwork?.previewUrl ?? null) || (state.artwork?.name ?? null) !== (cur.artwork?.name ?? null) || (state.artwork?.url ?? null) !== (cur.artwork?.url ?? null)) setValue("artwork", state.artwork, { shouldValidate: true });
    const e = state.enhancements, c = cur.enhancements;
    if (e.bold !== c.bold || e.border !== c.border || e.tick !== c.tick || e.tint !== c.tint || !!e.underline !== !!c.underline || !!e.highlighter !== !!c.highlighter || !!e.caps !== !!c.caps) setValue("enhancements", e);
  }, [state.text, state.artwork, state.enhancements, getValues, setValue]);

  // Keep the shared booking state (and therefore the live quote) in sync with the form.
  useEffect(() => {
    const sub = watch((val) => {
      update({
        text: val.text ?? "",
        enhancements: { bold: !!val.enhancements?.bold, border: !!val.enhancements?.border, tick: !!val.enhancements?.tick, tint: !!val.enhancements?.tint, underline: !!val.enhancements?.underline, highlighter: !!val.enhancements?.highlighter, caps: !!val.enhancements?.caps },
        display: {
          columns: val.columns ?? 2,
          widthCm: Number.isFinite(val.widthCm) ? (val.widthCm as number) : undefined,
          heightCm: Number.isFinite(val.heightCm) ? (val.heightCm as number) : 10,
          colorMode: val.colorMode ?? "bw",
          position: val.position || undefined,
        },
        artwork: (val.artwork as ComposeValues["artwork"]) ?? null,
        documents: (val.documents ?? {}) as ComposeValues["documents"],
      });
    });
    return () => sub.unsubscribe();
  }, [watch, update]);

  // A failed "Continue" must always say why, never fail silently.
  const [issues, setIssues] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [tried, setTried] = useState(false); // has the user pressed Continue yet?
  const toast = useToast();
  // Leftover [placeholders] are a normal part of editing a template: the amber chips guide the user, and the red
  // message only appears after Continue was pressed.
  const textError = errors.text?.message && !tried && errors.text.message.startsWith("Please replace template placeholders") ? undefined : errors.text?.message;

  const onInvalid = (errs: FieldErrors<ComposeValues>) => {
    const found: string[] = [];
    const walk = (node: unknown, path: string[]) => {
      if (!node || typeof node !== "object") return;
      const n = node as { message?: unknown; [k: string]: unknown };
      if (typeof n.message === "string") { found.push(`${FIELD_LABEL[path[0]] ?? path.join(" › ")}: ${n.message}`); return; }
      for (const [k, v] of Object.entries(n)) if (k !== "ref") walk(v, [...path, k]);
    };
    walk(errs, []);
    const list = found.length ? [...new Set(found)] : ["Some details are missing or invalid. Please review the form."];
    if (process.env.NODE_ENV !== "production") console.warn("[Step 2] validation notice", list);
    setTried(true);
    setIssues(list);
    toast(list[0]);
    requestAnimationFrame(() => document.getElementById("step2-issues")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  // Coming back from checkout to edit: saving returns straight to step 4, skipping Schedule.
  const returning = state.returnToCheckout;
  const next = returning ? { step: 4 as const, returnToCheckout: false } : { step: 3 as const };

  const setSize = (w: number, h: number) => {
    setValue("widthCm", w, { shouldValidate: true });
    setValue("heightCm", h, { shouldValidate: true });
    if (Number.isFinite(w) && w > 0) setValue("columns", columnsFor(w, colW));
  };
  const setMode = (next: CreativeMode) => {
    if (next === mode) return;
    update({ creativeMode: next });
    setValue("artwork", null, { shouldValidate: false }); // the portrait / logo and a finished creative are different files
  };

  const m = measureText(applySpacing(v.text ?? "", state.paragraphSpacing), cpl);
  const placeholders = (v.text ?? "").match(new RegExp(PLACEHOLDER_RE, "g"))?.length ?? 0;
  const tpls = templatesFor(state.categoryId);
  const textPlaceholder =
    state.categoryId === "obituary" || state.categoryId === "remembrance"
      ? "ഇവിടെ അനുശോചന കുറിപ്പുകൾ പാരഗ്രാഫുകളായി ടൈപ്പ് ചെയ്യുക (ഉദാ: ഞങ്ങളുടെ പ്രിയപ്പെട്ട... നിത്യശാന്തി നേരുന്നു)..."
      : state.categoryId === "tender"
        ? "വിശദമായ ടെൻഡർ വിവരങ്ങളും നിബന്ധനകളും ഇവിടെ നൽകുക..."
        : "Enter property/job details in clear paragraphs...";
  const requiredDone = docs.filter((d) => d.required && v.documents?.[d.id]).length;
  const requiredTotal = docs.filter((d) => d.required).length;

  return (
    <form onSubmit={handleSubmit(() => { setIssues([]); update(next); }, onInvalid)} noValidate>
      <div>
        <div className="space-y-6">
          {displayOnly && <PathPicker mode={mode} onMode={setMode} />}
          {displayOnly && (
            <DisplaySizer
              widthCm={v.widthCm}
              heightCm={v.heightCm}
              colorMode={v.colorMode}
              colorPremiumPct={colourPct}
              minAreaCm2={cfg?.minSqCm ?? 0}
              quote={liveQuote}
              errors={{ widthCm: errors.widthCm?.message, heightCm: errors.heightCm?.message }}
              onSize={setSize}
              onColor={(c) => setValue("colorMode", c)}
              positions={positions}
              position={v.position ?? ""}
              onPosition={(id) => setValue("position", id, { shouldDirty: true })}
            />
          )}
          {(!isText || isObituary || isTender) && (
            <CanvaReturn
              widthCm={v.widthCm}
              heightCm={v.heightCm}
              attachedName={v.artwork?.name}
              onAttach={(file) => {
                // A design returned from Canva becomes the ad artwork (same path as an uploaded file or a generated poster).
                const meta: FileMeta = { name: file.name, size: file.size, type: file.type, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined };
                if (displayOnly) update({ creativeMode: "upload" });
                setValue("artwork", meta, { shouldValidate: true, shouldDirty: true });
                void uploadArtwork(file).then((r) => { if (r.url) setValue("artwork", { ...meta, url: r.url }, { shouldValidate: true, shouldDirty: true }); });
              }}
            />
          )}
          {displayOnly && mode === "upload" && (
            <Controller control={control} name="artwork" render={({ field }) => <CreativeUpload value={field.value} onChange={field.onChange} widthCm={v.widthCm} heightCm={v.heightCm} error={errors.artwork?.message} />} />
          )}
          {displayOnly && mode === "builder" && textError && <FieldError message={textError} />}
          {isObituary && (isText || mode === "builder") && (
            <ObituaryComposer
              charsPerLine={cpl}
              colWidthCm={colW}
              onPoster={(file, meta) => {
                // The generated poster is a finished creative: switch to the upload path and make it the ad artwork.
                update({ creativeMode: "upload" });
                setValue("artwork", meta, { shouldValidate: true, shouldDirty: true });
                void uploadArtwork(file).then((r) => { if (r.url) setValue("artwork", { ...meta, url: r.url }, { shouldValidate: true, shouldDirty: true }); });
              }}
              onColor={(c) => setValue("colorMode", c, { shouldDirty: true })}
              onText={(txt) => setValue("text", txt, { shouldValidate: true, shouldDirty: true })}
              onPhoto={(f) => setValue("artwork", f, { shouldValidate: true, shouldDirty: true })}
            />
          )}
          {isTender && (isText || mode === "builder") && (
            <TenderComposer
              onText={(txt) => setValue("text", txt, { shouldValidate: true, shouldDirty: true })}
              logoSlot={
                <Controller
                  control={control}
                  name="artwork"
                  render={({ field }) => (
                    <FileDropzone
                      logo
                      label="Organisation / department logo"
                      hint="PNG, JPG or SVG · shown at the top of the notice · up to 25 MB"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.artwork?.message}
                    />
                  )}
                />
              }
            />
          )}
          {isText ? (
            <>
              <TemplateComposer
                categoryId={state.categoryId}
                newspaper={paper?.name}
                categoryLabel={category?.name}
                value={v.text ?? ""}
                onChange={(txt) => setValue("text", v.enhancements?.caps ? txt.toUpperCase() : txt, { shouldValidate: true, shouldDirty: true })}
                error={textError}
                hint={t("Write as it should appear in print. Press Enter for a new paragraph. Abbreviations save lines.")}
                charsPerLine={cpl}
                maxChars={MAX_TEXT_CHARS}
                spacing={state.paragraphSpacing}
                onSpacing={(sp) => update({ paragraphSpacing: sp })}
                extra={
                  <>
                    {(rule?.word_rate ?? 0) > 0
                      ? <span><AnimatedNumber value={m.words} className="font-semibold tabular-nums" /> {t("words × {rate}/word", { rate: formatINR(rule!.word_rate!) })}{rule?.min_words ? ` · ${t("min {n} words", { n: rule.min_words })}` : ""}</span>
                      : <span><AnimatedNumber value={m.lines} className="font-semibold tabular-nums" /> {t(" Lines ({min} base) • Extra Lines: {rate}/line", { min: cfg?.minLines ?? 3, rate: formatINR(rule?.extra_line_rate ?? 0) })}</span>}
                    {placeholders > 0 && <Badge tone="amber">{t("{n} placeholder(s) to fill", { n: placeholders })}</Badge>}
                  </>
                }
              />

              <fieldset className="space-y-2 rounded-lg border border-zinc-300 bg-white p-4 dark:border-white/15 dark:bg-[#101113]">
                <legend className="px-1 text-sm font-bold">{t("Ad Enhancements / Styling")}</legend>
                {([
                  ["bold", "enh-bold", "Bold First Line / Heading", (rule?.word_rate ?? 0) > 0 ? rule?.heading_line_rate ?? 0 : rule?.bold_heading_rate ?? 0],
                  ["tick", "enh-tick", "Tick Mark (✔) at Beginning", rule?.tick_rate ?? 0],
                  ["border", "enh-border", "Border / Box Outline", rule?.border_rate || (paper ? addonsFor(extras, paper.name).box_fee ?? 0 : 0)],
                ] as const).map(([name, id, label, price]) => (
                  <Controller key={name} control={control} name={`enhancements.${name}`} render={({ field }) => (
                    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5">
                      <input id={id} type="checkbox" className="h-4 w-4 accent-teal-600" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                      <span className="flex-1 text-sm font-medium">{t(label)}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", price > 0 ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200")}>{price > 0 ? `+ ${formatINR(price)}` : name === "border" && boxPcts.length ? `+ ${boxPcts.join(" / ")}%` : t("Free")}</span>
                    </label>
                  )} />
                ))}
                {tintPcts.length > 0 && <Controller control={control} name="enhancements.tint" render={({ field }) => <Switch id="enh-tint" label={t("Background tint")} description={t("+{pct}% of text charge", { pct: tintPcts.join(" / ") })} checked={field.value} onChange={field.onChange} />} />}
                {!/[ഀ-ൿ]/.test(v.text ?? "") && <Controller control={control} name="enhancements.caps" render={({ field }) => <Switch id="enh-caps" label={t("All Caps (UPPERCASE)")} description={(rule?.caps_word_rate ?? 0) > 0 ? t("Capitals rate {rate}/word", { rate: formatINR(rule!.caps_word_rate!) }) : t("Ad copy is set in capitals")} checked={!!field.value} onChange={(on) => { field.onChange(on); if (on) setValue("text", (v.text ?? "").toUpperCase(), { shouldValidate: true, shouldDirty: true }); }} />} />}
                {hlTiers && <Controller control={control} name="enhancements.highlighter" render={({ field }) => <Switch id="enh-highlighter" label={t("Highlighter symbol")} description={hlFee ? t("+{fee} for {n} edition(s)", { fee: formatINR(hlFee), n: editionCount }) : t("Fee depends on the number of editions")} checked={!!field.value} onChange={field.onChange} />} />}
                {underlinePcts.length > 0 && <Controller control={control} name="enhancements.underline" render={({ field }) => <Switch id="enh-underline" label={t("Underline")} description={t("+{pct}% of text charge", { pct: underlinePcts.join(" / ") })} checked={!!field.value} onChange={field.onChange} />} />}
              </fieldset>
            </>
          ) : displayOnly ? null : (
            <>
              <DisplaySizer
                widthCm={v.widthCm}
                heightCm={v.heightCm}
                colorMode={v.colorMode}
                colorPremiumPct={colourPct}
                minAreaCm2={cfg?.minSqCm ?? 0}
                quote={liveQuote}
                errors={{ widthCm: errors.widthCm?.message, heightCm: errors.heightCm?.message }}
                onSize={setSize}
                onColor={(c) => setValue("colorMode", c)}
                positions={positions}
                position={v.position ?? ""}
                onPosition={(id) => setValue("position", id, { shouldDirty: true })}
              />

              <TemplateComposer
                categoryId={state.categoryId}
                newspaper={paper?.name}
                categoryLabel={category?.name}
                value={v.text ?? ""}
                onChange={(txt) => setValue("text", txt, { shouldValidate: true, shouldDirty: true })}
                error={textError}
                hint={t("No artwork yet? Write the ad here and it is set in the box for you. Uploading artwork replaces it.")}
                charsPerLine={cpl}
                maxChars={MAX_TEXT_CHARS}
              />
              <Controller
                control={control}
                name="artwork"
                render={({ field }) => (
                  <FileDropzone label={isObituary ? t("Portrait photo / artwork") : t("Artwork")} hint={t("PDF, JPG or PNG · print-ready at 300 dpi · up to 25 MB · optional if you wrote the ad above")} value={field.value} onChange={field.onChange} error={errors.artwork?.message} />
                )}
              />
            </>
          )}

          {docs.length > 0 && (
            <section aria-labelledby="docs-h" className="rounded-md border border-amber-300/70 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/20 p-4">
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
                        artwork={false}
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
          {!(displayOnly && mode === "upload") && (
            <InteractiveMatterComposer
              value={v.text ?? ""}
              onChange={(txt) => setValue("text", txt, { shouldValidate: true, shouldDirty: true })}
              chars={m.chars}
              words={m.words}
              lines={m.lines}
              charsPerLine={cpl}
              showPhoto={!isText && (displayOnly ? mode === "builder" : false) && isObituary}
            />
          )}
        </div>

      </div>
      {issues.length > 0 && (
        <div id="step2-issues" role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100">
          <p className="font-bold">Fix this to continue:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}
      <StepNav
        onBack={returning ? undefined : () => update({ step: 1 })}
        onNext={() => void handleSubmit(() => { setIssues([]); update(next); }, onInvalid)()}
        nextLabel={returning ? "Save Changes & Return to Checkout" : undefined}
        beforeNext={<Button type="button" variant="secondary" onClick={() => setPreviewing(true)}><Eye className="h-4 w-4" aria-hidden="true" /> {t("Preview Ad")}</Button>}
      />
      {previewing && (
        <NewspaperPreviewModal
          onClose={() => setPreviewing(false)}
          onContinue={() => { setPreviewing(false); void handleSubmit(() => { setIssues([]); update(next); }, onInvalid)(); }}
        />
      )}
    </form>
  );
}

/** Chooses between the two display booking paths. */
function PathPicker({ mode, onMode }: { mode: CreativeMode; onMode: (m: CreativeMode) => void }) {
  const opts: { id: CreativeMode; title: string; sub: string; who: string }[] = [
    { id: "upload", title: "Upload complete creative", sub: "Print-ready PDF, TIFF or high-res JPG, checked for size and dpi", who: "For agencies & businesses" },
    { id: "builder", title: "Smart template builder", sub: "Fill a form and see the finished notice, to scale", who: "For individuals & offices" },
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">How will you provide the ad?</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {opts.map((o) => (
          <label key={o.id} className={cn("cursor-pointer rounded border px-3 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", mode === o.id ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white hover:border-navy-400 dark:bg-[#101113]")}>
            <input type="radio" name="creative-mode" className="sr-only" checked={mode === o.id} onChange={() => onMode(o.id)} />
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">{o.who}</span>
            <span className="block text-sm font-bold">{o.title}</span>
            <span className="block text-xs text-zinc-600 dark:text-slate-200">{o.sub}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

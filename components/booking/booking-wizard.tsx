"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { usePublication } from "@/lib/publication";
import { useToast } from "@/components/ui/toast";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BookingProvider, useBooking, type BookingState, type Step } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { flagshipRate } from "@/lib/pricing";
import { formatClock } from "@/lib/cutoff";
import { useBookingQuote } from "@/lib/use-quote";
import { cn, formatINR } from "@/lib/utils";
import { getAdType, getCategory } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { DisplayPreview, NewspaperPreview } from "./newspaper-preview";
import { ObituaryPreview } from "./templates/obituary-template";
import { TenderPreview } from "./templates/tender-template";
import { PriceBreakdown } from "./price-breakdown";
import { Confirmation } from "./confirmation";
import { Step1Selection } from "./step1-selection";
import { Step2Compose } from "./step2-compose";
import { Step3Schedule } from "./step3-schedule";
import { Step4Checkout } from "./step4-checkout";

const STEPS = [
  { n: 1, label: "Publication & category", title: "Select Publication & Edition" },
  { n: 2, label: "Compose & preview ", title: "Compose Ad" },
  { n: 3, label: "Schedule", title: "Select Release Date" },
  { n: 4, label: "Summary & pay", title: "Review & Checkout" },
] as const;

const slide = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
};

function Stepper({ current, onGo }: { current: Step; onGo: (s: Step) => void }) {
  const { t } = useI18n();
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Booking progress">
      {STEPS.map((s) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <button type="button" disabled={!done} onClick={() => onGo(s.n)} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left disabled:cursor-default", done && "hover:bg-navy-50")}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded border-2 font-mono text-sm font-bold", done ? "border-navy-600 bg-navy-600 text-white" : active ? "border-navy-800 text-navy-800 dark:text-white" : "border-zinc-300 text-zinc-400")}>
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : s.n}
              </span>
              <span className={cn("hidden text-sm font-semibold sm:block", active ? "text-navy-900 dark:text-white" : "text-zinc-500")}>{t(s.label)}</span>
              <span className="sr-only">{done ? "completed" : active ? "current step" : "upcoming"}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function LivePreview({ state }: { state: BookingState }) {
  const { t, tl, pn } = useI18n();
  const category = getCategory(state.categoryId);
  const paperId = Object.keys(state.selection).find((k) => state.selection[k].length);
  const paper = getNewspaper(paperId) ?? undefined;
  const isText = state.adType === "classified-text";
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 border-b border-[#0F172A] pb-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 dark:border-[#3a3b41]">{t("Live preview")}</h3>
      {state.categoryId === "tender" ? (
        <TenderPreview state={state} />
      ) : state.categoryId === "obituary" || state.categoryId === "remembrance" ? (
        <ObituaryPreview state={state} />
      ) : isText ? (
        <NewspaperPreview text={state.text} charsPerLine={paper?.rates.charsPerLine ?? 28} enhancements={state.enhancements} paperName={paper ? pn(paper) : "The Daily"} categoryName={category ? tl(category.name, category.nameMl) : "General"} minLines={paper?.rates.textMinLines ?? 3} />
      ) : (
        <DisplayPreview columns={state.display.columns} heightCm={state.display.heightCm} colWidthCm={paper?.rates.colWidthCm ?? 4} colorMode={state.display.colorMode} imageUrl={state.artwork?.previewUrl} artworkName={state.artwork?.name} />
      )}
    </Card>
  );
}

function MiniSummary({ state }: { state: BookingState }) {
  const { t, tl, pn, place } = useI18n();
  const { paper } = usePublication();
  const quote = useBookingQuote(state);
  const rate = flagshipRate(paper, state.adType);
  const rule = paper.cutoffs[state.adType];
  return (
    <Card className="p-5 sm:p-6">
      <p className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-500">{t("Live estimate")}</p>
      <p className="mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums text-[#0F172A] dark:text-zinc-50"><AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /></p>
      <p className="text-xs text-zinc-500">{t("incl. 18% GST")}</p>
      <dl className="mt-4 space-y-1.5 border-t border-dashed border-zinc-400 pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-zinc-500">{t("Type")}</dt><dd className="font-medium">{t(getAdType(state.adType).short)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("Category")}</dt><dd className="text-right font-medium">{(() => { const c = getCategory(state.categoryId); return c ? tl(c.name, c.nameMl) : "—"; })()}</dd></div>
        <div className="flex justify-between"><dt className="text-zinc-500">{t("Editions")}</dt><dd className="font-medium">{quote.editionCount}</dd></div>
      </dl>
      {quote.editionCount > 0 && (
        <div className="mt-4 border-t border-dashed border-zinc-400 pt-4">
          <PriceBreakdown quote={quote} adType={state.adType} />
        </div>
      )}
      <div className="mt-4 border-t border-dashed border-zinc-400 pt-4 font-mono text-xs text-zinc-600">
        <p className="font-bold text-zinc-950">{pn(paper)}</p>
        <p>{t("{edition}: {price} / {unit}", { edition: place(rate.edition.name), price: formatINR(rate.amount), unit: t(rate.unit) })}</p>
        <p>{t("Cut-off: {n} day(s) before, {time}", { n: rule.daysBefore, time: formatClock(rule.time) })}</p>
      </div>
    </Card>
  );
}

function Shell() {
  const { state, update, reset, hydrated } = useBooking();
  const { t } = useI18n();
  const toast = useToast();
  const [prevStep, setPrevStep] = useState<Step>(state.step);
  const [dir, setDir] = useState(1);
  if (prevStep !== state.step) {
    setDir(state.step > prevStep ? 1 : -1);
    setPrevStep(state.step);
  }
  const templateTitle = hydrated ? state.templateTitle : null;
  useEffect(() => {
    if (templateTitle) toast(t("Template applied: {title}", { title: templateTitle }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateTitle]);

  if (!hydrated) return <p className="py-20 text-center text-zinc-500">{t("Loading your booking…")}</p>;
  if (state.receipt) return <Confirmation receipt={state.receipt} onNew={reset} />;

  const stepEl = { 1: <Step1Selection />, 2: <Step2Compose />, 3: <Step3Schedule />, 4: <Step4Checkout /> }[state.step];
  const showMini = state.step < 4;

  return (
    <div className="space-y-6">
      <Card className="p-3">
        <Stepper current={state.step} onGo={(s) => update({ step: s })} />
      </Card>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Card className={cn("p-5 sm:p-6 lg:p-8", showMini && "lg:col-span-8", !showMini && "lg:col-span-12")}>
          <h2 className="mb-6 font-serif text-2xl font-bold text-[#0F172A] dark:text-zinc-50">{state.step}. {t(STEPS[state.step - 1].title)}</h2>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={state.step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              {stepEl}
            </motion.div>
          </AnimatePresence>
        </Card>
        {showMini && (
          <div className="space-y-6 lg:sticky lg:top-[152px] lg:col-span-4 lg:self-start">
            {(state.step >= 2 || state.text) && <LivePreview state={state} />}
            <MiniSummary state={state} />
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingWizard({ initial }: { initial: Partial<BookingState> }) {
  const { setActive } = usePublication();
  const initialPaper = Object.keys(initial.selection ?? {})[0];
  useEffect(() => {
    if (initialPaper) setActive(initialPaper);
  }, [initialPaper, setActive]);
  return (
    <BookingProvider initial={initial}>
      <Shell />
    </BookingProvider>
  );
}

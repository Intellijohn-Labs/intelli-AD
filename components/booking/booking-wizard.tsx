"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { usePublication } from "@/lib/publication";
import { useToast } from "@/components/ui/toast";
import { Check, Eye, Save, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { saveDraft } from "@/lib/drafts";
import { FullScreenProofEditorModal } from "./full-screen-proof-editor";
import { Card } from "@/components/ui/card";
import { BookingProvider, useBooking, type BookingState, type Step } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { flagshipEdition, flagshipRate, GST_RATE } from "@/lib/pricing";
import { useRateAvailability, useRatesVersion } from "@/lib/use-rates";
import { getActiveExtras, getActiveRates, matchRate } from "@/lib/rates";
import { cutoffRuleFor, formatClock } from "@/lib/cutoff";
import { useBookingQuote } from "@/lib/use-quote";
import { cn, formatINR } from "@/lib/utils";
import { getAdType, getCategory } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { AdRender } from "./ad-render";
import { PriceBreakdown } from "./price-breakdown";
import { Confirmation } from "./confirmation";
import { Step1Selection } from "./step1-selection";
import { Step2Compose } from "./step2-compose";
import { Step3Schedule } from "./step3-schedule";
import { Step4Checkout } from "./step4-checkout";

const STEPS = [
  { n: 1, label: "Publication & Category", title: "Select Publication & Edition" },
  { n: 2, label: "Compose & Preview", title: "Compose Ad" },
  { n: 3, label: "Schedule", title: "Select Release Date" },
  { n: 4, label: "Review & Pay", title: "Review & Checkout" },
] as const;

const slide = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
};

function Stepper({ current, onGo }: { current: Step; onGo: (s: Step) => void }) {
  const { t } = useI18n();
  return (
    <ol className="relative grid grid-cols-4 gap-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)]" aria-label="Booking progress">
      {STEPS.map((s) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} aria-current={active ? "step" : undefined}>
            <button type="button" disabled={!done} onClick={() => onGo(s.n)} className={cn("flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-left transition-colors disabled:cursor-default sm:justify-start sm:px-3", active ? "bg-[#0F172A] text-white shadow-[0_4px_10px_-4px_rgba(15,23,42,0.5)]" : done ? "text-slate-700 hover:bg-slate-50" : "text-slate-400")}>
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums", active ? "bg-white/15 text-white" : done ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : s.n}
              </span>
              <span className="hidden truncate text-sm font-semibold sm:block">{t(s.label)}</span>
              <span className="sr-only">{done ? "completed" : active ? "current step" : "upcoming"}</span>
            </button>
          </li>
        );
      })}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-slate-100"><span className="block h-full bg-[#2563EB] transition-[width] duration-300" style={{ width: `${(current / 4) * 100}%` }} /></span>
    </ol>
  );
}

/** Sticky newsprint proof beside the form; editable in place, with the price recalculating under it. */
function LivePreview({ state }: { state: BookingState }) {
  const quote = useBookingQuote(state);
  const { loaded } = useRateAvailability();
  const isText = state.adType === "classified-text";
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5 sm:p-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Open the full-screen proof editor"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="group relative -m-2 cursor-pointer rounded-2xl p-2 transition-all hover:ring-2 hover:ring-blue-500/50 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <h3 className="mb-4 border-b border-[#0F172A] pb-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 dark:border-[#2B3D6B]">LIVE NEWSPAPER PROOF / അച്ചടി പ്രിവ്യൂ</h3>
        <span aria-hidden="true" className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">🔍 Click to expand &amp; customize layout</span>
        <div className="pointer-events-none"><AdRender state={state} /></div>
      </div>
      {open && <FullScreenProofEditorModal onClose={() => setOpen(false)} />}
      <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-400/30 dark:bg-emerald-500/10" aria-live="polite">
        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{isText ? `${quote.metrics.lines} lines` : `${quote.metrics.areaCm2} cm²`} · estimated cost</span>
        <span className="font-mono text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300">{loaded ? <AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /> : <span aria-label="Loading rates" className="inline-block h-6 w-20 animate-pulse rounded bg-emerald-200 align-middle dark:bg-emerald-400/30" />}</span>
      </div>
    </Card>
  );
}

/**
 * Phones: the proof box sits at the bottom of the page, so a sticky bar keeps the line count and live total in view
 * and opens the proof in a slide-up sheet. The estimate pulses whenever the ad or its price changes.
 */
function MobileProofBar({ state }: { state: BookingState }) {
  const quote = useBookingQuote(state);
  const [open, setOpen] = useState(false);
  const controls = useAnimationControls();
  const first = useRef(true);
  const isText = state.adType === "classified-text";
  const size = isText ? `${quote.metrics.lines} ${quote.metrics.lines === 1 ? "line" : "lines"}` : `${quote.metrics.areaCm2} cm²`;

  // Pulse the estimate so edits are visibly registered without scrolling down to the proof.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    void controls.start({ scale: [1, 1.07, 1], transition: { duration: 0.45, ease: "easeOut" } });
  }, [quote.totals.total, quote.metrics.lines, quote.metrics.areaCm2, controls]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // keep the page still behind the sheet
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_18px_rgba(24,24,27,0.08)] backdrop-blur-md dark:border-[#1F2F57] dark:bg-[#0B132B]/95">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <motion.p animate={controls} className="min-w-0 truncate font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white" aria-live="polite">
            {size} · <span className="text-[#059669] dark:text-emerald-400"><AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /></span>
          </motion.p>
          <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#0F172A] bg-[#0F172A] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]">
            <Eye className="h-4 w-4" aria-hidden="true" /> Preview Ad
          </button>
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[999] flex items-end bg-slate-900/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <motion.div
              role="dialog" aria-modal="true" aria-label="Live newspaper proof"
              className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-[#F6F8FA] p-4 pb-8 shadow-2xl dark:bg-[#0B132B]"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close preview" className="absolute top-4 right-4 rounded-full p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
              <LivePreview state={state} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  );
}

function MiniSummary({ state }: { state: BookingState }) {
  const { t, tl, pn, place } = useI18n();
  const { paper } = usePublication();
  const quote = useBookingQuote(state);
  const { user } = useAuth();
  const toast = useToast();
  const { loaded } = useRateAvailability(); // false until the first rate fetch resolves
  useRatesVersion();
  const floor = flagshipRate(paper, state.adType);
  // Once a category is picked, show the resolved rate row's per-unit rate (extra line / cm²) for the chosen edition
  // (or the flagship one); before that, the paper-level floor rate.
  const edition = paper.editions.find((e) => state.selection[paper.id]?.includes(e.id)) ?? floor?.edition;
  const row = state.categoryId && edition ? matchRate(getActiveRates(), paper.name, edition.name, state.categoryId, state.adType) : null;
  const perWord = state.adType === "classified-text" && (row?.word_rate ?? 0) > 0;
  const unitRate = row ? (perWord ? row.word_rate! : state.adType === "classified-text" ? row.extra_line_rate : row.sq_cm_rate) : 0;
  // No category yet → no rate line (never a stale paper-level "floor" rate such as ₹95/cm²).
  const rate = !state.categoryId ? null : unitRate > 0 && edition ? { amount: unitRate, unit: perWord ? ("word" as const) : state.adType === "classified-text" ? ("line" as const) : ("cm²" as const), edition } : floor;
  const rule = cutoffRuleFor(paper, state.adType);
  // When a combo / slab prices the selection ("Any 2 Editions"), the footer names that package, its rate and the real edition count.
  const paperLines = quote.lines.filter((l) => l.newspaperId === paper.id);
  const pkg = paperLines.find((l) => l.packageName);
  const covered = paperLines.reduce((a, l) => a + (l.editionsCovered ?? 1), 0);
  const capsLine = paperLines.find((l) => l.capsApplied && l.unitLabel === "words" && (l.packageName || l.editionName === edition?.name));
  const capsTag = capsLine ? ` (${t("All Caps")})` : "";
  const unitWord = (u: string) => (u === "words" ? t("word") : u === "lines" ? t("line") : t("cm²"));
  return (
    <Card className="p-5 shadow-lg shadow-slate-900/[0.04] sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-emerald-700 uppercase"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />{t("Live estimate")}</span>
        <span className="text-xs font-medium text-slate-400">{t("Release Order")}</span>
      </div>
      {(() => {
        const posId = state.display.position;
        const posLabel = posId ? (getActiveExtras().find((x) => x.kind === "page_premium" && x.name.split("|")[0] === posId)?.data as { label?: string } | undefined)?.label : "";
        const chips = [
          pkg && { k: "pkg", text: pkg.packageName!, tone: "ink" },
          posLabel && { k: "pos", text: posLabel, tone: "gold" },
          (capsLine || pkg?.capsApplied) && { k: "caps", text: t("All Caps"), tone: "terra" },
          paperLines.some((l) => l.bwOnly) && { k: "bw", text: t("B/W only"), tone: "gold" },
          state.adType !== "classified-text" && state.display.colorMode === "color" && { k: "clr", text: t("Colour"), tone: "terra" },
        ].filter(Boolean) as { k: string; text: string; tone: string }[];
        return chips.length ? <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Active rate options">{chips.map((c) => <li key={c.k} className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", c.tone === "ink" ? "border-[#0F172A] bg-[#0F172A] text-white" : c.tone === "gold" ? "border-[#B45309]/40 bg-[#B45309]/10 text-[#B45309]" : "border-[#2563EB]/40 bg-[#2563EB]/10 text-[#2563EB]")}>{c.text}</li>)}</ul> : null;
      })()}
      <p className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums text-[#0F172A] dark:text-zinc-50">{loaded ? <AnimatedNumber value={quote.totals.total} format={(n) => formatINR(n)} /> : <span aria-label="Loading rates" className="inline-block h-9 w-28 animate-pulse rounded bg-zinc-200 align-middle dark:bg-white/15" />}</p>
      <p className="mt-1.5 text-xs font-medium text-slate-500">{t("incl. {pct}% GST", { pct: Math.round(GST_RATE * 100) })}</p>
      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-zinc-500">{t("Type")}</dt><dd className="font-medium">{t(getAdType(state.adType).short)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-zinc-500">{t("Category")}</dt><dd className="text-right font-medium">{(() => { const c = getCategory(state.categoryId); return c ? tl(c.name, c.nameMl) : "—"; })()}</dd></div>
        <div className="flex justify-between"><dt className="text-zinc-500">{t("Editions")}</dt><dd className="font-medium">{quote.editionCount}</dd></div>
      </dl>
      {quote.editionCount > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <PriceBreakdown quote={quote} adType={state.adType} />
        </div>
      )}
      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 tabular-nums">
        <p className="font-bold text-zinc-950">{pn(paper)}</p>
        {!loaded ? <span aria-label="Loading rates" className="mt-1 block h-3.5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-white/15" /> : pkg ? <p>{t("{edition}: {price} / {unit}", { edition: pkg.packageName! + (pkg.capsApplied ? ` (${t("All Caps")})` : ""), price: formatINR(pkg.appliedRate ?? pkg.rate), unit: unitWord(pkg.unitLabel) })} · {t("{n} editions", { n: covered })}</p> : rate ? <p>{t("{edition}: {price} / {unit}", { edition: place(rate.edition.name) + capsTag, price: formatINR(capsLine ? capsLine.rate : rate.amount), unit: capsLine ? unitWord("words") : t(rate.unit) })}{covered > 1 ? ` · ${t("{n} editions", { n: covered })}` : ""}</p> : !state.categoryId ? <p>{t("Select a category to see the rate")}</p> : <p>{t("Rate not available — upload rate card")}</p>}
        <p>{t("Cut-off: {n} day(s) before, {time}", { n: rule.daysBefore, time: formatClock(rule.time) })}</p>
      </div>
      {state.step < 4 && (
        <button type="button" onClick={() => (document.querySelector("[data-step-next]") as HTMLButtonElement | null)?.click()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_8px_16px_-8px_rgba(15,23,42,0.5)] transition-all hover:-translate-y-px hover:bg-[#1E293B]">
          {t(state.step === 1 ? "Continue to Compose" : state.step === 2 ? "Continue to Schedule" : "Continue to Review")} →
        </button>
      )}
      {user && (
        <button type="button" onClick={() => toast(saveDraft(user.identifier, state) ? "Draft saved to Ad Drafts" : "Couldn't save the draft in this browser")}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/20 dark:hover:bg-white/10">
          <Save className="h-4 w-4" /> {t("Save as draft")}
        </button>
      )}
    </Card>
  );
}

function Shell() {
  const { state, update, reset, hydrated } = useBooking();
  const { activeId, paper: activePaper } = usePublication();
  const lastActive = useRef<string | null>(null);
  const { t } = useI18n();
  const toast = useToast();
  const [prevStep, setPrevStep] = useState<Step>(state.step);
  const [dir, setDir] = useState(1);
  if (prevStep !== state.step) {
    setDir(state.step > prevStep ? 1 : -1);
    setPrevStep(state.step);
  }
  // The publication chosen in the top bar wins over whatever an earlier visit left in session storage: on load, and
  // whenever it changes while still choosing publications (step 1), the selection follows it.
  useEffect(() => {
    if (!hydrated || state.step !== 1) return;
    const first = lastActive.current === null;
    if (lastActive.current === activeId) return;
    lastActive.current = activeId;
    const chosen = Object.keys(state.selection).filter((k) => state.selection[k].length);
    if (chosen.length === 1 && chosen[0] === activeId) return;
    if (first && chosen.length > 1) return; // a deliberate multi-paper choice from this session
    update({ selection: { [activeId]: [flagshipEdition(activePaper).id] } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, activeId, state.step]);

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
    <div className={cn("space-y-6", showMini && (state.step >= 2 || state.text) && "pb-20 lg:pb-0")}>
      <Card className="p-3">
        <Stepper current={state.step} onGo={(s) => update({ step: s, returnToCheckout: false })} />
      </Card>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Card className={cn("p-5 sm:p-6 lg:p-8", showMini && "lg:col-span-8", !showMini && "lg:col-span-12")}>
          <h2 className="sr-only">{state.step}. {t(STEPS[state.step - 1].title)}</h2>
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
      {showMini && (state.step >= 2 || state.text) && <MobileProofBar state={state} />}
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

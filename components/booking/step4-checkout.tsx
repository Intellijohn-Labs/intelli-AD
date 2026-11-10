"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { getAdType, getCategory } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useBooking } from "@/lib/booking-store";
import { useI18n } from "@/context/language-context";
import { createReceipt, PAYMENT_LABEL, type PaymentMethod } from "@/lib/receipt";
import { useBookingQuote } from "@/lib/use-quote";
import { checkoutSchema, type CheckoutValues } from "@/lib/validation";
import { cn, formatDate, formatINR } from "@/lib/utils";
import { applySpacing } from "@/lib/paragraphs";
import { PriceBreakdown } from "./price-breakdown";
import { ProofCard } from "./proof-card";
import { useToast } from "@/components/ui/toast";
import { buildBookingRow, newBookingRef, saveBooking, supabaseConfigured } from "@/lib/supabase/bookings";

export function Step4Checkout() {
  const { state, update } = useBooking();
  const { t, tl, pn } = useI18n();
  const quote = useBookingQuote(state);
  const [paying, setPaying] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema) as unknown as Resolver<CheckoutValues>,
    defaultValues: { paymentMethod: "upi", fullName: "", email: "", phone: "", company: "", gstin: "", address: "" },
  });
  const method = watch("paymentMethod");

  const onSubmit = async (values: CheckoutValues) => {
    setSaveError(null);
    if (quote.editionCount === 0 || quote.totals.total <= 0) {
      setSaveError("Rates for this ad aren't published yet. Go back and choose a publication with published rates.");
      return;
    }
    // The ad's photo / artwork must already be in storage, or the saved booking would point at nothing.
    if (supabaseConfigured && state.artwork && !state.artwork.url) {
      setSaveError("Your artwork is still uploading or the upload failed. Go back to Compose and wait for “saved”, or upload it again.");
      return;
    }
    setPaying(true);
    const customer = { name: values.fullName, mobile: values.phone, email: values.email, address: values.address, company: values.company || undefined, gstin: values.gstin || undefined };
    // No payment gateway yet, so the booking is stored as pending_payment.
    let ref = newBookingRef();
    let res = await saveBooking(buildBookingRow(state, quote, customer, ref, "pending_payment"));
    for (let i = 0; i < 2 && !res.ok && !res.skipped && /duplicate|unique/i.test(res.error ?? ""); i++) {
      ref = newBookingRef(); // reference collision: draw another
      res = await saveBooking(buildBookingRow(state, quote, customer, ref, "pending_payment"));
    }
    if (!res.ok && !res.skipped) {
      setPaying(false);
      setSaveError(`We couldn't save your booking (${res.error}). Nothing was charged. Please try again.`);
      return;
    }
    if (res.skipped) toast("Database is not configured, so this booking was not saved online.");
    // Mock payment gateway: simulate a short processing delay.
    window.setTimeout(() => {
      const receipt = createReceipt(
        state,
        quote,
        { fullName: values.fullName, email: values.email, phone: values.phone, company: values.company || undefined, gstin: values.gstin || undefined, address: values.address },
        values.paymentMethod as PaymentMethod,
        res.ref ?? ref,
      );
      update({ receipt });
    }, 1500);
  };

  const papers = Object.keys(state.selection).filter((k) => state.selection[k].length);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-6">
        <ProofCard state={state} onEdit={() => update({ step: 2, returnToCheckout: true })} />
        <section aria-labelledby="sum-h" className="rounded-md border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
          <h3 id="sum-h" className="mb-2 text-lg font-bold text-navy-900 dark:text-zinc-50">{t("Order summary")}</h3>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wider text-zinc-500">{t("Ad type")}</dt><dd className="font-semibold">{t(getAdType(state.adType).label)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-zinc-500">{t("Category")}</dt><dd className="font-semibold">{(() => { const c = getCategory(state.categoryId); return c ? tl(c.name, c.nameMl) : ""; })()}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-zinc-500">{t("Release date")}</dt><dd className="font-semibold">{(state.insertionDates?.length ? state.insertionDates : state.releaseDate ? [state.releaseDate] : []).map((d) => formatDate(d)).join(", ")}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-zinc-500">{t("Editions")}</dt><dd className="font-semibold">{papers.map((p) => `${pn(getNewspaper(p)!)} (${state.selection[p].length})`).join(", ")}</dd></div>
          </dl>
          {(state.adType === "classified-text" || (!state.artwork && !!state.text.trim())) && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-zinc-300 bg-paper p-3 font-clipping text-sm text-zinc-900">{applySpacing(state.text, state.paragraphSpacing).trim()}</pre>}
        </section>

        <section aria-labelledby="contact-h" className="space-y-4">
          <h3 id="contact-h" className="text-lg font-bold text-navy-900 dark:text-zinc-50">{t("Advertiser details")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="fullName" label={t("Full name")} required error={errors.fullName?.message}>
              <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "fullName-error" : undefined} {...register("fullName")} />
            </Field>
            <Field id="phone" label={t("Mobile number")} required error={errors.phone?.message}>
              <Input id="phone" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} {...register("phone")} />
            </Field>
            <Field id="email" label={t("Email")} required error={errors.email?.message} className="sm:col-span-2">
              <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
            </Field>
            <Field id="company" label={t("Company (optional)")}>
              <Input id="company" autoComplete="organization" {...register("company")} />
            </Field>
            <Field id="gstin" label={t("GSTIN (optional)")} error={errors.gstin?.message} hint={t("For a GST invoice in the company's name.")}>
              <Input id="gstin" className="uppercase" maxLength={15} aria-invalid={!!errors.gstin} aria-describedby={errors.gstin ? "gstin-error" : "gstin-hint"} {...register("gstin")} />
            </Field>
            <Field id="address" label={t("Billing address")} required error={errors.address?.message} className="sm:col-span-2">
              <Textarea id="address" rows={2} autoComplete="street-address" aria-invalid={!!errors.address} aria-describedby={errors.address ? "address-error" : undefined} {...register("address")} />
            </Field>
          </div>
        </section>

        <fieldset>
          <legend className="mb-2 text-lg font-bold text-navy-900 dark:text-zinc-50">{t("Payment method")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
              <label key={m} className={cn("cursor-pointer rounded border px-3 py-3 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy-500", method === m ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700 dark:bg-navy-900/60" : "border-zinc-300 bg-white dark:bg-zinc-800")}>
                <input type="radio" value={m} className="sr-only" {...register("paymentMethod")} />
                {t(PAYMENT_LABEL[m])}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">{t("Demo checkout: no real payment is taken and no card details are collected.")}</p>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-[152px] lg:self-start">
        <Card className="p-5 sm:p-6">
          <h3 className="mb-3 text-lg font-bold text-navy-900 dark:text-zinc-50">{t("Price breakdown")}</h3>
          <PriceBreakdown quote={quote} adType={state.adType} showEditions />
          <div className="mt-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-800" aria-invalid={!!errors.terms} {...register("terms")} />
              <span>{t("I confirm the ad content is accurate and accept the publication's terms & conditions.")}</span>
            </label>
            {errors.terms && <p role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-200">{t(errors.terms.message ?? "")}</p>}
          </div>
          {saveError && <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-500/20 dark:text-red-200">{saveError}</p>}
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={paying}>
            {paying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t("Processing payment…")}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden="true" /> {t("Pay {amount}", { amount: formatINR(quote.totals.total, { decimals: true }) })}
              </>
            )}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" disabled={paying} onClick={() => update({ step: 3 })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("Back to scheduling")}
          </Button>
        </Card>
      </aside>
    </form>
  );
}

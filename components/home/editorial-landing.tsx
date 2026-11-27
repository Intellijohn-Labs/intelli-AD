"use client";

import { ArrowRight, CalendarCheck, FileCheck2, Newspaper, ReceiptText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { newspapers } from "@/data/newspapers";
import { useI18n } from "@/context/language-context";
import { COMPANY } from "@/lib/company";
import { GST_RATE, startingRate } from "@/lib/pricing";
import { useRatesVersion } from "@/lib/use-rates";
import { formatINR } from "@/lib/utils";

const FEATURED = ["malayala-manorama", "mathrubhumi", "deshabhimani", "madhyamam", "deepika", "kerala-kaumudi", "the-hindu", "times-of-india"];

const STEPS = [
  { n: "1", title: "Choose Publication & Editions", body: "Pick the dailies and the editions you want, or a printed combo package. Tariffs come from each paper's own rate card.", icon: Newspaper },
  { n: "2", title: "Compose & Preview in Newsprint", body: "Type or design your notice and see it set in a real column cut-out, with every style you choose shown as it will print.", icon: FileCheck2 },
  { n: "3", title: "Instant Tariff Quote & Release", body: "The quote is itemised line by line with GST. Confirm, pay and your Release Order is issued straight away.", icon: ReceiptText },
];

/** A tilted classified clipping: the hero's tactile centrepiece. */
function Clipping() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] px-3 py-2" aria-hidden="true">
      <div className="absolute -inset-3 rotate-[2.5deg] rounded-md border border-[#E2E8F0] bg-white shadow-[0_18px_40px_-22px_rgba(24,24,27,.45)]" />
      <div className="clipping relative -rotate-[1.5deg] rounded-sm border border-[#D6D3D1] bg-[#F6F3EC] p-4 shadow-[0_14px_30px_-18px_rgba(24,24,27,.5)]">
        <div className="flex items-baseline justify-between border-b-[3px] border-double border-[#0A0B0D] pb-1.5">
          <span className="text-lg font-black tracking-tight">Malayala Manorama</span>
          <span className="font-mono text-[10px] tracking-widest text-slate-500 uppercase">Kochi · Classifieds</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 text-[11px] leading-snug text-slate-800 [column-rule:1px_solid_rgba(24,24,27,.2)]">
          <div className="space-y-2 border-r border-slate-400/50 pr-3">
            <p><b>MATRIMONIAL</b> Proposals invited for Nair girl, 27, MBA, working at Kochi. Contact 98XXXXXXXX.</p>
            <p className="border border-slate-800 p-1.5"><b>NOTICE</b> Change of name. I, Anil K., now known as Anil Kumar, as per affidavit.</p>
          </div>
          <div className="space-y-2">
            <p className="bg-[#E7DFC9] p-1"><u>FOR SALE</u> 5 cent plot near Kakkanad, clear title. Serious buyers only.</p>
            <p><b>WANTED</b> Salesman for textile showroom, Thrissur. Experience preferred.</p>
          </div>
        </div>
        <p className="mt-3 border-t border-slate-400/60 pt-1.5 font-mono text-[10px] tracking-wider text-slate-500 uppercase">Set in print · proof preview</p>
      </div>
    </div>
  );
}

/** Home page: editorial hero, publication rail, three-step workflow and agency trust strip. */
export function EditorialLanding() {
  const { t } = useI18n();
  useRatesVersion();
  const papers = FEATURED.map((id) => newspapers.find((n) => n.id === id)).filter((n): n is (typeof newspapers)[number] => !!n);
  return (
    <>
      <section className="mx-auto grid max-w-[94rem] items-center gap-10 px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)]"><span className="h-1.5 w-1.5 rounded-full bg-[#D12014]" aria-hidden="true" />{t("Kerala's newspaper advertising desk")}</p>
          <h1 className="mt-4 text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-[#0A0B0D] sm:text-6xl">
            {t("Put your notice in print,")} <span className="bg-gradient-to-r from-[#D12014] to-[#E83E32] bg-clip-text text-transparent">{t("across Kerala")}</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {t("Classifieds, display, obituary and tender ads in the state's leading dailies, priced from each paper's official tariff sheet and released the same day.")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/book" className="btn-ink">{t("Book a Newspaper Ad")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/newspaper#rates" className="btn-paper">{t("Explore Rate Cards")}</Link>
          </div>
        </div>
        <Clipping />
      </section>

      <section aria-labelledby="pubs-h" className="mx-auto max-w-[94rem] px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="pubs-h" className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{t("The papers on our desk")}</h2>
          <Link href="/newspaper" className="text-sm font-semibold text-[#D12014] hover:underline">{t("All publications")} →</Link>
        </div>
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {papers.map((p) => {
            const rate = startingRate(p, "commercial-display");
            return (
              <li key={p.id}>
                <Link href="/newspaper" className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(15,23,42,0.18)] sm:p-5">
                  <div className="min-w-0">
                    <p className="text-base leading-tight font-bold tracking-[-0.03em] break-normal text-[#0A0B0D] sm:text-lg xl:text-xl">{p.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500" style={{ fontFamily: '"Noto Sans Malayalam", Manjari, sans-serif' }}>{p.nameMl}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-xs">
                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{p.language} · {p.scope}</span>
                    {rate
                      ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums">{t("Live tariff")} · {formatINR(rate.amount)}/{rate.unit}</span>
                      : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{t("Rate card pending")}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="flow-h" className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-[94rem] px-4 py-14 sm:px-6 lg:px-8">
          <p className="kicker">{t("How a booking works")}</p>
          <h2 id="flow-h" className="mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{t("From draft to Release Order in three steps")}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="relative rounded-2xl border border-slate-200/70 bg-[#F3F3F4] p-5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A0B0D] text-sm font-bold text-white tabular-nums dark:bg-[#D12014]">{s.n}</span>
                <s.icon className="absolute top-5 right-5 h-5 w-5 text-slate-400" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold tracking-[-0.02em]">{t(s.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t(s.body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="Agency details" className="mx-auto max-w-[94rem] px-4 py-8 sm:px-6 lg:px-8">
        <ul className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <li className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><b className="block text-[#0A0B0D]">{t("Registered agency")}</b>{COMPANY.tradeName} · GSTIN {COMPANY.gstin}</span></li>
          <li className="flex items-start gap-2.5"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><b className="block text-[#0A0B0D]">{t("Official tariffs")}</b>{t("Rates are read from each paper's own rate card")}</span></li>
          <li className="flex items-start gap-2.5"><ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><b className="block text-[#0A0B0D]">{t("Itemised quote")}</b>{t("Every charge listed, {pct}% GST shown upfront", { pct: Math.round(GST_RATE * 100) })}</span></li>
          <li className="flex items-start gap-2.5"><CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><b className="block text-[#0A0B0D]">{t("Release Order")}</b>{t("Issued the moment your booking is confirmed")}</span></li>
        </ul>
      </section>
    </>
  );
}

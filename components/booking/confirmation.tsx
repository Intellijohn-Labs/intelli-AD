"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Download, Loader2, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/context/language-context";
import { PAYMENT_LABEL, receiptToHtml, type ReceiptData } from "@/lib/receipt";
import { cn, formatDate, formatDateTime, formatINR } from "@/lib/utils";

const STAGES = [
  { label: "Booking received", note: "Your order is in our system" },
  { label: "Payment confirmed", note: "Payment captured" },
  { label: "Release Order issued", note: "RO sent to the publication" },
  { label: "Creative proofing", note: "Publication desk is verifying content & documents" },
  { label: "Scheduled for print", note: "Confirmed for the release date" },
  { label: "Published", note: "Tear sheet emailed after print" },
];
const DONE = 3;

export function Confirmation({ receipt, onNew }: { receipt: ReceiptData; onNew: () => void }) {
  const { t, tl } = useI18n();
  const tot = receipt.quote.totals;
  const download = () => {
    const blob = new Blob([receiptToHtml(receipt)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Release-Order-${receipt.roNumber.replaceAll("/", "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 text-3xl font-bold text-navy-900 dark:text-zinc-50">{t("Booking confirmed")}</h2>
        <p className="mt-1 text-zinc-600 dark:text-slate-200">
          {t("Your Release Order is ready. A copy was sent to {email}.", { email: receipt.contact.email })}
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-lg font-bold">{t("Order status")}</h3>
          <ol className="space-y-0">
            {STAGES.map((s, i) => {
              const done = i < DONE;
              const active = i === DONE;
              return (
                <motion.li key={s.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i }} className="relative flex gap-3 pb-5 last:pb-0" aria-current={active ? "step" : undefined}>
                  {i < STAGES.length - 1 && <span className={cn("absolute top-6 left-[11px] h-[calc(100%-1.5rem)] w-0.5", done ? "bg-emerald-500" : "bg-zinc-300")} aria-hidden="true" />}
                  {done ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" /> : active ? <Loader2 className="h-6 w-6 shrink-0 animate-spin text-navy-600" aria-hidden="true" /> : <Circle className="h-6 w-6 shrink-0 text-zinc-300" aria-hidden="true" />}
                  <div>
                    <p className={cn("text-sm font-semibold", !done && !active && "text-zinc-400")}>
                      {t(s.label)}
                      <span className="sr-only">{done ? " (complete)" : active ? " (in progress)" : " (pending)"}</span>
                    </p>
                    <p className="text-xs text-zinc-500">{t(s.note)}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card id="release-order" className="p-5 text-sm">
            <div className="flex items-start justify-between border-b-2 border-double border-navy-800 pb-3">
              <div>
                <p className="font-headline text-xl font-black tracking-wide">INTELLIAD</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{t("Release Order")}</p>
              </div>
              <span className="rotate-[-4deg] rounded border-2 border-zinc-900 px-2 py-0.5 text-xs font-black text-zinc-900">{t("PAID")}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                [t("RO number"), receipt.roNumber],
                [t("Booking ID"), receipt.bookingId],
                [t("Release date"), formatDate(receipt.releaseDate)],
                [t("Ad"), `${t(receipt.adTypeLabel)} · ${receipt.categoryName}`],
                [t("Payment"), t(PAYMENT_LABEL[receipt.paymentMethod])],
                [t("Paid on"), formatDateTime(receipt.paidAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{k}</dt>
                  <dd className="font-semibold break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-3 divide-y divide-zinc-200 border-t border-zinc-200">
              {receipt.quote.lines.map((l) => (
                <li key={l.editionId} className="flex justify-between py-1.5">
                  <span>{l.newspaperName} – {l.editionName}</span>
                  <span className="tabular-nums">{formatINR(l.net, { decimals: true })}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t-2 border-navy-800 pt-2 font-bold">
              <span>{t("Total paid (incl. GST {gst})", { gst: formatINR(tot.gst, { decimals: true }) })}</span>
              <span className="tabular-nums">{formatINR(tot.total, { decimals: true })}</span>
            </div>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button onClick={download}>
              <Download className="h-4 w-4" aria-hidden="true" /> {t("Download Release Order")}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" /> {t("Print / Save PDF")}
            </Button>
            <Button variant="ghost" onClick={onNew}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t("Book another ad")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

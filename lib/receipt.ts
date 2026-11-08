import { displayWidth, isDisplayOnlyCategory } from "./display";
import { applySpacing } from "./paragraphs";
import { getAdType, getCategory } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import type { BookingState } from "./booking-store";
import { cutoffFor } from "./cutoff";
import { ENHANCEMENT_LABEL, type Quote } from "./pricing";
import { formatDate, formatDateTime, formatINR } from "./utils";

export type PaymentMethod = "upi" | "card" | "netbanking";
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  card: "Credit / Debit card",
  netbanking: "Net banking",
};

export interface ReceiptData {
  bookingId: string;
  roNumber: string;
  transactionId: string;
  paidAt: string;
  paymentMethod: PaymentMethod;
  contact: { fullName: string; email: string; phone: string; company?: string; gstin?: string; address: string };
  adTypeLabel: string;
  categoryName: string;
  releaseDate: string;
  cutoffs: { paper: string; cutoff: string }[];
  adText: string | null;
  displaySpec: string | null;
  artworkName: string | null;
  enhancements: string[];
  documents: string[];
  quote: Quote;
}

const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

export function createReceipt(
  s: BookingState,
  quote: Quote,
  contact: ReceiptData["contact"],
  paymentMethod: PaymentMethod,
): ReceiptData {
  const paperIds = Object.keys(s.selection).filter((k) => s.selection[k].length);
  const isText = s.adType === "classified-text";
  const enh = isText
    ? (Object.keys(s.enhancements) as (keyof typeof s.enhancements)[]).filter((k) => s.enhancements[k]).map((k) => ENHANCEMENT_LABEL[k])
    : s.display.colorMode === "color"
      ? ["Colour printing"]
      : [];
  const now = new Date();
  const wCm = displayWidth(s.display, getNewspaper(paperIds[0])?.rates.colWidthCm ?? 4);
  return {
    bookingId: `BS-${String(now.getFullYear()).slice(2)}${digits(6)}`,
    roNumber: `RO/${now.getFullYear()}/${digits(6)}`,
    transactionId: `TXN${digits(12)}`,
    paidAt: now.toISOString(),
    paymentMethod,
    contact,
    adTypeLabel: getAdType(s.adType).label,
    categoryName: getCategory(s.categoryId)?.name ?? "General",
    releaseDate: s.releaseDate!,
    cutoffs: paperIds.map((id) => {
      const paper = getNewspaper(id)!;
      return { paper: paper.name, cutoff: cutoffFor(s.releaseDate!, paper.cutoffs[s.adType]).toISOString() };
    }),
    adText: isText ? applySpacing(s.text, s.paragraphSpacing).trim() : isDisplayOnlyCategory(s.categoryId) && s.creativeMode === "builder" ? s.text.trim() : !s.artwork && s.text.trim() ? s.text.trim() : null,
    displaySpec: isText ? null : `${wCm} × ${s.display.heightCm} cm = ${(wCm * s.display.heightCm).toFixed(1)} cm², ${s.display.colorMode === "color" ? "colour" : "black & white"}`,
    artworkName: isText ? null : (s.artwork?.name ?? null),
    enhancements: enh,
    documents: Object.values(s.documents).map((d) => d.name),
    quote,
  };
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Standalone, printable Release Order document. */
export function receiptToHtml(r: ReceiptData): string {
  const t = r.quote.totals;
  const rows = r.quote.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.newspaperName)} – ${esc(l.editionName)}</td><td class="n">${formatINR(l.base + l.extra + l.enhancements, { decimals: true })}</td><td class="n">${l.discount ? "−" + formatINR(l.discount, { decimals: true }) : "–"}</td><td class="n">${formatINR(l.net, { decimals: true })}</td></tr>`,
    )
    .join("");
  const row = (label: string, v: number, strong = false) =>
    `<tr class="${strong ? "total" : ""}"><td colspan="3">${label}</td><td class="n">${formatINR(v, { decimals: true })}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Release Order ${esc(r.roNumber)}</title>
<style>
body{font-family:Georgia,serif;color:#1b1b1f;max-width:780px;margin:32px auto;padding:0 24px}
h1{margin:0;font-size:28px;letter-spacing:.04em}.sub{color:#555;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.12em}
header{border-bottom:3px double #142241;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}
table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin:12px 0}
th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right}.total td{font-weight:bold;border-top:2px solid #142241;font-size:15px}
.ad{font-family:"Courier New",monospace;border:1px solid #999;padding:12px;background:#f7f4ec;white-space:pre-wrap}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-family:Arial,sans-serif;font-size:13px}.meta b{display:block;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.stamp{border:2px solid #1b7a3e;color:#1b7a3e;padding:4px 10px;font-family:Arial,sans-serif;font-weight:bold;transform:rotate(-4deg);display:inline-block}
</style></head><body>
<header><div><h1>INTELLIAD</h1><div class="sub">Release Order · Newspaper advertising</div></div><div class="stamp">PAID</div></header>
<div class="meta">
<div><b>RO number</b>${esc(r.roNumber)}</div><div><b>Booking ID</b>${esc(r.bookingId)}</div>
<div><b>Advertiser</b>${esc(r.contact.fullName)}${r.contact.company ? ", " + esc(r.contact.company) : ""}</div><div><b>Release date</b>${esc(formatDate(r.releaseDate))}</div>
<div><b>Ad type</b>${esc(r.adTypeLabel)}</div><div><b>Category</b>${esc(r.categoryName)}</div>
<div><b>Payment</b>${esc(PAYMENT_LABEL[r.paymentMethod])} · ${esc(r.transactionId)}</div><div><b>Paid on</b>${esc(formatDateTime(r.paidAt))}</div>
${r.contact.gstin ? `<div><b>GSTIN</b>${esc(r.contact.gstin.toUpperCase())}</div>` : ""}<div><b>Billing address</b>${esc(r.contact.address)}</div>
</div>
<h3>Advertisement</h3>
${r.adText ? `<div class="ad">${esc(r.adText)}</div>` : `<p>${esc(r.displaySpec ?? "")}${r.artworkName ? " · Artwork: " + esc(r.artworkName) : ""}</p>`}
${r.enhancements.length ? `<p>Enhancements: ${r.enhancements.map(esc).join(", ")}</p>` : ""}
<h3>Insertions &amp; charges</h3>
<table><thead><tr><th>Publication / edition</th><th class="n">Charge</th><th class="n">Discount</th><th class="n">Net</th></tr></thead><tbody>${rows}
${row("Subtotal after discounts", t.taxable)}${row("GST (18%)", t.gst)}${row("Total paid", t.total, true)}</tbody></table>
<p style="font-family:Arial;font-size:11px;color:#666">This is a computer-generated Release Order for a demo booking. Booking cut-offs: ${r.cutoffs.map((c) => esc(c.paper) + " – " + esc(formatDateTime(c.cutoff))).join("; ")}.</p>
</body></html>`;
}

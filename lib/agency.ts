"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "./auth";
import { createClient } from "./supabase/client";
import { newBookingRef, type BookingRow } from "./supabase/bookings";

export type ExpressKind = "classified-text" | "obituary" | "tender";

export const PARTNER_TYPES = [
  { id: "akshaya", label: "Akshaya Centre", idLabel: "Akshaya Centre Code", idHint: "e.g. AKS-ERN-0142", rate: 15 },
  { id: "csc", label: "CSC / Jan Seva Kendra", idLabel: "CSC / VLE ID", idHint: "e.g. CSC-4821903", rate: 12 },
  { id: "agency", label: "Registered Ad Agency", idLabel: "RO Registration No.", idHint: "e.g. RO/KL/2019/0457", rate: 10 },
] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number]["id"];

export const OPENING_WALLET = 25000; // demo opening balance; there is no payment backend yet

export interface AgencyBooking {
  id: string;
  roNumber: string;
  /** IntelliAd booking verification ID printed on the customer receipt. */
  verificationId: string;
  createdAt: string;
  customer: { name: string; phone: string };
  kind: ExpressKind;
  adTypeLabel: string;
  categoryName: string;
  paperName: string;
  editionName: string;
  releaseDate: string;
  text: string;
  /** "8 × 6 cm = 48 cm²" for display ads, null for line ads. */
  sizeLabel: string | null;
  taxable: number;
  gst: number;
  total: number;
  commission: number;
  /** Machine values used when saving the booking to the database. */
  adType?: string;
  category?: string | null;
  paperId?: string;
  editionId?: string;
  widthCm?: number | null;
  heightCm?: number | null;
  lines?: number;
  colorMode?: string;
}

interface Stored {
  balance: number;
  bookings: AgencyBooking[];
}

const key = (u: AuthUser) => `intelliad.agency.v1.${u.akshaya_code ?? u.identifier}`;
const rand = (n: number) => Array.from({ length: n }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
export const newVerificationId = () => `IA-VRF-${rand(8)}`;
export const newBookingId = newBookingRef; // INT-2026-123456, shared with customer bookings

/**
 * Partner wallet and booking ledger, kept in localStorage per centre. Demo only: a real
 * deployment keeps this server-side, since browser storage can be edited by the user.
 */
export function useAgencyLedger(user: AuthUser | null) {
  const [data, setData] = useState<Stored | null>(null);
  const [sync, setSync] = useState<SyncState>({ status: "checking" });

  useEffect(() => {
    if (!user?.is_agency) return;
    let next: Stored = { balance: user.wallet_balance ?? OPENING_WALLET, bookings: [] };
    try {
      const raw = localStorage.getItem(key(user));
      if (raw) next = JSON.parse(raw);
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(next);
  }, [user]);

  // Bookings live in the database: load them (merged over anything only saved on this device).
  useEffect(() => {
    if (!user?.is_agency) return;
    let cancelled = false;
    fetch("/api/agency/bookings", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 501) return { status: "local" as const, note: "Server sync is off: add SUPABASE_SERVICE_ROLE_KEY to enable it." };
        if (!r.ok) return { status: "error" as const, note: `Could not load bookings (${r.status}).` };
        const { rows } = (await r.json()) as { rows: BookingRow[] };
        return { status: "ok" as const, rows: rows.map(rowToBooking).filter((b): b is AgencyBooking => !!b) };
      })
      .catch(() => ({ status: "error" as const, note: "Could not reach the server." }))
      .then((res) => {
        if (cancelled) return;
        if (res.status === "ok") {
          setData((d) => {
            if (!d) return d;
            const ids = new Set(res.rows.map((b) => b.id));
            const localOnly = d.bookings.filter((b) => !ids.has(b.id));
            return { ...d, bookings: [...res.rows, ...localOnly].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
          });
          setSync({ status: "ok" });
        } else setSync({ status: res.status, note: res.note });
      });
    return () => { cancelled = true; };
  }, [user]);

  const commit = useCallback((next: Stored) => {
    setData(next);
    if (!user) return;
    try { localStorage.setItem(key(user), JSON.stringify(next)); } catch { /* ignore */ }
  }, [user]);

  /** Debits the booking total and credits the partner commission straight back. Returns false if funds are short. */
  const book = useCallback((b: AgencyBooking) => {
    if (!data || data.balance < b.total) return false;
    commit({ balance: Math.round((data.balance - b.total + b.commission) * 100) / 100, bookings: [b, ...data.bookings] });
    if (user) void saveAgencyBooking(user, b).then((r) => { if (!r.ok && !r.skipped) setSync({ status: "error", note: `Booking ${b.id} was not saved online: ${r.error}` }); });
    return true;
  }, [data, commit, user]);

  const topUp = useCallback((amount: number) => {
    if (!data || !(amount > 0)) return;
    commit({ ...data, balance: Math.round((data.balance + amount) * 100) / 100 });
  }, [data, commit]);

  const stats = useMemo(() => {
    const list = data?.bookings ?? [];
    const now = new Date();
    const month = list.filter((b) => { const d = new Date(b.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const sum = (a: AgencyBooking[], f: (b: AgencyBooking) => number) => Math.round(a.reduce((x, b) => x + f(b), 0) * 100) / 100;
    return {
      totalAds: list.length,
      monthAds: month.length,
      monthRevenue: sum(month, (b) => b.taxable),
      totalRevenue: sum(list, (b) => b.taxable),
      commissionTotal: sum(list, (b) => b.commission),
      commissionMonth: sum(month, (b) => b.commission),
    };
  }, [data]);

  return { sync, ready: data !== null, balance: data?.balance ?? 0, bookings: data?.bookings ?? [], stats, book, topUp };
}

export interface SyncState { status: "checking" | "ok" | "local" | "error"; note?: string }

/** Saves a partner booking to the `bookings` table; partner details sit under customer_details.agency. */
export async function saveAgencyBooking(user: AuthUser, b: AgencyBooking): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, skipped: true };
  const row: BookingRow = {
    booking_ref: b.id,
    ad_type: b.adType ?? (b.kind === "classified-text" ? "classified-text" : "classified-display"),
    category: b.category ?? null,
    publication: b.paperName,
    editions: b.paperId && b.editionId ? { [b.paperId]: [b.editionId] } : {},
    release_date: b.releaseDate,
    ad_text: b.text,
    artwork_url: null,
    dimensions: { width: b.widthCm ?? null, height: b.heightCm ?? null, lines: b.lines ?? 0 },
    enhancements: { colorMode: b.colorMode ?? "bw" },
    pricing: { baseRate: b.taxable, gst: b.gst, total: b.total, commission: b.commission },
    customer_details: {
      name: b.customer.name,
      mobile: b.customer.phone,
      agency: {
        code: user.akshaya_code, name: user.agency_name, partner_type: user.partner_type, commission_rate: user.commission_rate,
        meta: { roNumber: b.roNumber, verificationId: b.verificationId, kind: b.kind, adTypeLabel: b.adTypeLabel, categoryName: b.categoryName, paperName: b.paperName, editionName: b.editionName, sizeLabel: b.sizeLabel, taxable: b.taxable, createdAt: b.createdAt },
      },
    },
    status: "confirmed", // paid from the partner wallet
  };
  const { error } = await supabase.from("bookings").insert(row);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Database row -> dashboard booking (only partner rows carry the agency meta). */
function rowToBooking(r: BookingRow & { created_at?: string }): AgencyBooking | null {
  const cd = r.customer_details as { name?: string; mobile?: string; agency?: { meta?: Record<string, unknown> } };
  const m = cd.agency?.meta as Partial<AgencyBooking> | undefined;
  if (!m) return null;
  return {
    id: r.booking_ref,
    roNumber: m.roNumber ?? "",
    verificationId: m.verificationId ?? "",
    createdAt: m.createdAt ?? r.created_at ?? new Date().toISOString(),
    customer: { name: cd.name ?? "", phone: cd.mobile ?? "" },
    kind: (m.kind as ExpressKind) ?? "classified-text",
    adTypeLabel: m.adTypeLabel ?? r.ad_type,
    categoryName: m.categoryName ?? r.category ?? "",
    paperName: m.paperName ?? r.publication,
    editionName: m.editionName ?? "",
    releaseDate: r.release_date ?? "",
    text: r.ad_text ?? "",
    sizeLabel: m.sizeLabel ?? null,
    taxable: Number(m.taxable ?? r.pricing.baseRate ?? 0),
    gst: Number(r.pricing.gst ?? 0),
    total: Number(r.pricing.total ?? 0),
    commission: Number(r.pricing.commission ?? 0),
  };
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Printable customer receipts (one page per booking) headed with the centre's name and seal plus the IntelliAd
 * verification ID. Commission is deliberately not shown: this is the customer's copy.
 */
export function customerReceiptsHtml(user: AuthUser, list: AgencyBooking[]): string {
  const centre = user.agency_name ?? "Partner Centre";
  const code = user.akshaya_code ?? "";
  const seal = `<svg viewBox="0 0 110 110" width="96" height="96" aria-label="Centre seal"><g fill="none" stroke="#1d4ed8" stroke-width="2"><circle cx="55" cy="55" r="52"/><circle cx="55" cy="55" r="44" stroke-width="1"/></g><g fill="#1d4ed8" font-family="Arial,sans-serif" text-anchor="middle"><text x="55" y="38" font-size="8" font-weight="700" letter-spacing="1.5">AUTHORISED</text><foreignObject x="14" y="42" width="82" height="30"><div xmlns="http://www.w3.org/1999/xhtml" style="font:700 9px/1.15 Arial,sans-serif;color:#1d4ed8;text-align:center;display:flex;align-items:center;justify-content:center;height:30px">${esc(centre)}</div></foreignObject><text x="55" y="84" font-size="7">${esc(code)}</text><text x="55" y="95" font-size="6.5" letter-spacing="1">PARTNER</text></g></svg>`;
  const pages = list.map((b) => `
<section class="page">
  <header><div><h1>${esc(centre)}</h1><p>${esc(code ? `Partner code ${code} · ` : "")}Authorised booking partner of IntelliAd</p></div>${seal}</header>
  <h2>Ad Booking Receipt</h2>
  <p class="verify">IntelliAd verification ID <b>${esc(b.verificationId)}</b></p>
  <table class="meta">
    <tr><th>Booking ID</th><td>${esc(b.id)}</td><th>Release Order</th><td>${esc(b.roNumber)}</td></tr>
    <tr><th>Customer</th><td>${esc(b.customer.name)}</td><th>Mobile</th><td>${esc(b.customer.phone)}</td></tr>
    <tr><th>Publication</th><td>${esc(b.paperName)} – ${esc(b.editionName)}</td><th>Release date</th><td>${esc(b.releaseDate)}</td></tr>
    <tr><th>Ad type</th><td>${esc(b.adTypeLabel)}</td><th>Category</th><td>${esc(b.categoryName)}</td></tr>
    ${b.sizeLabel ? `<tr><th>Size</th><td colspan="3">${esc(b.sizeLabel)}</td></tr>` : ""}
  </table>
  <div class="ad">${esc(b.text)}</div>
  <table class="amt">
    <tr><td>Ad charges</td><td class="n">${inr(b.taxable)}</td></tr>
    <tr><td>GST (18%)</td><td class="n">${inr(b.gst)}</td></tr>
    <tr class="tot"><td>Total paid</td><td class="n">${inr(b.total)}</td></tr>
  </table>
  <footer><p>Issued on ${esc(new Date(b.createdAt).toLocaleString("en-IN"))}. Verify this booking with the ID above at intelliad.in.</p><div class="sign"><span>Authorised signatory &amp; seal</span></div></footer>
</section>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipts – ${esc(centre)}</title><style>
body{font-family:Georgia,serif;color:#1b1b1f;margin:0}
.page{max-width:760px;margin:28px auto;padding:0 28px;page-break-after:always}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px double #1d4ed8;padding-bottom:12px}
h1{margin:0;font-size:24px;color:#1d4ed8}header p{margin:4px 0 0;font:12px Arial,sans-serif;color:#555}
h2{margin:18px 0 4px}.verify{font:13px Arial,sans-serif;margin:0 0 12px}
table{width:100%;border-collapse:collapse;font:13px Arial,sans-serif}
.meta th{text-align:left;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:6px 8px 6px 0;width:15%}.meta td{padding:6px 12px 6px 0}
.ad{white-space:pre-wrap;border:1px solid #999;background:#faf8f5;padding:12px;margin:14px 0;font-size:14px;line-height:1.6}
.amt{max-width:320px;margin-left:auto}.amt td{padding:5px 0;border-bottom:1px solid #ddd}.n{text-align:right}.tot td{font-weight:700;border-top:2px solid #111;border-bottom:0}
footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px;font:11px Arial,sans-serif;color:#666}.sign{border-top:1px solid #111;padding-top:4px;min-width:200px;text-align:center;color:#111}
@media print{.page{margin:0 auto}}
</style></head><body>${pages}<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
}

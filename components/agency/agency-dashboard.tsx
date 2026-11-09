"use client";

import { BadgeIndianRupee, Building2, FileText, Percent, Plus, Printer, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { getAdType, getCategory } from "@/data/categories";
import { newspapers } from "@/data/newspapers";
import { customerReceiptsHtml, newBookingId, newVerificationId, useAgencyLedger, type AgencyBooking, type ExpressKind } from "@/lib/agency";
import { useAuth, type AuthUser } from "@/lib/auth";
import { earliestRelease, isBookable } from "@/lib/cutoff";
import { SIZE_PRESETS } from "@/lib/display";
import { applySpacing, type ParagraphSpacing } from "@/lib/paragraphs";
import { ParagraphField } from "@/components/booking/paragraph-field";
import { calculateQuote } from "@/lib/pricing";
import type { AdType, CategoryId, ColorMode } from "@/lib/types";
import { cn, formatDate, formatINR } from "@/lib/utils";

const KINDS: { id: ExpressKind; label: string; adType: AdType; category?: CategoryId; hint: string }[] = [
  { id: "classified-text", label: "Classified text", adType: "classified-text", hint: "Matrimonial, property, jobs, notices. Billed per line." },
  { id: "obituary", label: "Obituary", adType: "classified-display", category: "obituary", hint: "Boxed notice, billed by size (cm²)." },
  { id: "tender", label: "Tender notice", adType: "classified-display", category: "tender", hint: "Boxed notice, billed by size (cm²)." },
];

const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2B3D6B] dark:bg-[#132247]";

function printReceipts(user: AuthUser, list: AgencyBooking[]) {
  if (!list.length) return;
  const url = URL.createObjectURL(new Blob([customerReceiptsHtml(user, list)], { type: "text/html" }));
  const w = window.open(url, "_blank");
  if (!w) { URL.revokeObjectURL(url); return; }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function AgencyDashboard() {
  const { user, ready } = useAuth();
  const ledger = useAgencyLedger(user);
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [last, setLast] = useState<AgencyBooking | null>(null);

  if (!ready || !user) return null;
  if (!user.is_agency) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <Building2 className="mx-auto h-10 w-10 text-blue-700" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold">Partner access only</h1>
        <p className="mt-2 text-sm text-slate-600">This workspace is for Akshaya Centres, CSC centres and registered agencies.</p>
        <Link href="/login?tab=agency" className="mt-5 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white">Partner sign-in</Link>
      </div>
    );
  }

  const rate = user.commission_rate ?? 10;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOn = ledger.bookings.length > 0 && selected.length === ledger.bookings.length;
  const stat = (icon: typeof Wallet, label: string, value: string, sub?: string) => ({ icon, label, value, sub });
  const stats = [
    stat(FileText, "Total ads booked", String(ledger.stats.totalAds), `${ledger.stats.monthAds} this month`),
    stat(BadgeIndianRupee, "Monthly revenue", formatINR(ledger.stats.monthRevenue), `${formatINR(ledger.stats.totalRevenue)} all time (excl. GST)`),
    stat(Percent, "Commission earned", formatINR(ledger.stats.commissionTotal), `${formatINR(ledger.stats.commissionMonth)} this month · ${rate}% rate`),
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-sky-300">Partner dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{user.agency_name}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-200">{user.akshaya_code} · Commission rate {rate}%</p>
        </div>
      </div>

      {ledger.sync.status !== "ok" && ledger.sync.status !== "checking" && (
        <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
          {ledger.sync.status === "error" ? "Database sync problem: " : "Showing bookings from this device only. "}{ledger.sync.note}
        </p>
      )}

      <section aria-label="Wallet and commission" className="mt-6 grid gap-4 md:grid-cols-4">
        <div className={cn(card, "bg-[#0B1F4B] text-white dark:bg-[#0B1F4B]")}>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300"><Wallet className="h-4 w-4" aria-hidden="true" /> Wallet balance</p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums" aria-live="polite">{formatINR(ledger.balance, { decimals: true })}</p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Add funds">
            {[5000, 10000, 25000].map((n) => (
              <button key={n} type="button" onClick={() => { ledger.topUp(n); toast(`Added ${formatINR(n)} (demo top-up)`); }} className="inline-flex items-center gap-1 rounded-md border border-white/30 px-2 py-1 text-xs font-bold hover:bg-white/10"><Plus className="h-3 w-3" aria-hidden="true" />{formatINR(n)}</button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-300">Demo wallet: top-ups are simulated, no payment is taken.</p>
        </div>
        {stats.map((s) => (
          <div key={s.label} className={card}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><s.icon className="h-4 w-4" aria-hidden="true" /> {s.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-slate-500">{s.sub}</p>}
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <ExpressForm user={user} rate={rate} balance={ledger.balance} onBook={(b) => { if (ledger.book(b)) { setLast(b); toast(`Booked ${b.roNumber} from wallet`); return true; } return false; }} />

        <section aria-labelledby="bk-h" className={cn(card, "h-fit")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="bk-h" className="text-lg font-extrabold">Bookings &amp; customer invoices</h2>
            <button type="button" disabled={!selected.length} onClick={() => printReceipts(user, ledger.bookings.filter((b) => selected.includes(b.id)))} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-40">
              <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print selected ({selected.length})
            </button>
          </div>
          {last && (
            <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
              <span>Booked <b>{last.verificationId}</b> for {last.customer.name}</span>
              <button type="button" onClick={() => printReceipts(user, [last])} className="font-bold underline">Print receipt</button>
            </div>
          )}
          {ledger.bookings.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No bookings yet. Use the express form to release your first ad.</p>
          ) : (
            <>
              <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
                <input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? [] : ledger.bookings.map((b) => b.id))} className="h-4 w-4 accent-blue-700" /> Select all for bulk printing
              </label>
              <ul className="mt-2 divide-y divide-slate-200 dark:divide-[#2B3D6B]">
                {ledger.bookings.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 py-3">
                    <input type="checkbox" aria-label={`Select ${b.roNumber}`} checked={selected.includes(b.id)} onChange={() => toggle(b.id)} className="mt-1 h-4 w-4 accent-blue-700" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-bold">{b.customer.name} <span className="font-normal text-slate-500">· {b.categoryName}</span></p>
                      <p className="truncate text-xs text-slate-500">{b.paperName} {b.editionName} · {formatDate(b.releaseDate)}</p>
                      <p className="font-mono text-[11px] text-slate-500">{b.verificationId}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-mono font-bold">{formatINR(b.total, { decimals: true })}</p>
                      <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">+{formatINR(b.commission, { decimals: true })}</p>
                      <button type="button" onClick={() => printReceipts(user, [b])} className="text-xs font-bold text-blue-700 underline dark:text-sky-300">Receipt</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Fast single-page entry: no marketing, no wizard. Pay straight from the wallet. */
function ExpressForm({ user, rate, balance, onBook }: { user: AuthUser; rate: number; balance: number; onBook: (b: AgencyBooking) => boolean }) {
  const [kindId, setKindId] = useState<ExpressKind>("classified-text");
  const [paperId, setPaperId] = useState(newspapers[0].id);
  const paper = newspapers.find((p) => p.id === paperId)!;
  const [editionId, setEditionId] = useState(paper.editions[0].id);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [size, setSize] = useState("0");
  const [color, setColor] = useState<ColorMode>("bw");
  const [spacing, setSpacing] = useState<ParagraphSpacing>("normal");
  const [err, setErr] = useState("");
  const kind = KINDS.find((k) => k.id === kindId)!;
  const isDisplay = kind.adType === "classified-display";
  const preset = SIZE_PRESETS[+size];
  const now = useMemo(() => new Date(), []);
  const minDate = useMemo(() => earliestRelease([paperId], kind.adType, now), [paperId, kind.adType, now]);
  const releaseDate = date || minDate;

  const printText = isDisplay ? text : applySpacing(text, spacing);
  const quote = useMemo(
    () => calculateQuote({ adType: kind.adType, category: kind.category, selection: { [paperId]: [editionId] }, text: printText, display: { columns: Math.max(1, Math.round(preset.widthCm / paper.rates.colWidthCm)), widthCm: preset.widthCm, heightCm: preset.heightCm, colorMode: color } }),
    [kind, paperId, editionId, printText, preset, color, paper],
  );
  const t = quote.totals;
  const commission = Math.round(t.taxable * rate) / 100;
  const short = t.total > balance;

  const submit = () => {
    if (name.trim().length < 2) return setErr("Enter the customer's name.");
    if (!/^[6-9]\d{9}$/.test(phone.trim())) return setErr("Enter a valid 10-digit customer mobile number.");
    if (text.trim().length < 15) return setErr("Enter the ad text (at least 15 characters).");
    if (text.trim().length > 600) return setErr("Keep the ad under 600 characters.");
    if (!isBookable(releaseDate, [paperId], kind.adType, now)) return setErr("The cut-off for that date has passed. Pick a later date.");
    if (short) return setErr("Wallet balance is too low. Add funds first.");
    setErr("");
    const ok = onBook({
      id: newBookingId(),
      roNumber: `RO/${now.getFullYear()}/${Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("")}`,
      verificationId: newVerificationId(),
      createdAt: new Date().toISOString(),
      customer: { name: name.trim(), phone: phone.trim() },
      kind: kindId,
      adTypeLabel: getAdType(kind.adType).label,
      categoryName: kind.category ? getCategory(kind.category)?.name ?? "General" : "Classified text",
      paperName: paper.name,
      editionName: paper.editions.find((e) => e.id === editionId)?.name ?? "",
      releaseDate,
      text: printText.trim(),
      sizeLabel: isDisplay ? `${preset.widthCm} × ${preset.heightCm} cm = ${preset.widthCm * preset.heightCm} cm², ${color === "color" ? "colour" : "black & white"}` : null,
      taxable: t.taxable,
      gst: t.gst,
      total: t.total,
      commission,
      adType: kind.adType,
      category: kind.category ?? null,
      paperId,
      editionId,
      widthCm: isDisplay ? preset.widthCm : null,
      heightCm: isDisplay ? preset.heightCm : null,
      lines: quote.metrics.lines,
      colorMode: color,
    });
    if (!ok) return setErr("Wallet balance is too low. Add funds first.");
    setText(""); setName(""); setPhone("");
  };

  return (
    <section aria-labelledby="ex-h" className={card}>
      <h2 id="ex-h" className="flex items-center gap-2 text-lg font-extrabold"><Zap className="h-5 w-5 text-blue-700 dark:text-sky-300" aria-hidden="true" /> Express ad form</h2>
      <div className="mt-3 flex gap-1 rounded-lg border border-slate-300 p-0.5 text-xs font-bold dark:border-slate-700" role="tablist" aria-label="Ad kind">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="tab" aria-selected={kindId === k.id} onClick={() => setKindId(k.id)} className={cn("flex-1 rounded-md px-3 py-2", kindId === k.id ? "bg-blue-700 text-white" : "text-slate-600 dark:text-slate-200")}>{k.label}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{kind.hint}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="ex-paper" label="Publication"><Select id="ex-paper" value={paperId} onChange={(e) => { setPaperId(e.target.value); const p = newspapers.find((x) => x.id === e.target.value)!; setEditionId(p.editions[0].id); }}>{newspapers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field id="ex-ed" label="Edition"><Select id="ex-ed" value={editionId} onChange={(e) => setEditionId(e.target.value)}>{paper.editions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
        <Field id="ex-date" label="Release date" hint={`Earliest: ${formatDate(minDate)}`}><Input id="ex-date" type="date" min={minDate} value={releaseDate} onChange={(e) => setDate(e.target.value)} /></Field>
        {isDisplay ? (
          <Field id="ex-size" label="Size (W × H)"><Select id="ex-size" value={size} onChange={(e) => setSize(e.target.value)}>{SIZE_PRESETS.map((p, i) => <option key={i} value={i}>{p.widthCm} × {p.heightCm} cm · {p.label}</option>)}</Select></Field>
        ) : <span />}
        <Field id="ex-name" label="Customer name" required><Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field id="ex-phone" label="Customer mobile" required><Input id="ex-phone" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} /></Field>
        <ParagraphField
          id="ex-text"
          label="Ad text"
          required
          rows={6}
          className="sm:col-span-2"
          value={text}
          onChange={setText}
          hint="Write exactly as it should print. Press Enter for a new paragraph."
          placeholder={kindId === "obituary" ? "ഇവിടെ അനുശോചന കുറിപ്പുകൾ പാരഗ്രാഫുകളായി ടൈപ്പ് ചെയ്യുക (ഉദാ: ഞങ്ങളുടെ പ്രിയപ്പെട്ട... നിത്യശാന്തി നേരുന്നു)..." : kindId === "tender" ? "വിശദമായ ടെൻഡർ വിവരങ്ങളും നിബന്ധനകളും ഇവിടെ നൽകുക..." : "Enter property/job details in clear paragraphs..."}
          charsPerLine={paper.rates.charsPerLine}
          maxChars={600}
          spacing={isDisplay ? undefined : spacing}
          onSpacing={isDisplay ? undefined : setSpacing}
          textClassName="font-clipping"
        />
        {isDisplay && (
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={color === "color"} onChange={(e) => setColor(e.target.checked ? "color" : "bw")} className="h-4 w-4 accent-blue-700" /> Multi-colour print</label>
        )}
      </div>

      <dl className="mt-4 space-y-1 rounded-lg border border-dashed border-slate-400 p-3 font-mono text-xs">
        <div className="flex justify-between"><dt>Ad charges</dt><dd>{formatINR(t.taxable, { decimals: true })}</dd></div>
        <div className="flex justify-between"><dt>GST 18%</dt><dd>{formatINR(t.gst, { decimals: true })}</dd></div>
        <div className="flex justify-between text-sm font-bold"><dt>Wallet debit</dt><dd>{formatINR(t.total, { decimals: true })}</dd></div>
        <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><dt>Your commission ({rate}%, credited instantly)</dt><dd>+{formatINR(commission, { decimals: true })}</dd></div>
      </dl>
      {err && <p role="alert" className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{err}</p>}
      {short && !err && <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">Wallet balance is below this booking. Add funds above.</p>}
      <button type="button" onClick={submit} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">
        <Wallet className="h-4 w-4" aria-hidden="true" /> Pay {formatINR(t.total, { decimals: true })} from wallet &amp; release
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-500">Booking as {user.agency_name}. Billing carries your centre name.</p>
    </section>
  );
}

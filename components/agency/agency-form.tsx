"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/field";
import { useAuth, type AuthUser } from "@/lib/auth";
import { OPENING_WALLET, PARTNER_TYPES, type PartnerType } from "@/lib/agency";
import { cn } from "@/lib/utils";

const DEV = process.env.NODE_ENV !== "production";
const DEMO = { type: "akshaya" as PartnerType, id: "AKS-ERN-0142", contact: "9400000142", name: "Sree Akshaya Centre, Kakkanad" };
const CHIP_LABEL: Record<PartnerType, string> = { akshaya: "Akshaya Centre", csc: "Jan Seva Kendra", agency: "Ad Agency" };

/** Partner sign-in form. Verification is simulated (no backend); in development any well-formed details are accepted. */
export function AgencyForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<PartnerType>("akshaya");
  const [partnerId, setPartnerId] = useState("");
  const [contact, setContact] = useState("");
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [secret, setSecret] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const meta = PARTNER_TYPES.find((p) => p.id === type)!;

  const enter = (p: { type: PartnerType; id: string; contact: string; name?: string }) => {
    const m = PARTNER_TYPES.find((x) => x.id === p.type)!;
    const name = p.name ?? `${m.label} ${p.id}`;
    const u: AuthUser = {
      name,
      identifier: p.contact,
      method: p.contact.includes("@") ? "email" : "phone",
      is_agency: true,
      agency_name: name,
      akshaya_code: p.id.toUpperCase(),
      wallet_balance: OPENING_WALLET,
      commission_rate: m.rate,
      partner_type: p.type,
    };
    signIn(u, true);
    router.push("/agency/dashboard"); // partners always land on their dashboard
    router.refresh();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (partnerId.trim().length < 4) next.id = `Enter your ${meta.idLabel}.`;
    if (!/^\d{10}$/.test(contact.trim()) && !/^\S+@\S+\.\S+$/.test(contact.trim())) next.contact = "Enter a 10-digit mobile number or an email address.";
    if (mode === "password" ? secret.length < (DEV ? 1 : 8) : !new RegExp(`^\\d{${DEV ? "4,6" : "6"}}$`).test(secret)) next.secret = mode === "password" ? "Enter your password." : "Enter the authorised OTP.";
    setErrs(next);
    if (Object.keys(next).length) return;
    if (!DEV) { setErrs({ form: "Partner verification is not connected yet. Please contact IntelliAd partner support." }); return; }
    setBusy(true);
    window.setTimeout(() => enter({ type, id: partnerId.trim(), contact: contact.trim() }), 700); // simulated verification
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div role="radiogroup" aria-label="Partner type" className="flex flex-wrap gap-2">
        {PARTNER_TYPES.map((p) => (
          <label key={p.id} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600", type === p.id ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-[#0F1D3D] dark:text-slate-200")}>
            <input type="radio" name="partner-type" className="sr-only" checked={type === p.id} onChange={() => setType(p.id)} />
            {CHIP_LABEL[p.id]}
          </label>
        ))}
      </div>
      <Field id="ag-id" label="Centre Code / Agency ID" required error={errs.id} hint={`${meta.idLabel}, ${meta.idHint}`}>
        <Input id="ag-id" autoComplete="off" value={partnerId} aria-invalid={!!errs.id} onChange={(e) => setPartnerId(e.target.value)} />
      </Field>
      <Field id="ag-contact" label="Registered phone / email" required error={errs.contact}>
        <Input id="ag-contact" autoComplete="username" value={contact} aria-invalid={!!errs.contact} onChange={(e) => setContact(e.target.value)} />
      </Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold">Verification</span>
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-xs font-bold dark:border-slate-700" role="group" aria-label="Verification method">
            {(["password", "otp"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setSecret(""); setErrs({}); }} className={cn("rounded-md px-3 py-1 transition-colors", mode === m ? "bg-blue-700 text-white" : "text-slate-600 dark:text-slate-200")}>{m === "password" ? "Password" : "Authorised OTP"}</button>
            ))}
          </div>
        </div>
        <Field id="ag-secret" label={mode === "password" ? "Password" : "Authorised OTP"} error={errs.secret} hint={DEV ? (mode === "otp" ? "Dev mode: any 4–6 digit code works." : "Dev mode: any password works.") : undefined}>
          <Input id="ag-secret" type={mode === "password" ? "password" : "text"} inputMode={mode === "otp" ? "numeric" : undefined} autoComplete={mode === "password" ? "current-password" : "one-time-code"} value={secret} aria-invalid={!!errs.secret} onChange={(e) => setSecret(e.target.value)} />
        </Field>
      </div>
      <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Partner Commission &amp; Instant RO Dispatch Enabled</p>
      {errs.form && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{errs.form}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60">{busy ? "Verifying…" : "Verify & open dashboard"}</button>
      {DEV && (
        <button type="button" disabled={busy} onClick={() => enter({ type: DEMO.type, id: DEMO.id, contact: DEMO.contact, name: DEMO.name })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Quick demo partner sign-in
        </button>
      )}
    </form>
  );
}

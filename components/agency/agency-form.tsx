"use client";

import { CheckCircle2, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { homeFor, useAuth, type AuthUser } from "@/lib/auth";
import { OPENING_WALLET } from "@/lib/agency";
import { register, signInWithPassword, userFromSupabase } from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const DEV = process.env.NODE_ENV !== "production";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const TYPES = [
  { id: "akshaya", label: "Akshaya Centre", codeLabel: "Akshaya Centre Code", hint: "e.g. AKS-ERN-0142" },
  { id: "agency", label: "Ad Agency", codeLabel: "Agency ID / RO Reg. No.", hint: "e.g. RO/KL/2019/0457" },
] as const;
type PartnerType = (typeof TYPES)[number]["id"];
const primary = "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/** Partner (Akshaya / agency) sign-in and registration. New partner accounts start as "pending" until approved. */
export function AgencyForm({ mode }: { mode: "signin" | "register" }) {
  const { signIn, celebrate } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<PartnerType>("akshaya");
  const [contactName, setContactName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [centerCode, setCenterCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const meta = TYPES.find((t) => t.id === type)!;

  // Approved partners go to the dashboard. Anyone still pending stays here and sees the verification notice instead.
  const land = (user: User) => {
    const u = userFromSupabase(user);
    if (u.is_agency) { celebrate(); router.push(homeFor(u)); } else router.replace("/login?tab=agency&notice=pending_approval");
    router.refresh();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const reg = mode === "register";
    if (reg && contactName.trim().length < 2) next.contact = "Enter the contact person's name.";
    if (reg && agencyName.trim().length < 2) next.agency = "Enter your centre / agency name.";
    if (reg && centerCode.trim().length < 4) next.code = `Enter your ${meta.codeLabel}.`;
    if (reg && !/^[6-9]\d{9}$/.test(mobile)) next.mobile = "Enter a 10-digit mobile number.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (reg ? password.length < 8 : !password) next.password = reg ? "Use at least 8 characters." : "Enter your password.";
    setErr(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    if (reg) {
      const r = await register({ role: type, fullName: contactName.trim(), email: email.trim(), phone: `+91${mobile}`, password, agencyName: agencyName.trim(), centerCode: centerCode.trim().toUpperCase() });
      setBusy(false);
      if (r.error) return setErr({ form: r.error });
      if (r.needsConfirm) return setConfirmEmail(email.trim());
      if (r.user) land(r.user);
    } else {
      const r = await signInWithPassword(email.trim(), password);
      setBusy(false);
      if (r.error || !r.user) return setErr({ form: r.error ?? "Could not sign in." });
      land(r.user);
    }
  };

  const demo = () => {
    const u: AuthUser = { name: "Sree Akshaya Centre, Kakkanad", identifier: "9400000142", method: "phone", is_agency: true, partner_status: "approved", agency_name: "Sree Akshaya Centre, Kakkanad", akshaya_code: "AKS-ERN-0142", wallet_balance: OPENING_WALLET, commission_rate: 15, partner_type: "akshaya" };
    signIn(u, true);
    router.push("/agency/dashboard");
    router.refresh();
  };

  if (confirmEmail)
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <MailCheck className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
        <p className="mt-2 font-bold text-emerald-900 dark:text-emerald-100">Check your email</p>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Confirm <b>{confirmEmail}</b> using the link we sent, then sign in. Partner access is switched on after IntelliAd verifies your centre or agency.</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {mode === "register" && (
        <>
          <div role="radiogroup" aria-label="Partner type" className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <label key={t.id} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600", type === t.id ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-[#0F1D3D] dark:text-slate-200")}>
                <input type="radio" name="partner-type" className="sr-only" checked={type === t.id} onChange={() => setType(t.id)} />
                {t.label}
              </label>
            ))}
          </div>
          <Field id="ag-contact" label="Contact name" required error={err.contact}><Input id="ag-contact" autoComplete="name" value={contactName} aria-invalid={!!err.contact} onChange={(e) => setContactName(e.target.value)} /></Field>
          <Field id="ag-name" label="Agency / Centre name" required error={err.agency}><Input id="ag-name" autoComplete="organization" value={agencyName} aria-invalid={!!err.agency} onChange={(e) => setAgencyName(e.target.value)} /></Field>
          <Field id="ag-code" label="Centre Code / Agency ID" required error={err.code} hint={`${meta.codeLabel}, ${meta.hint}`}><Input id="ag-code" autoComplete="off" value={centerCode} aria-invalid={!!err.code} onChange={(e) => setCenterCode(e.target.value)} /></Field>
          <Field id="ag-mobile" label="Mobile number" required error={err.mobile}>
            <div className="flex gap-2"><span className="flex items-center rounded border border-zinc-400 px-3 text-sm dark:border-slate-700">+91</span><Input id="ag-mobile" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={mobile} aria-invalid={!!err.mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} /></div>
          </Field>
        </>
      )}
      <Field id="ag-email" label="Email" required error={err.email}><Input id="ag-email" type="email" autoComplete="email" value={email} aria-invalid={!!err.email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field id="ag-pass" label="Password" required error={err.password} hint={mode === "register" ? "At least 8 characters." : undefined}>
        <PasswordInput id="ag-pass" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} aria-invalid={!!err.password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Partner Commission &amp; Instant RO Dispatch Enabled</p>
      {err.form && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{err.form}</p>}
      <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{mode === "register" ? "Register as partner" : "Sign in to dashboard"}</button>
      {DEV && (
        <button type="button" onClick={demo} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Quick Demo Sign-In <span className="text-xs font-normal opacity-70">(dev only)</span>
        </button>
      )}
    </form>
  );
}

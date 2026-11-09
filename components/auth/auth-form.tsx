"use client";

import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/field";
import { homeFor, useAuth } from "@/lib/auth";
import { register, sendPhoneOtp, signInWithPassword, userFromSupabase, verifyPhoneOtp } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

const DEV = process.env.NODE_ENV !== "production";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const primary = "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/** Customer sign-in / registration: email + password, or phone + OTP (needs an SMS provider in Supabase). */
export function AuthForm({ mode, notice = false }: { mode: "signin" | "register"; notice?: boolean }) {
  const { signIn, celebrate } = useAuth();
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  // fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const finish = (user: Parameters<typeof userFromSupabase>[0]) => {
    celebrate();
    router.push(homeFor(userFromSupabase(user)));
    router.refresh();
  };

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (mode === "register" && fullName.trim().length < 2) next.name = "Enter your full name.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (mode === "register" && !/^[6-9]\d{9}$/.test(phone)) next.phone = "Enter a 10-digit Indian mobile number.";
    if (mode === "register" ? password.length < 8 : !password) next.password = mode === "register" ? "Use at least 8 characters." : "Enter your password.";
    setErr(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    if (mode === "register") {
      const r = await register({ role: "individual", fullName: fullName.trim(), email: email.trim(), phone: `+91${phone}`, password });
      setBusy(false);
      if (r.error) return setErr({ form: r.error });
      if (r.needsConfirm) return setConfirmEmail(email.trim());
      if (r.user) finish(r.user);
    } else {
      const r = await signInWithPassword(email.trim(), password);
      setBusy(false);
      if (r.error || !r.user) return setErr({ form: r.error ?? "Could not sign in." });
      finish(r.user);
    }
  };

  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setErr({ phone: "Enter a 10-digit Indian mobile number." });
    if (!otpSent) {
      setBusy(true);
      const r = await sendPhoneOtp(`+91${phone}`, mode === "register" ? { full_name: fullName.trim(), phone: `+91${phone}`, role: "individual" } : undefined);
      setBusy(false);
      if (r.error) return setErr({ form: r.error });
      setErr({});
      return setOtpSent(true);
    }
    if (!/^\d{6}$/.test(otp)) return setErr({ otp: "Enter the 6-digit code." });
    setBusy(true);
    const r = await verifyPhoneOtp(`+91${phone}`, otp);
    setBusy(false);
    if (r.error || !r.user) return setErr({ form: r.error ?? "That code didn't work." });
    finish(r.user);
  };

  if (confirmEmail)
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <MailCheck className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
        <p className="mt-2 font-bold text-emerald-900 dark:text-emerald-100">Check your email</p>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">We sent a confirmation link to <b>{confirmEmail}</b>. Open it to activate your account, then sign in.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      {notice && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">Please sign in to continue.</p>}

      {mode === "signin" && (
        <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 text-xs font-bold dark:bg-slate-800">
          {(["email", "phone"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => { setMethod(m); setErr({}); }} className={cn("rounded-md px-3 py-1.5 transition-colors", method === m ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-300")}>
              {m === "email" ? "Email & password" : "Phone + OTP"}
            </button>
          ))}
        </div>
      )}

      {mode === "signin" && method === "phone" ? (
        <form onSubmit={submitPhone} noValidate className="space-y-4">
          <Field id="cu-phone" label="Mobile number" required error={err.phone}>
            <div className="flex gap-2"><span className="flex items-center rounded border border-zinc-400 px-3 text-sm dark:border-slate-700">+91</span><Input id="cu-phone" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={phone} disabled={otpSent} aria-invalid={!!err.phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} /></div>
          </Field>
          {otpSent && <Field id="cu-otp" label="6-digit code" required error={err.otp} hint={`Sent to +91 ${phone}`}><Input id="cu-otp" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={otp} aria-invalid={!!err.otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} /></Field>}
          {err.form && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{err.form}</p>}
          <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{otpSent ? "Verify & sign in" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={submitEmail} noValidate className="space-y-4">
          {mode === "register" && <Field id="cu-name" label="Full name" required error={err.name}><Input id="cu-name" autoComplete="name" value={fullName} aria-invalid={!!err.name} onChange={(e) => setFullName(e.target.value)} /></Field>}
          <Field id="cu-email" label="Email" required error={err.email}><Input id="cu-email" type="email" autoComplete="email" value={email} aria-invalid={!!err.email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {mode === "register" && (
            <Field id="cu-phone" label="Phone number" required error={err.phone}>
              <div className="flex gap-2"><span className="flex items-center rounded border border-zinc-400 px-3 text-sm dark:border-slate-700">+91</span><Input id="cu-phone" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={phone} aria-invalid={!!err.phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} /></div>
            </Field>
          )}
          <Field id="cu-pass" label="Password" required error={err.password} hint={mode === "register" ? "At least 8 characters." : undefined}>
            <Input id="cu-pass" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} aria-invalid={!!err.password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {err.form && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{err.form}</p>}
          <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{mode === "register" ? "Create account" : "Sign in"}</button>
        </form>
      )}

      {DEV && (
        <button type="button" onClick={() => { signIn({ name: "Demo Customer", identifier: "demo@intelliad.in", method: "email" }, true); router.push("/"); router.refresh(); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/10">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Quick Demo Sign-In <span className="text-xs font-normal text-slate-500">(dev only)</span>
        </button>
      )}
    </div>
  );
}

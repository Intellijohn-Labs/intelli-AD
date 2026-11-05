"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Info, Loader2, Lock, Mail, Phone, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { safeCallback, useAuth, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const OTP_LEN = 6;
const RESEND_SECONDS = 30;
const ring = "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50";
const inputCls = cn("w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 aria-[invalid=true]:border-red-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white", ring);
const primaryBtn = "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-60";
/** Dev builds accept any 10-digit number, any OTP of 4+ digits and any email/password. */
const DEV = process.env.NODE_ENV !== "production";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** Six auto-advancing OTP boxes with paste + backspace support. */
function OtpInput({ value, onChange, error, disabled }: { value: string; onChange: (v: string) => void; error: boolean; disabled: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const digits = Array.from({ length: OTP_LEN }, (_, i) => value[i] ?? "");

  const setAt = (i: number, d: string) => {
    const next = digits.slice(); next[i] = d;
    onChange(next.join(""));
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) { setAt(i - 1, ""); refs.current[i - 1]?.focus(); }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent) => {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!t) return;
    e.preventDefault(); onChange(t);
    refs.current[Math.min(t.length, OTP_LEN - 1)]?.focus();
  };

  return (
    <motion.div
      className="flex justify-between gap-2"
      animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      role="group"
      aria-label="One-time password"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={error}
          onPaste={onPaste}
          onKeyDown={(e) => onKey(i, e)}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, c);
            if (c && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
          }}
          className={cn("h-12 w-full min-w-0 rounded-lg border bg-white text-center text-xl font-bold text-zinc-900 shadow-sm transition dark:bg-slate-900 dark:text-white", ring, error ? "border-red-500" : d ? "border-indigo-500" : "border-zinc-300 dark:border-slate-600")}
        />
      ))}
    </motion.div>
  );
}

function PhoneFlow({ onDone, onError }: { onDone: (u: AuthUser) => void; onError: (m: string) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"number" | "otp">("number");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const valid = DEV ? /^\d{10}$/.test(phone) : /^[6-9]\d{9}$/.test(phone);

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid) { setError("Enter a valid 10-digit mobile number."); return; }
    setError(""); setBusy(true);
    await wait(700); // simulated SMS gateway
    onError("");
    setBusy(false); setOtp(""); setStep("otp"); setLeft(RESEND_SECONDS);
  };

  const verify = useCallback(async (code: string) => {
    setBusy(true); setError("");
    await wait(700); // simulated verification — any 6 digits except 000000 are accepted
    setBusy(false);
    if (code.length < (DEV ? 4 : OTP_LEN)) { setError("Enter the full verification code."); return; }
    onDone({ name: `Advertiser ${phone.slice(-4)}`, identifier: `+91 ${phone}`, method: "phone" });
  }, [phone, onDone]);

  const onOtp = (v: string) => {
    setOtp(v); setError("");
    if (v.length === OTP_LEN) void verify(v);
  };

  if (step === "number") {
    return (
      <form onSubmit={sendOtp} className="space-y-4" noValidate>
        <div>
          <label htmlFor="auth-phone" className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Mobile number</label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-200">+91</span>
            <input
              id="auth-phone" type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus
              placeholder="98765 43210" value={phone} aria-invalid={!!error} aria-describedby={error ? "auth-phone-err" : undefined}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
              className={inputCls}
            />
          </div>
          {error && <p id="auth-phone-err" role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
        </div>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send OTP
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => { setStep("number"); setError(""); }} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-indigo-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Change number
      </button>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Enter the 6-digit code sent to <strong className="text-zinc-900 dark:text-white">+91 {phone}</strong></p>
      <OtpInput value={otp} onChange={onOtp} error={!!error} disabled={busy} />
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
      <button type="button" disabled={busy || otp.length < (DEV ? 4 : OTP_LEN)} onClick={() => void verify(otp)} className={primaryBtn}>Verify &amp; sign in</button>
      <div className="flex items-center justify-between text-sm">
        {busy ? (
          <span className="flex items-center gap-2 text-indigo-700"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span>
        ) : left > 0 ? (
          <span className="text-zinc-500">Resend OTP in <span className="font-semibold tabular-nums">0:{String(left).padStart(2, "0")}</span></span>
        ) : (
          <button type="button" onClick={() => void sendOtp()} className="font-semibold text-indigo-700 hover:underline">Resend OTP</button>
        )}
        <span className="text-xs text-zinc-400">Dev mode: any 4+ digit code works</span>
      </div>
    </div>
  );
}

function EmailFlow({ onDone }: { onDone: (u: AuthUser) => void }) {
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (signup && name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = "Enter a valid email address.";
    if (DEV ? !pw : pw.length < 8) next.pw = DEV ? "Enter a password." : "Password must be at least 8 characters.";
    setErrs(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    await wait(800); // simulated auth call
    setBusy(false);
    onDone({ name: signup ? name.trim() : email.split("@")[0], identifier: email, method: "email" });
  };

  const field = (id: string, label: string, el: React.ReactNode) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</label>
      {el}
      {errs[id] && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errs[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {signup && field("name", "Full name / agency", <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errs.name} className={inputCls} />)}
      {field("email", "Email", <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errs.email} placeholder="you@agency.com" className={inputCls} />)}
      {field("pw", "Password", <input id="pw" type="password" autoComplete={signup ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!errs.pw} className={inputCls} />)}
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {signup ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
        {signup ? "Already have an account?" : "New to IntelliAd?"}{" "}
        <button type="button" onClick={() => { setSignup((s) => !s); setErrs({}); }} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          {signup ? "Sign in" : "Create one"}
        </button>
      </p>
    </form>
  );
}

/** Shared sign-in form: phone + OTP, email + password, Google, and "Remember me". */
export function AuthForm({ callbackUrl }: { callbackUrl?: string | null }) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [remember, setRemember] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [alert, setAlert] = useState("");

  const done = useCallback((u: AuthUser) => {
    signIn(u, remember); // triggers the full-screen welcome overlay
    router.replace(safeCallback(callbackUrl)); // the page loads underneath while the overlay plays
  }, [signIn, remember, router, callbackUrl]);

  const google = async () => {
    setAlert(""); setGoogleBusy(true);
    await wait(900); // simulated OAuth round-trip
    setGoogleBusy(false);
    done({ name: "Google User", identifier: "google.user@gmail.com", method: "google" });
  };

  return (
    <div className="space-y-5">
      {callbackUrl && !alert && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> Please sign in to continue.
        </div>
      )}
      {alert && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {alert}
        </div>
      )}

      <div role="tablist" aria-label="Sign-in method" className="relative grid grid-cols-2 rounded-lg bg-zinc-100 p-1 text-sm font-semibold dark:bg-slate-800">
        {([["phone", "Phone + OTP", Phone], ["email", "Email", Mail]] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("relative flex items-center justify-center gap-2 rounded-md py-2 transition-colors", tab === id ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 hover:text-zinc-800")}>
            {tab === id && <motion.span layoutId="auth-tab" aria-hidden="true" className="absolute inset-0 rounded-md bg-white shadow dark:bg-slate-700" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
            <span className="relative flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === "phone" ? <PhoneFlow onDone={done} onError={setAlert} /> : <EmailFlow onDone={done} />}
        </motion.div>
      </AnimatePresence>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 accent-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500" />
        Remember me for 30 days
      </label>

      <div className="flex items-center gap-3 text-xs text-zinc-400" aria-hidden="true">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-slate-700" /> or <span className="h-px flex-1 bg-zinc-200 dark:bg-slate-700" />
      </div>

      <button type="button" onClick={() => void google()} disabled={googleBusy}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
        {googleBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleG />} Continue with Google
      </button>

      <button type="button" onClick={() => done({ name: "Agency Partner", identifier: "demo@intelliad.in", method: "email" })}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-500 bg-indigo-50 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300">
        <Zap className="h-4 w-4" /> Quick Demo Sign-In
      </button>
    </div>
  );
}

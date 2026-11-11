"use client";

import { LoginPromo } from "@/components/auth/login-promo";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Lock, ShieldAlert, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AgencyForm } from "@/components/agency/agency-form";
import { AdminForm } from "@/components/auth/admin-form";
import { AuthForm } from "@/components/auth/auth-form";
import { homeFor, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Faint Malayalam broadsheet: columns of headline + body text in ink, like a printed front page. */
const HEADLINES = ["കേരളത്തിലെ വാർത്തകൾ", "പത്രപരസ്യം ബുക്ക് ചെയ്യാം", "ഇന്നത്തെ പ്രധാന വാർത്തകൾ", "ക്ലാസിഫൈഡ് പരസ്യങ്ങൾ", "മലയാള മനോരമ മാതൃഭൂമി"];
const BODY = "തിരുവനന്തപുരം: സംസ്ഥാനത്തെ പ്രധാന പത്രങ്ങളിൽ പരസ്യം നൽകുന്നതിനുള്ള നിരക്കുകൾ താരതമ്യം ചെയ്യാനും ബുക്ക് ചെയ്യാനും ഇനി എളുപ്പം. വിവാഹം, വാടക, തൊഴിൽ, വിദ്യാഭ്യാസം തുടങ്ങിയ വിഭാഗങ്ങളിലെ പരസ്യങ്ങൾ തത്സമയ നിരക്കിൽ. ";

function Broadsheet() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-[0.09] dark:opacity-[0.07]">
      <div className="mx-auto grid h-full max-w-[1600px] -rotate-2 scale-110 grid-cols-2 gap-x-8 text-[#3f3a33] dark:text-[#FAFAFA] sm:grid-cols-3 lg:grid-cols-5" style={{ fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' }}>
        {HEADLINES.map((h, i) => (
          <div key={i} className="border-r border-[#0F172A]/30 pr-6 first:pl-0">
            <p className="mt-6 border-b-2 border-[#0F172A]/50 pb-2 text-3xl leading-tight font-extrabold">{h}</p>
            <p className="mt-4 text-sm leading-relaxed">{BODY.repeat(14)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type Tab = "user" | "agency" | "admin";

const TABS: { id: "user" | "agency"; label: string; icon: typeof User }[] = [
  { id: "user", label: "Individual / Customer", icon: User },
  { id: "agency", label: "Akshaya & Agency Partner", icon: Building2 },
];

export function LoginView() {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const notice = params.get("auth") === "required";
  const pendingNotice = params.get("notice") === "pending_approval";
  const unauthorized = params.get("notice") === "unauthorized";
  const authFailed = params.get("error") === "auth_failed" || params.get("auth") === "error";
  const [tab, setTab] = useState<Tab>(["agency", "admin"].includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : params.get("notice") === "unauthorized" ? "admin" : "user");
  const lastSite = useRef<"user" | "agency">(tab === "agency" ? "agency" : "user");

  const [mode, setMode] = useState<"signin" | "register">(params.get("mode") === "register" ? "register" : "signin");
  const sync = (t: Tab, m: "signin" | "register") => window.history.replaceState(null, "", `/login?tab=${t}${m === "register" ? "&mode=register" : ""}`); // shareable, no server round-trip
  const pick = (t: Tab) => { if (t !== "admin") lastSite.current = t; setTab(t); sync(t, t === "admin" ? "signin" : mode); };
  const pickMode = (m: "signin" | "register") => { setMode(m); sync(tab, m); };

  // Already signed in: partners go to their dashboard, customers Home (unless they came to switch to the partner tab).
  useEffect(() => {
    if (!ready || !user || unauthorized) return; // bounced from /admin: stay and explain
    // The admin portal is entered only from the Admin tab; every other tab treats an admin like any customer.
    if (tab === "admin") { if (user.is_admin) router.replace("/admin"); return; } // non-admins stay: the form signs them out
    if (user.is_agency) router.replace(homeFor(user));
    else if (user.partner_status === "pending") { if (!pendingNotice) router.replace("/"); } // pending partners stay for the notice
    else if (tab !== "agency") router.replace("/");
  }, [ready, user, tab, pendingNotice, unauthorized, router]);

  const agency = tab === "agency";
  const admin = tab === "admin";
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-10 dark:bg-[#0B132B]">
      <Broadsheet />
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-10">
      <motion.main
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md shrink-0"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Image src="/images/intelliad-icon.png" alt="" width={600} height={540} priority className="h-14 w-auto" />
            <h1 className="font-serif text-4xl leading-none font-black tracking-tight">
              <span className="text-[#0F172A] dark:text-[#FFFFFF]">Intelli</span><span className="text-emerald-700 dark:text-emerald-400">Ad</span>
            </h1>
          </div>
          <p className="mt-3 border-t-2 border-[#0F172A] pt-2 font-mono text-xs font-medium tracking-wide text-zinc-700 uppercase dark:border-[#2B3D6B] dark:text-slate-200">Kerala&apos;s Premier Newspaper Ad Booking Platform</p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div role="group" aria-label="Sign-in area" className="mb-4 grid grid-cols-2 rounded-lg border border-slate-200 p-0.5 text-xs font-bold dark:border-slate-700">
            <button type="button" aria-pressed={!admin} onClick={() => pick(lastSite.current)} className={cn("rounded-md px-2 py-1.5 transition-colors", !admin ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300")}>User / Agency</button>
            <button type="button" aria-pressed={admin} onClick={() => pick("admin")} className={cn("flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 transition-colors", admin ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-300")}><Lock className="h-3 w-3" aria-hidden="true" />Admin</button>
          </div>
          {!admin && <div role="tablist" aria-label="Sign-in type" className="relative mb-6 grid grid-cols-2 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={on} aria-controls="login-panel" onClick={() => pick(t.id)}
                  className={cn("relative flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600", on ? "text-slate-950 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-300")}>
                  {on && <motion.span layoutId="login-tab-pill" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-slate-700" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <t.icon className="relative h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>}

          <div id="login-panel" role="tabpanel" aria-labelledby={admin ? undefined : `tab-${tab}`}>
            {pendingNotice && user?.partner_status === "pending" ? (
              <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-center dark:border-amber-500/40 dark:bg-amber-500/10">
                <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" aria-hidden="true" />
                <h2 className="mt-2 text-lg font-extrabold text-amber-950 dark:text-amber-100">Partner account pending</h2>
                <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">Your partner account is pending admin verification. You will be able to access the dashboard once approved.</p>
                <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">നിങ്ങളുടെ പാർട്ണർ അക്കൗണ്ട് പരിശോധനയിലാണ്. അഡ്മിൻ അംഗീകാരം ലഭിച്ച ഉടൻ ഡാഷ്‌ബോർഡ് ലഭ്യമാകും.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href="/book" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Book an ad meanwhile</Link>
                  <button type="button" onClick={() => void signOut()} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-500/20">Sign out</button>
                </div>
              </div>
            ) : (<>
            {unauthorized && <p role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100">{user ? "This account doesn't have admin access. Sign in with an admin account to continue." : "Admin sign-in required. Please sign in with an admin account."}</p>}
            {authFailed && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200">That confirmation link didn't work or has expired. Sign in, or register again to get a new link.</p>}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {admin ? (<>
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase dark:bg-slate-100 dark:text-slate-900"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Restricted</div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Admin Access</h2>
                  <p className="mt-1 mb-5 text-sm text-slate-600 dark:text-slate-200">Sign in to manage rate cards and administrator accounts. Accounts without admin privileges are signed out.</p>
                  <AdminForm />
                </>) : (<>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {agency ? (mode === "register" ? "Register as a Partner" : "Partner & Agency Portal") : mode === "register" ? "Create your account" : "Welcome Back"}
                </h2>
                <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-200">
                  {agency ? "Official gateway for Akshaya Centres, Jan Seva Kendras, and Registered Agencies" : "Book and manage your newspaper and media advertisements"}
                </p>
                <div role="group" aria-label="Sign in or register" className="mb-5 flex gap-4 border-b border-slate-200 text-sm font-bold dark:border-slate-700">
                  {(["signin", "register"] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={mode === m} onClick={() => pickMode(m)} className={cn("-mb-px border-b-2 pb-2 transition-colors", mode === m ? "border-blue-600 text-blue-700 dark:text-sky-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-300")}>
                      {m === "signin" ? "Sign In" : "Create Account"}
                    </button>
                  ))}
                </div>
                {agency ? <AgencyForm mode={mode} /> : <AuthForm mode={mode} notice={notice} />}
                </>)}
              </motion.div>
            </AnimatePresence>
            </>)}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">By continuing you agree to IntelliAd&apos;s Terms &amp; Privacy Policy.</p>
      </motion.main>
      {/* Only when an admin has an active banner: below the card on phones, beside it on desktop */}
      <LoginPromo />
      </div>
    </div>
  );
}

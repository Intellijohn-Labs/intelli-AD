"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, User } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AgencyForm } from "@/components/agency/agency-form";
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

type Tab = "user" | "agency";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "user", label: "Individual / Customer", icon: User },
  { id: "agency", label: "Akshaya & Agency Partner", icon: Building2 },
];

export function LoginView() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const notice = params.get("auth") === "required";
  const [tab, setTab] = useState<Tab>(params.get("tab") === "agency" ? "agency" : "user");

  const pick = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", `/login?tab=${t}`); // keeps the link shareable without a server round-trip
  };

  // Already signed in: partners go to their dashboard, customers Home (unless they came to switch to the partner tab).
  useEffect(() => {
    if (!ready || !user) return;
    if (user.is_agency) router.replace(homeFor(user));
    else if (tab !== "agency") router.replace("/");
  }, [ready, user, tab, router]);

  const agency = tab === "agency";
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-10 dark:bg-[#0B132B]">
      <Broadsheet />
      <motion.main
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
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
          <div role="tablist" aria-label="Sign-in type" className="relative mb-6 grid grid-cols-2 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
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
          </div>

          <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{agency ? "Partner & Agency Portal" : "Welcome Back"}</h2>
                <p className="mt-1 mb-5 text-sm text-slate-600 dark:text-slate-200">
                  {agency ? "Official gateway for Akshaya Centres, Jan Seva Kendras, and Registered Agencies" : "Book and manage your newspaper and media advertisements"}
                </p>
                {agency ? <AgencyForm /> : <AuthForm notice={notice} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">By continuing you agree to IntelliAd&apos;s Terms &amp; Privacy Policy.</p>
      </motion.main>
    </div>
  );
}

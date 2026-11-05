"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { safeCallback, useAuth } from "@/lib/auth";

const orbs = [
  { cls: "left-[-10%] top-[-12%] h-[50vmax] w-[50vmax] bg-indigo-600", x: [0, 60, -20, 0], y: [0, 40, 70, 0], d: 24, o: 0.28 },
  { cls: "right-[-12%] bottom-[-14%] h-[44vmax] w-[44vmax] bg-sky-500", x: [0, -60, 30, 0], y: [0, -50, 20, 0], d: 30, o: 0.22 },
  { cls: "left-[35%] top-[40%] h-[28vmax] w-[28vmax] bg-indigo-400", x: [0, 40, -40, 0], y: [0, -40, 30, 0], d: 34, o: 0.12 },
];

/** Faint Malayalam broadsheet: columns of headline + body text in indigo, like a printed front page. */
const HEADLINES = ["കേരളത്തിലെ വാർത്തകൾ", "പത്രപരസ്യം ബുക്ക് ചെയ്യാം", "ഇന്നത്തെ പ്രധാന വാർത്തകൾ", "ക്ലാസിഫൈഡ് പരസ്യങ്ങൾ", "മലയാള മനോരമ മാതൃഭൂമി"];
const BODY = "തിരുവനന്തപുരം: സംസ്ഥാനത്തെ പ്രധാന പത്രങ്ങളിൽ പരസ്യം നൽകുന്നതിനുള്ള നിരക്കുകൾ താരതമ്യം ചെയ്യാനും ബുക്ക് ചെയ്യാനും ഇനി എളുപ്പം. വിവാഹം, വാടക, തൊഴിൽ, വിദ്യാഭ്യാസം തുടങ്ങിയ വിഭാഗങ്ങളിലെ പരസ്യങ്ങൾ തത്സമയ നിരക്കിൽ. ";

function Broadsheet() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden opacity-[0.07]">
      <div className="mx-auto grid h-full max-w-[1600px] -rotate-2 scale-110 grid-cols-2 gap-x-8 text-indigo-300 sm:grid-cols-3 lg:grid-cols-5" style={{ fontFamily: '"Noto Serif Malayalam", "Noto Sans Malayalam", serif' }}>
        {HEADLINES.map((h, i) => (
          <div key={i} className="border-r border-indigo-300/40 pr-6 first:pl-0">
            <p className="mt-6 border-b-2 border-indigo-300/60 pb-2 text-3xl leading-tight font-extrabold">{h}</p>
            <p className="mt-4 text-sm leading-relaxed">{BODY.repeat(14)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoginView() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const callbackUrl = useSearchParams().get("callbackUrl");

  // Already signed in (e.g. opened /login directly): go straight on.
  useEffect(() => {
    if (ready && user) router.replace(safeCallback(callbackUrl));
  }, [ready, user, router, callbackUrl]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <Broadsheet />
      {orbs.map((o, i) => (
        <motion.div key={i} aria-hidden="true" className={`pointer-events-none absolute rounded-full blur-3xl ${o.cls}`} style={{ opacity: o.o }}
          animate={{ x: o.x, y: o.y }} transition={{ type: "tween", duration: o.d, repeat: Infinity, ease: "easeInOut" }} />
      ))}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.85)_100%)]" />

      <motion.main
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 drop-shadow-[0_0_22px_rgba(99,102,241,0.55)]">
            <Image src="/images/intelliad-icon.png" alt="" width={600} height={540} priority className="h-14 w-auto" />
            <h1 className="text-4xl leading-none font-extrabold tracking-tight">
              <span className="text-indigo-300">Intelli</span><span className="text-indigo-500">Ad</span>
            </h1>
          </div>
          <p className="mt-3 text-sm font-medium text-indigo-100/80">Kerala&apos;s Premier Newspaper Ad Booking Platform</p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Sign in to continue</h2>
          <p className="mt-1 mb-5 text-sm text-zinc-600 dark:text-zinc-300">Manage your newspaper releases &amp; track live ad proofs.</p>
          <AuthForm callbackUrl={callbackUrl} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">By continuing you agree to IntelliAd&apos;s Terms &amp; Privacy Policy.</p>
      </motion.main>
    </div>
  );
}

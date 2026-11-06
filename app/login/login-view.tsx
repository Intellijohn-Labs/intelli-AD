"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/lib/auth";

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

export function LoginView() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const notice = useSearchParams().get("auth") === "required";

  // Already signed in (e.g. opened /login directly): go straight Home.
  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

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

        <div className="mx-auto w-full max-w-md rounded-md border-2 border-[#0F172A] bg-[#ffffff] p-8 dark:border-[#2B3D6B] dark:bg-[#132247]">
          <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Sign in to continue</h2>
          <p className="mt-1 mb-5 text-sm text-zinc-600 dark:text-slate-200">Manage your newspaper releases &amp; track live ad proofs.</p>
          <AuthForm notice={notice} />
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">By continuing you agree to IntelliAd&apos;s Terms &amp; Privacy Policy.</p>
      </motion.main>
    </div>
  );
}

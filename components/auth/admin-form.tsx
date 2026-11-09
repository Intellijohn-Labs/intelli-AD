"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { signInWithPassword, signOutSupabase } from "@/lib/supabase/auth";

const DENIED = "Access denied. Not an admin.";

/** Admin sign-in: email + password only (no registration). Non-admins are signed straight back out. */
export function AdminForm() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!email.trim() || !password) return setError("Enter your admin email and password.");
    setBusy(true);
    const res = await signInWithPassword(email.trim(), password);
    if (res.error || !res.user) { setBusy(false); return setError(res.error ?? "Couldn't sign in."); }
    // app_metadata can only be set by an administrator, unlike user_metadata which the user controls.
    if ((res.user.app_metadata as { role?: string } | undefined)?.role !== "admin") {
      await signOutSupabase();
      setBusy(false);
      setPassword("");
      setError(DENIED);
      toast(DENIED);
      return;
    }
    toast("Welcome, admin");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field id="ad-email" label="Admin email" required><Input id="ad-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field id="ad-pass" label="Password" required><Input id="ad-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200">{error}</p>}
      <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />} Sign in as admin
      </button>
    </form>
  );
}

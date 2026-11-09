"use client";

import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { createAdmin, promoteToAdmin, revokeAdmin, type ActionResult, type AdminRow } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";

const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700";
const lbl = "mb-1 block text-sm font-semibold text-slate-800 dark:text-slate-100";

function Result({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  return <p role={r.ok ? "status" : "alert"} className={`mt-3 text-sm font-medium ${r.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{r.message}</p>;
}

export function AdminManager({ admins, serviceKey }: { admins: AdminRow[]; serviceKey: boolean }) {
  const toast = useToast();
  const [created, createAction, creating] = useActionState(createAdmin, null);
  const [promoted, promoteAction, promoting] = useActionState(promoteToAdmin, null);
  const [pending, start] = useTransition();
  const [revokeMsg, setRevokeMsg] = useState<ActionResult | null>(null);

  function revoke(a: AdminRow) {
    if (!window.confirm(`Remove admin access for ${a.email}?`)) return;
    start(async () => {
      const r = await revokeAdmin(a.id);
      setRevokeMsg(r);
      if (r.ok) toast("Admin access removed");
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Admin users</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Admins can manage rate cards and other admins. Roles are stored where users can't edit them.</p>
      {!serviceKey && <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Admin management needs <code>SUPABASE_SERVICE_ROLE_KEY</code> in the server environment (.env.local and your host). It is never sent to the browser.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><UserPlus className="h-5 w-5" aria-hidden="true" /> Add an admin</h2>
          <form action={createAction} className="mt-4 space-y-3" autoComplete="off">
            <div><label className={lbl} htmlFor="fullName">Full name</label><Input id="fullName" name="fullName" required minLength={2} /></div>
            <div><label className={lbl} htmlFor="email">Email</label><Input id="email" name="email" type="email" required /></div>
            <div>
              <label className={lbl} htmlFor="password">Initial password <span className="font-normal text-slate-500">(optional)</span></label>
              <PasswordInput id="password" name="password" minLength={10} autoComplete="new-password" placeholder="Leave blank to email an invitation" />
              <p className="mt-1 text-xs text-slate-500">10+ characters. With a password the account is active immediately; without one, an invitation email is sent.</p>
            </div>
            <Button type="submit" disabled={creating || !serviceKey}>{creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Add admin</Button>
          </form>
          <Result r={created} />
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><ShieldCheck className="h-5 w-5" aria-hidden="true" /> Promote existing account</h2>
          <form action={promoteAction} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1"><label className={lbl} htmlFor="promote-email">Email</label><Input id="promote-email" name="email" type="email" required /></div>
            <Button type="submit" variant="secondary" disabled={promoting || !serviceKey}>{promoting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Make admin</Button>
          </form>
          <Result r={promoted} />
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Current admins <span className="text-sm font-normal text-slate-500">({admins.length})</span></h2>
        <Result r={revokeMsg} />
        <div className="mt-4 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Last sign-in</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {!admins.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">{serviceKey ? "No admins found." : "Unavailable until the service key is set."}</td></tr>}
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">{a.name || "—"}</td><td className="px-3 py-2">{a.email}</td>
                  <td className="px-3 py-2">{a.lastSignIn ? new Date(a.lastSignIn).toLocaleString() : "Never"}</td>
                  <td className="px-3 py-2 text-right"><button type="button" disabled={pending} aria-label={`Remove admin ${a.email}`} onClick={() => revoke(a)} className="rounded p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

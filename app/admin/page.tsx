import { ArrowRight, Megaphone, Monitor, Newspaper, Radio, SignpostBig } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { newspapers } from "@/data/newspapers";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES: { title: string; desc: string; icon: ReactNode; href?: string; badge: string; tone: string }[] = [
  { title: "Newspaper Ads", desc: "Classified text, classified display and commercial display rates for every publication and edition.", icon: <Newspaper className="h-6 w-6" />, href: "/admin/rates", badge: "Live Rates", tone: "from-blue-600 to-sky-500" },
  { title: "Radio & Audio Ads", desc: "FM spots, sponsorships and podcast slots.", icon: <Radio className="h-6 w-6" />, badge: "Coming Soon", tone: "from-slate-400 to-slate-500" },
  { title: "TV & Screen Media", desc: "Television spots, digital screens and cinema.", icon: <Monitor className="h-6 w-6" />, badge: "Coming Soon", tone: "from-slate-400 to-slate-500" },
  { title: "Outdoor / Hoardings", desc: "Billboards, unipoles and transit media.", icon: <SignpostBig className="h-6 w-6" />, badge: "Coming Soon", tone: "from-slate-400 to-slate-500" },
];

export default async function AdminOverview() {
  const supabase = await createClient();
  const { count } = supabase ? await supabase.from("publication_rates").select("*", { count: "exact", head: true }) : { count: null };
  const active = CATEGORIES.filter((c) => c.href).length;
  const metrics = [
    { label: "Active categories", value: active, hint: `of ${CATEGORIES.length} planned` },
    { label: "Total newspapers", value: newspapers.length, hint: "supported publications" },
    { label: "Current active rates", value: count ?? "—", hint: count === null ? "couldn't load" : "rate rules in database" },
  ];
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white"><Megaphone className="h-6 w-6" aria-hidden="true" /> Media Hub</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose a media category to manage its rates.</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700">
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{m.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">{m.value}</dd>
            <p className="text-xs text-slate-500">{m.hint}</p>
          </div>
        ))}
      </dl>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const body = (
            <>
              <div className="flex items-start justify-between">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${c.tone}`} aria-hidden="true">{c.icon}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.href ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{c.badge}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{c.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.desc}</p>
              {c.href && <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700 dark:text-sky-300">Manage rates <ArrowRight className="h-4 w-4" aria-hidden="true" /></p>}
            </>
          );
          return (
            <li key={c.title}>
              {c.href ? (
                <Link href={c.href} className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700">{body}</Link>
              ) : (
                <div aria-disabled="true" className="h-full rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 opacity-75 dark:border-slate-700">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { ArrowRight, ImageIcon, Mails, Megaphone, Monitor, Newspaper, Radio, ReceiptText, Sparkles, SignpostBig, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { newspapers } from "@/data/newspapers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface Module { title: string; desc: string; icon: ReactNode; href: string; badge: string; tone: string; cta: string; extra?: { href: string; label: string } }
interface Soon { title: string; desc: string; icon: ReactNode }

/** Row counts for the live badges. Never throws: a missing table or key just falls back to the plain badge. */
async function counts() {
  const supabase = await createClient(), admin = createAdminClient();
  const n = async (q: PromiseLike<{ count: number | null; error: unknown }> | null) => { try { const r = q ? await q : null; return r && !r.error ? r.count : null; } catch { return null; } };
  const head = { count: "exact", head: true } as const;
  const [rates, bookings, banners, templates] = await Promise.all([
    n(supabase ? supabase.from("publication_rates").select("*", head) : null),
    n(admin ? admin.from("bookings").select("*", head) : null),
    n(admin ? admin.from("promotional_banners").select("*", head) : null),
    n(admin ? admin.from("custom_templates").select("*", head) : null),
  ]);
  return { rates, bookings, banners, templates };
}

export default async function AdminOverview() {
  const c = await counts();
  const modules: Module[] = [
    { title: "Newspapers & Rates", desc: "Manage classified text, classified display and commercial display rates across all 9 publications.", icon: <Newspaper className="h-6 w-6" />, href: "/admin/rates", badge: c.rates != null ? `Live Rates · ${c.rates} rules` : "Live Rates", tone: "bg-[#D12014]", cta: "Manage rates" },
    { title: "Invitation & Greeting Templates", desc: "Upload, show, hide or remove studio card and video templates, including your own company designs.", icon: <Mails className="h-6 w-6" />, href: "/admin/templates", badge: c.templates != null ? `Studio · ${c.templates} uploaded` : "Studio", tone: "bg-[#8C1C2B]", cta: "Manage templates", extra: { href: "/admin/invitations", label: "Built-in designs: show / hide" } },
    { title: "Bookings Monitor", desc: "View, verify and manage customer newspaper ad bookings.", icon: <ReceiptText className="h-6 w-6" />, href: "/admin/bookings", badge: c.bookings != null ? `Live · ${c.bookings} bookings` : "Live", tone: "bg-[#0F766E]", cta: "Open bookings" },
    { title: "Ad Banners (പ്രമോഷൻ പോസ്റ്ററുകൾ)", desc: "Manage the promotional posters and banners shown on the home page and in the studio.", icon: <ImageIcon className="h-6 w-6" />, href: "/admin/banners", badge: c.banners != null ? `Banners · ${c.banners}` : "Banners", tone: "bg-[#B45309]", cta: "Manage banners" },
    { title: "Admin Users", desc: "Manage admin accounts, roles and access permissions.", icon: <UsersRound className="h-6 w-6" />, href: "/admin/admins", badge: "Access", tone: "bg-[#1D4ED8]", cta: "Manage users" },
    { title: "AI Settings", desc: "Configure the AI keys and models behind wording, quotes and artwork generation.", icon: <Sparkles className="h-6 w-6" />, href: "/admin/settings/ai", badge: "AI", tone: "bg-[#6D28D9]", cta: "Open AI settings" },
  ];
  const soon: Soon[] = [
    { title: "Radio & Audio Ads", desc: "FM spots, sponsorships and podcast slots.", icon: <Radio className="h-6 w-6" /> },
    { title: "TV & Screen Media", desc: "Television spots, digital screens and cinema.", icon: <Monitor className="h-6 w-6" /> },
    { title: "Outdoor / Hoardings", desc: "Billboards, unipoles and transit media.", icon: <SignpostBig className="h-6 w-6" /> },
  ];
  const metrics = [
    { label: "Active modules", value: modules.length, hint: `plus ${soon.length} coming soon` },
    { label: "Total newspapers", value: newspapers.length, hint: "supported publications" },
    { label: "Current active rates", value: c.rates ?? "—", hint: c.rates === null ? "couldn't load" : "rate rules in database" },
  ];
  return (
    <div>
      <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-white"><Megaphone className="h-6 w-6" aria-hidden="true" /> Admin Hub</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pick a module to manage it. Each one opens on its own page, and “All Modules” in the top bar brings you back here.</p>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <div key={m.label} className="reveal-scale rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_0_rgba(24,24,27,.04)] dark:border-slate-700 dark:bg-slate-900" style={{ "--i": i } as React.CSSProperties}>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{m.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">{m.value}</dd>
            <p className="text-xs text-slate-500">{m.hint}</p>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-sm font-bold tracking-wide text-slate-500 uppercase">Modules</h2>
      <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-admin-modules>
        {modules.map((m, i) => (
          <li key={m.title} className="reveal-up" style={{ "--i": i } as React.CSSProperties}>
            <div className="card-lift group relative flex h-full flex-col rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_0_rgba(24,24,27,.04)] dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-[0_2px_0_rgba(0,0,0,.35)] ${m.tone}`} aria-hidden="true">{m.icon}</span>
                <span className="rounded-full bg-[#059669]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">{m.badge}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                {/* The title link stretches over the whole card (::after), so the entire card is the tap target. */}
                <Link href={m.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D12014]">{m.title}</Link>
              </h3>
              <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-300">{m.desc}</p>
              <p className="mt-4 inline-flex min-h-6 items-center gap-1 text-sm font-bold text-[#D12014] dark:text-sky-300">{m.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></p>
              {m.extra && <Link href={m.extra.href} className="relative z-10 mt-2 inline-flex min-h-11 items-center self-start text-xs font-bold text-slate-700 underline underline-offset-2 hover:text-[#D12014] dark:text-slate-200">{m.extra.label}</Link>}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-bold tracking-wide text-slate-500 uppercase">Coming soon</h2>
      <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {soon.map((m) => (
          <li key={m.title}>
            <div aria-disabled="true" className="h-full rounded-xl border border-dashed border-slate-300 bg-white/60 p-5 opacity-75 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-400 text-white shadow-[0_2px_0_rgba(0,0,0,.35)]" aria-hidden="true">{m.icon}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">Coming Soon</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{m.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{m.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

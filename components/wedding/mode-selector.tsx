"use client";

import { ArrowRight, Check, Mails, PartyPopper } from "lucide-react";
import Link from "next/link";

const MODES = [
  {
    mode: "invitation", Icon: Mails, title: "Invitation Cards", ml: "ക്ഷണക്കത്തുകൾ", tone: "from-[#B8860B] to-[#E3BE5C]",
    text: "Wedding, Engagement, Housewarming, Birthday & Inauguration invites with event date, venue, custom card upload & personalized WhatsApp delivery.",
    points: ["Wedding, Engagement, Housewarming, Birthday, Inauguration", "Event date, time, venue & Google Maps", "Upload your own card design"],
    cta: "Create an invitation",
  },
  {
    mode: "greeting", Icon: PartyPopper, title: "Greeting Cards", ml: "ആശംസാ കാർഡുകൾ", tone: "from-[#D12014] to-[#F08C3C]",
    text: "Onam, Vishu, Christmas, New Year, Eid, Diwali & custom festival wishes with each recipient's name & logo/photo.",
    points: ["Onam, Vishu, Christmas, New Year, Eid, Diwali", "AI wish writer in English & Malayalam", "Your name, photo or brand logo"],
    cta: "Create a greeting",
  },
] as const;

/** The first screen of /invitation-cards: choose invitations or festival greetings before entering the 4-step studio. */
export function ModeSelector({ pathname }: { pathname: string }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="kicker mb-2 text-center">Invitation or Greeting Cards · ക്ഷണക്കത്തും ആശംസാ കാർഡും</p>
      <h1 className="text-center text-3xl leading-tight font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">What would you like to create?</h1>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600 dark:text-slate-300">Both use the same studio: pick a template, add your details, then send a personalised card to every guest or contact on WhatsApp through Waau Panel. You can switch any time without losing your list.</p>
      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {MODES.map((m) => (
          <li key={m.mode}>
            <Link href={`${pathname}?mode=${m.mode}`} className="group flex h-full flex-col rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_0_rgba(24,24,27,.04)] transition hover:-translate-y-0.5 hover:border-[#D12014] hover:shadow-lg dark:border-slate-700 dark:bg-[#131416]">
              <span className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${m.tone} text-white shadow`} aria-hidden="true"><m.Icon className="h-7 w-7" /></span>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">{m.title}</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{m.ml}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{m.text}</p>
              <ul className="mt-4 space-y-1.5">{m.points.map((pt) => <li key={pt} className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-100"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" aria-hidden="true" />{pt}</li>)}</ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#D12014] group-hover:gap-2.5 dark:text-[#E83E32]">{m.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

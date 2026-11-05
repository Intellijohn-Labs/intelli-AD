/** Soft pastel tints for selection cards. Class names are spelled out so Tailwind can see them. */
export interface Tint {
  base: string;
  on: string;
}

export const AD_TYPE_TINT: Record<string, Tint> = {
  "classified-text": {
    base: "bg-sky-50/70 border-sky-200/80 hover:border-sky-400 text-sky-950 dark:bg-sky-500/20 dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-sky-500/30",
    on: "border-sky-500 ring-2 ring-sky-300/60 shadow-[0_0_22px_rgba(14,165,233,0.28)] dark:bg-sky-500/30 dark:border-sky-500 dark:ring-sky-500/40",
  },
  "classified-display": {
    base: "bg-indigo-50/70 border-indigo-200/80 hover:border-indigo-400 text-indigo-950 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-500/30",
    on: "border-indigo-500 ring-2 ring-indigo-300/60 shadow-[0_0_22px_rgba(99,102,241,0.28)] dark:bg-indigo-500/30 dark:border-indigo-500 dark:ring-indigo-500/40",
  },
  "commercial-display": {
    base: "bg-amber-50/70 border-amber-200/80 hover:border-amber-400 text-amber-950 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/30",
    on: "border-amber-500 ring-2 ring-amber-300/60 shadow-[0_0_22px_rgba(245,158,11,0.3)] dark:bg-amber-500/30 dark:border-amber-500 dark:ring-amber-500/40",
  },
};

export const CATEGORY_TINT: Record<string, Tint> = {
  matrimonial: {
    base: "bg-rose-50/60 border-rose-200/70 hover:bg-rose-50 text-rose-950 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/30",
    on: "bg-rose-50 border-rose-500 ring-2 ring-rose-300/60 shadow-[0_0_22px_rgba(244,63,94,0.25)] dark:bg-rose-500/30 dark:border-rose-500 dark:ring-rose-500/40",
  },
  property: {
    base: "bg-emerald-50/60 border-emerald-200/70 hover:bg-emerald-50 text-emerald-950 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-500/30",
    on: "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300/60 shadow-[0_0_22px_rgba(16,185,129,0.25)] dark:bg-emerald-500/30 dark:border-emerald-500 dark:ring-emerald-500/40",
  },
  recruitment: {
    base: "bg-violet-50/60 border-violet-200/70 hover:bg-violet-50 text-violet-950 dark:bg-violet-500/20 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-500/30",
    on: "bg-violet-50 border-violet-500 ring-2 ring-violet-300/60 shadow-[0_0_22px_rgba(139,92,246,0.25)] dark:bg-violet-500/30 dark:border-violet-500 dark:ring-violet-500/40",
  },
  "public-notice": {
    base: "bg-orange-50/60 border-orange-200/70 hover:bg-orange-50 text-orange-950 dark:bg-orange-500/20 dark:border-orange-500/40 dark:text-orange-200 dark:hover:bg-orange-500/30",
    on: "bg-orange-50 border-orange-500 ring-2 ring-orange-300/60 shadow-[0_0_22px_rgba(249,115,22,0.25)] dark:bg-orange-500/30 dark:border-orange-500 dark:ring-orange-500/40",
  },
  "name-change": {
    base: "bg-teal-50/60 border-teal-200/70 hover:bg-teal-50 text-teal-950 dark:bg-teal-500/20 dark:border-teal-500/40 dark:text-teal-200 dark:hover:bg-teal-500/30",
    on: "bg-teal-50 border-teal-500 ring-2 ring-teal-300/60 shadow-[0_0_22px_rgba(20,184,166,0.25)] dark:bg-teal-500/30 dark:border-teal-500 dark:ring-teal-500/40",
  },
  obituary: {
    base: "bg-slate-100/70 border-slate-300/70 hover:bg-slate-100 text-slate-900 dark:bg-slate-500/20 dark:border-slate-500/40 dark:text-slate-200 dark:hover:bg-slate-500/30",
    on: "bg-slate-100 border-slate-500 ring-2 ring-slate-300/70 shadow-[0_0_22px_rgba(100,116,139,0.25)] dark:bg-slate-500/30 dark:border-slate-400 dark:ring-slate-500/50",
  },
  business: {
    base: "bg-fuchsia-50/60 border-fuchsia-200/70 hover:bg-fuchsia-50 text-fuchsia-950 dark:bg-fuchsia-500/20 dark:border-fuchsia-500/40 dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/30",
    on: "bg-fuchsia-50 border-fuchsia-500 ring-2 ring-fuchsia-300/60 shadow-[0_0_22px_rgba(217,70,239,0.25)] dark:bg-fuchsia-500/30 dark:border-fuchsia-500 dark:ring-fuchsia-500/40",
  },
};

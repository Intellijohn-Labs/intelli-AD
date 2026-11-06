import { Highlighter, Landmark } from "lucide-react";
import { Garland, Lamp } from "@/components/booking/templates/obituary-template";

/*
 * Small newsprint-style illustrations for the services hub. They use fixed hex colours (not theme
 * tokens) so they read as printed paper in both light and dark mode.
 */
const INK = "bg-[#a8a29e]";
const Lines = ({ widths, className = "" }: { widths: number[]; className?: string }) => (
  <div className={className}>
    {widths.map((w, i) => <div key={i} className={`mb-1.5 h-1.5 rounded-full ${INK}`} style={{ width: `${w}%` }} />)}
  </div>
);
const Paper = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative bg-[#fffdf8] shadow-[2px_4px_10px_rgba(0,0,0,0.12)] ${className}`}>{children}</div>
);

/** 1. A column of printed lines with a highlighter stroke over one of them. */
export function ClassifiedTextArt() {
  return (
    <Paper className="w-[78%] -rotate-2 p-3">
      <Lines widths={[100, 92, 96, 70]} />
      <div className="relative">
        <span aria-hidden="true" className="absolute -inset-x-1 -top-0.5 h-3.5 -rotate-1 bg-yellow-300/80 mix-blend-multiply" />
        <Lines widths={[98, 84]} className="relative" />
      </div>
      <Lines widths={[100, 88, 94, 60]} />
      <Highlighter aria-hidden="true" className="absolute -right-3 -bottom-3 h-8 w-8 rotate-12 text-[#44403c]" />
    </Paper>
  );
}

/** 2. Boxed ads with bordered photo / logo. */
export function ClassifiedDisplayArt() {
  return (
    <div className="flex w-[84%] flex-col gap-2.5">
      <Paper className="rotate-1 border-2 border-[#1c1917] p-2">
        <div className="flex gap-2">
          <div className="h-10 w-9 shrink-0 border border-[#1c1917] bg-[#d6d3d1]" />
          <Lines widths={[100, 85, 95, 60]} className="flex-1 pt-1" />
        </div>
      </Paper>
      <Paper className="-rotate-1 border border-[#1c1917] p-2 outline outline-1 outline-offset-2 outline-[#1c1917]/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full border border-[#1c1917] bg-[#d6d3d1]" />
          <Lines widths={[90, 70]} className="flex-1 pt-1.5" />
        </div>
      </Paper>
    </div>
  );
}

/** 3. Official notice: double frame, seal and department-logo slot, tabular rows. */
export function TenderArt() {
  return (
    <Paper className="w-[80%] border-2 border-[#1c1917] p-1">
      <div className="border border-[#1c1917] p-2">
        <div className="flex items-center justify-center gap-2 border-b-2 border-double border-[#1c1917] pb-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1c1917] bg-[#e7e5e4]"><Landmark className="h-4 w-4 text-[#292524]" aria-hidden="true" /></div>
          <div className="space-y-1"><div className="h-2 w-16 rounded bg-[#292524]" /><div className="h-1.5 w-12 rounded bg-[#78716c]" /></div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-1 flex border border-[#1c1917]"><div className="h-3 w-2/5 border-r border-[#1c1917] bg-[#e7e5e4]" /><div className="flex-1 p-0.5"><div className={`h-1.5 rounded-full ${INK}`} style={{ width: `${70 - i * 12}%` }} /></div></div>
        ))}
        <div className="absolute -right-3 -bottom-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-[#9f1239] bg-[#fffdf8]/90 text-[7px] font-extrabold tracking-wider text-[#9f1239] -rotate-12">OFFICIAL</div>
      </div>
    </Paper>
  );
}

/** 4. Memorial frame with garland and a brass lamp. */
export function RemembranceArt() {
  return (
    <Paper className="w-[78%] border-2 border-[#1c1917] p-2 pb-3">
      <div className="mx-auto h-1.5 w-20 rounded bg-[#292524]" />
      <div className="relative mx-auto mt-2 h-[88px] w-[88px]">
        <div className="absolute inset-3 rounded-full border-2 border-[#1c1917] bg-[#d6d3d1]" />
        <Garland round w={88} h={88} />
      </div>
      <Lines widths={[80, 60]} className="mt-2 flex flex-col items-center [&>div]:mx-auto" />
      <span className="absolute -right-3 -bottom-4 scale-75"><Lamp /></span>
    </Paper>
  );
}

/** 5. Full-page broadsheet with a colourful jacket banner and ear panel. */
export function PremiumArt() {
  return (
    <Paper className="h-[88%] w-[62%] rotate-1 overflow-hidden border border-[#78716c]">
      <div className="h-[34%] bg-gradient-to-br from-[#e11d48] via-[#f97316] to-[#facc15] p-1.5">
        <div className="h-2 w-2/3 rounded bg-white/90" />
        <div className="mt-1 h-1.5 w-1/2 rounded bg-white/70" />
      </div>
      <span aria-hidden="true" className="absolute top-1 right-1 h-6 w-7 rounded-sm bg-[#1d4ed8] text-center text-[6px] leading-6 font-bold text-white">EAR</span>
      <div className="p-1.5">
        <div className="mb-1 h-2.5 w-4/5 rounded bg-[#292524]" />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((c) => <Lines key={c} widths={[100, 90, 96, 80, 100, 70, 90]} />)}
        </div>
      </div>
    </Paper>
  );
}

/** 6. Retail campaign inside broadsheet pages. */
export function CommercialArt() {
  return (
    <Paper className="w-[82%] -rotate-1 overflow-hidden border border-[#78716c]">
      <div className="bg-gradient-to-r from-[#7c3aed] to-[#db2777] px-2.5 py-2 text-white">
        <p className="text-[9px] font-bold tracking-widest uppercase opacity-90">Grand launch</p>
        <p className="text-2xl leading-none font-black">50% OFF</p>
      </div>
      <div className="flex items-center gap-2 p-2">
        <div className="h-9 w-9 shrink-0 rounded bg-[#fcd34d]" />
        <Lines widths={[100, 80, 90]} className="flex-1" />
      </div>
    </Paper>
  );
}

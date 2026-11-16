/** Shared (client-safe) definitions for the AI obituary poster designer. */
export type PosterStyleId = "classic" | "honored" | "memoriam";

export const POSTER_STYLES: { id: PosterStyleId; ml: string; en: string; note: string }[] = [
  { id: "classic", ml: "ക്ലാസിക് പത്ര ശൈലി", en: "Classic Newsprint Box", note: "മെഴുകുതിരി · ഇരുണ്ട അടിഭാഗ ബാൻഡിൽ വെളുത്ത അക്ഷരങ്ങൾ" },
  { id: "honored", ml: "വൃത്താകൃതി ഫ്രെയിം", en: "Ornate Circle & Title Box", note: "വൃത്താകൃതി ഫ്രെയിം · ബോർഡർ ടൈറ്റിൽ ബാഡ്ജ്" },
  { id: "memoriam", ml: "പുഷ്പാലങ്കാര ശൈലി", en: "Floral Pavilion / Joint Tribute", note: "റോസാപ്പൂക്കൾ · ഒന്നോ രണ്ടോ പേർക്ക്" },
];

/** A person named on a poster; `dates` is the "birth – death" text (joint memorials only). */
export interface PosterPerson { name: string; dates?: string }

/** Title printed (by the canvas compositor, never by the image model) at the top of each style. */
export function posterHeader(styleId: PosterStyleId, category: "obituary" | "remembrance"): string {
  if (category === "remembrance") return styleId === "classic" ? "സ്മരണാഞ്ജലി" : "ചരമവാർഷികം";
  return styleId === "memoriam" ? "കണ്ണീർപ്പൂക്കൾ" : "ആദരാഞ്ജലികൾ";
}

/** Aspect ratios the Gemini image models accept, as [label, w/h]. */
const ASPECTS: [string, number][] = [["1:1", 1], ["2:3", 2 / 3], ["3:4", 3 / 4], ["4:5", 4 / 5], ["5:4", 5 / 4], ["4:3", 4 / 3], ["3:2", 3 / 2]];
export function nearestAspect(widthCm: number, heightCm: number): string {
  const r = widthCm > 0 && heightCm > 0 ? widthCm / heightCm : 4 / 5;
  return ASPECTS.reduce((best, a) => (Math.abs(a[1] - r) < Math.abs(best[1] - r) ? a : best))[0];
}

/** Parses a Gemini aspect label such as "4:5" into width / height. */
export function aspectRatio(label: string): number {
  const [w, h] = label.split(":").map(Number);
  return w > 0 && h > 0 ? w / h : 4 / 5;
}

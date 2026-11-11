/** Shared (client-safe) definitions for the AI obituary poster designer. */
export type PosterStyleId = "classic" | "honored" | "memoriam";

export const POSTER_STYLES: { id: PosterStyleId; ml: string; en: string; note: string }[] = [
  { id: "classic", ml: "വിന്റേജ് പുഷ്പചക്ര ശൈലി", en: "Vintage Floral Wreath", note: "പുഷ്പചക്രത്തിൽ ഫോട്ടോ · “ആദരാഞ്ജലികൾ”" },
  { id: "honored", ml: "അലങ്കാര ഫ്രെയിം / ശ്രദ്ധാഞ്ജലി", en: "Ornate Frame / Tribute", note: "വിക്ടോറിയൻ ബോർഡർ · “വേദനയോടെ ഓർക്കുന്നു”" },
  { id: "memoriam", ml: "ലളിത സ്മരണ ശൈലി", en: "Minimalist Memoriam", note: "റോസാപ്പൂ / മെഴുകുതിരി · വ്യക്തമായ അറിയിപ്പ്" },
];

/** Aspect ratios the Gemini image models accept, as [label, w/h]. */
const ASPECTS: [string, number][] = [["1:1", 1], ["2:3", 2 / 3], ["3:4", 3 / 4], ["4:5", 4 / 5], ["5:4", 5 / 4], ["4:3", 4 / 3], ["3:2", 3 / 2]];
export function nearestAspect(widthCm: number, heightCm: number): string {
  const r = widthCm > 0 && heightCm > 0 ? widthCm / heightCm : 4 / 5;
  return ASPECTS.reduce((best, a) => (Math.abs(a[1] - r) < Math.abs(best[1] - r) ? a : best))[0];
}

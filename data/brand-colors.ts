/**
 * Approximate brand colours per publication, used to theme the masthead bar and the
 * page accent. These are design approximations, not verified official brand specs.
 */
export interface Brand {
  primary: string;
  accent: string;
}

export const DEFAULT_BRAND: Brand = { primary: "#2563EB", accent: "#059669" };

export const BRAND: Record<string, Brand> = {
  "malayala-manorama": { primary: "#1D4ED8", accent: "#06B6D4" }, // royal blue / cyan
  mathrubhumi: { primary: "#D4152A", accent: "#1E2A78" }, // crimson / deep ink blue
  deshabhimani: { primary: "#B0123A", accent: "#E11D48" }, // ruby red
  madhyamam: { primary: "#166534", accent: "#CA8A04" }, // forest green / gold
  "kerala-kaumudi": { primary: "#DC4A1B", accent: "#F97316" }, // vermilion
  siraj: { primary: "#0F766E", accent: "#14B8A6" }, // teal
  janmabhumi: { primary: "#C2410C", accent: "#F59E0B" }, // saffron
  chandrika: { primary: "#15803D", accent: "#84CC16" }, // green
  mangalam: { primary: "#7E22CE", accent: "#EC4899" }, // violet / magenta
  suprabhaatham: { primary: "#4338CA", accent: "#38BDF8" }, // indigo
  "the-hindu": { primary: "#1E3A8A", accent: "#64748B" },
  "times-of-india": { primary: "#C8102E", accent: "#F59E0B" },
  "new-indian-express": { primary: "#0F6B4F", accent: "#EAB308" },
  "hindustan-times": { primary: "#D6001C", accent: "#1E293B" },
  "deccan-herald": { primary: "#0057B8", accent: "#F59E0B" },
};

export const brandFor = (id: string): Brand => BRAND[id] ?? DEFAULT_BRAND;

/** Accent colour per ad category, for category cards. */
export const CATEGORY_COLOR: Record<string, string> = {
  matrimonial: "#E11D48",
  property: "#0284C7",
  recruitment: "#7C3AED",
  "public-notice": "#D97706",
  "name-change": "#4F46E5",
  obituary: "#475569",
  remembrance: "#9A3412",
  tender: "#0E7490",
  business: "#059669",
};

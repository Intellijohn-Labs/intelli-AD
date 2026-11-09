/**
 * Single source of truth for which publications IntelliAd supports, in display order.
 * data/newspapers.ts builds `newspapers` from this list, and the booking wizard, home page, rate validation and the
 * admin hub all read that, so they can never disagree.
 */
export const PUBLICATION_IDS = [
  "malayala-manorama",
  "mathrubhumi",
  "deshabhimani",
  "madhyamam",
  "mangalam",
  "deepika",
  "kerala-kaumudi",
  "the-hindu",
  "times-of-india",
] as const;

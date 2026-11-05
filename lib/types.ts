export type AdType = "classified-text" | "classified-display" | "commercial-display";

export type CategoryId =
  | "matrimonial"
  | "property"
  | "recruitment"
  | "public-notice"
  | "name-change"
  | "obituary"
  | "business";

export interface Enhancements {
  bold: boolean;
  border: boolean;
  tint: boolean;
}

export type ColorMode = "bw" | "color";

export interface DisplaySpec {
  columns: number;
  heightCm: number;
  colorMode: ColorMode;
}

export interface FileMeta {
  name: string;
  size: number;
  type: string;
  /** Object URL for images; never persisted. */
  previewUrl?: string;
}

export interface EditionGroup {
  id: string;
  name: string;
  /** Discount when every edition in the group is booked together. */
  bundleDiscountPct: number;
}

export interface Edition {
  id: string;
  name: string;
  groupId: string;
  /** Multiplier applied to the newspaper's base rate card. */
  weight: number;
}

export interface RateCard {
  /** Classified text (ROL) rate per line for a weight-1.0 edition, in INR. */
  textPerLine: number;
  textMinLines: number;
  charsPerLine: number;
  /** Whether extra text beyond the minimum is billed per line or per character. */
  incremental: "line" | "char";
  classifiedDisplayPerCm2: number;
  commercialDisplayPerCm2: number;
  minDisplayCm2: number;
  colWidthCm: number;
  colorPremiumPct: number;
}

export interface CutoffRule {
  /** Days before the release date the booking closes. */
  daysBefore: number;
  /** 24h local time, "HH:mm". */
  time: string;
}

export interface Newspaper {
  id: string;
  name: string;
  nameMl: string;
  tagline: string;
  taglineMl: string;
  language: string;
  scope: "national" | "regional";
  readership: string;
  groups: EditionGroup[];
  editions: Edition[];
  rates: RateCard;
  cutoffs: Record<AdType, CutoffRule>;
}

export interface DocRequirement {
  id: string;
  label: string;
  hint: string;
  required: boolean;
}

export interface Category {
  id: CategoryId;
  name: string;
  nameMl: string;
  /** Short bilingual sub-label shown on cards. */
  badge?: { en: string; ml: string };
  icon: string;
  description: string;
  descriptionMl: string;
  rateMultiplier: number;
  documents: DocRequirement[];
}

export interface Template {
  id: string;
  categoryId: CategoryId;
  title: string;
  titleMl: string;
  description: string;
  descriptionMl: string;
  body: string;
}

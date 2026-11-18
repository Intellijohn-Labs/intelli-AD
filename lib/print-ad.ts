/** Print-Ready Ad Generator: shared types for the AI copy and the canvas templates. */

export const PRINT_CATEGORIES = [
  { id: "obituary", label: "Obituary" },
  { id: "recruitment", label: "Recruitment" },
  { id: "real-estate", label: "Real estate" },
  { id: "business", label: "Business" },
  { id: "matrimonial", label: "Matrimonial" },
  { id: "tender", label: "Tender" },
] as const;
export type PrintCategory = (typeof PRINT_CATEGORIES)[number]["id"];

export interface PrintAdCopy {
  topBadge: string;
  headline: string;
  subheadline: string;
  bulletPoints: string[];
  bodyParagraph: string;
  footerBox: string;
}

export const EMPTY_COPY: PrintAdCopy = { topBadge: "", headline: "", subheadline: "", bulletPoints: [], bodyParagraph: "", footerBox: "" };

export type PrintTemplateId = "reverse" | "double" | "memorial";
export const PRINT_TEMPLATES: { id: PrintTemplateId; label: string; note: string }[] = [
  { id: "reverse", label: "Reverse Header Classic", note: "Black header strip, bullets, boxed contact" },
  { id: "double", label: "Double-Rule Newspaper Box", note: "Double border, centred serif headline" },
  { id: "memorial", label: "Obituary Memorial Frame", note: "Portrait, frame and funeral footer" },
];
export type MemorialFrame = "traditional" | "christian" | "minimal";
export type PhotoShape = "circle" | "rect";

/** Map the booking category id to the generator's category. */
export function printCategoryFor(id?: string | null): PrintCategory {
  if (id === "obituary" || id === "remembrance") return "obituary";
  if (id === "property") return "real-estate";
  if (id === "recruitment" || id === "tender" || id === "matrimonial" || id === "business") return id;
  return "business";
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[*_`#]/g, "").trim().slice(0, max) : "");

/** Coerces whatever the model returned into a clean PrintAdCopy. */
export function normalizeCopy(raw: unknown): PrintAdCopy {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bullets = Array.isArray(o.bulletPoints) ? o.bulletPoints.map((b) => str(b, 140).replace(/^[-•▪■✔\s]+/, "")).filter(Boolean).slice(0, 10) : [];
  return {
    topBadge: str(o.topBadge, 60),
    headline: str(o.headline, 120),
    subheadline: str(o.subheadline, 160),
    bulletPoints: bullets,
    bodyParagraph: str(o.bodyParagraph, 900),
    footerBox: str(o.footerBox, 400),
  };
}

/** Everything the generator dialog remembers between openings (never includes the exported creative). */
export interface PrintAdSession {
  category: PrintCategory;
  language: "ml" | "en";
  details: string;
  copy: PrintAdCopy;
  template: PrintTemplateId;
  frame: MemorialFrame;
  shape: PhotoShape;
  /** The user's ORIGINAL portrait as a downscaled data URL. undefined = not chosen yet, null = removed on purpose. */
  originalPortraitDataUrl?: string | null;
}

/** File names produced by the generator / poster designer: finished creatives, never a portrait. */
export const isExportedCreative = (name?: string | null) => !!name && /^(print-ad-|obituary-poster-)/.test(name);

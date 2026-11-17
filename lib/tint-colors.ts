/** Newsprint-safe pastel background tints (10–18% screens) a classified text ad can be printed on. */
export const TINT_COLORS = [
  { id: "cream", label: "Light Yellow / Cream", hex: "#FEF9C3", use: "Jobs, Property & Business" },
  { id: "pink", label: "Light Pink / Peach", hex: "#FCE7F3", use: "Matrimonial" },
  { id: "sky", label: "Light Sky Blue", hex: "#E0F2FE", use: "Education, Travel & Automobile" },
  { id: "grey", label: "Light Grey / Ash", hex: "#F1F5F9", use: "B/W-safe subtle shading" },
  { id: "mint", label: "Light Mint Green", hex: "#DCFCE7", use: "Health, Ayurveda & Real Estate" },
] as const;

export type TintId = (typeof TINT_COLORS)[number]["id"];
export const TINT_IDS = TINT_COLORS.map((c) => c.id) as [TintId, ...TintId[]];
export const DEFAULT_TINT: TintId = "cream";
export const tintOf = (id?: string | null) => TINT_COLORS.find((c) => c.id === id) ?? TINT_COLORS[0];

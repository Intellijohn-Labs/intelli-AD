/**
 * Selection-card states. The old per-category pastel tints (with coloured glows) are gone:
 * every choice is a plain paper card with an ink border, inverted to a heavier rule when chosen.
 */
export interface Tint {
  base: string;
  on: string;
}

const FLAT: Tint = {
  base: "border-zinc-300 bg-[#fffdf9] text-[#111111] hover:border-[#111111] dark:border-[#1F2F57] dark:bg-[#132247] dark:text-[#FFFFFF] dark:hover:border-[#FFFFFF]",
  on: "border-[#111111] bg-[#f3efe6] ring-1 ring-[#111111] dark:border-[#FFFFFF] dark:bg-[#17284F] dark:ring-[#FFFFFF]",
};

// Same shape as before so callers can still index by id.
const flat = new Proxy({} as Record<string, Tint>, { get: () => FLAT });
export const AD_TYPE_TINT = flat;
export const CATEGORY_TINT = flat;

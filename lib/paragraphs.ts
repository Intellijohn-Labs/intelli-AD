export type ParagraphSpacing = "tight" | "normal" | "double";

export const SPACING_OPTIONS: { id: ParagraphSpacing; label: string; hint: string }[] = [
  { id: "tight", label: "Tight", hint: "No blank line between paragraphs" },
  { id: "normal", label: "Normal", hint: "Paragraphs exactly as typed" },
  { id: "double", label: "Double-spaced", hint: "One blank line between every paragraph" },
];

/**
 * The text as it is set in print for a given paragraph spacing. Tight removes blank lines, double puts exactly one
 * blank line between paragraphs, normal keeps what was typed. Blank lines are billed lines, so the quote uses this too.
 */
export function applySpacing(text: string, spacing: ParagraphSpacing = "normal"): string {
  if (spacing === "normal") return text;
  const paras = text.replace(/\s+$/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  return paras.join(spacing === "double" ? "\n\n" : "\n");
}

/** Paragraphs for rendering: split on line breaks, keeping blank lines as spacers. */
export const splitParagraphs = (text: string) => text.replace(/\s+$/g, "").split("\n");

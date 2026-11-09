import { z } from "zod";
import { getCategory } from "@/data/categories";
import { isBookable } from "./cutoff";
import type { BookingState } from "./booking-store";

const fileMeta = z.object({ name: z.string(), size: z.number(), type: z.string(), previewUrl: z.string().optional(), url: z.string().optional() });

export const PLACEHOLDER_RE = /\[[^\]]+\]/;
export const MAX_TEXT_CHARS = 600;
export const MIN_TEXT_CHARS = 15;

/** mode: "std" = classic flows; "builder"/"upload" = the two display paths for obituary, remembrance and tender. */
export function composeSchema(adType: BookingState["adType"], requiredDocIds: string[], mode: "std" | "builder" | "upload" = "std") {
  return z
    .object({
      text: z.string(),
      columns: z.number({ error: "Choose the number of columns" }),
      widthCm: z.number({ error: "Enter a width in cm" }),
      heightCm: z.number({ error: "Enter a height in cm" }),
      colorMode: z.enum(["bw", "color"]),
      enhancements: z.object({ bold: z.boolean(), border: z.boolean(), tint: z.boolean() }),
      artwork: fileMeta.nullable(),
      documents: z.record(z.string(), fileMeta),
    })
    .superRefine((v, ctx) => {
      if (adType === "classified-text") {
        const t = v.text.trim();
        if (t.length < MIN_TEXT_CHARS)
          ctx.addIssue({ code: "custom", path: ["text"], message: "Write at least 15 characters." });
        else if (t.length > MAX_TEXT_CHARS)
          ctx.addIssue({ code: "custom", path: ["text"], message: "Keep the ad under 600 characters." });
        else if (PLACEHOLDER_RE.test(t))
          ctx.addIssue({ code: "custom", path: ["text"], message: "Replace the [BRACKETED] placeholders with your details." });
      } else {
        if (mode === "builder") {
          const t = v.text.trim();
          if (t.length < MIN_TEXT_CHARS)
            ctx.addIssue({ code: "custom", path: ["text"], message: "Fill in the notice details first." });
          else if (PLACEHOLDER_RE.test(t))
            ctx.addIssue({ code: "custom", path: ["text"], message: "Replace the [BRACKETED] placeholders with your details." });
        } else if (mode === "std") {
          // Classic display ads: artwork, or a written ad that is set in the box when there is no artwork.
          const t = v.text.trim();
          if (!v.artwork) {
            if (t.length < MIN_TEXT_CHARS) ctx.addIssue({ code: "custom", path: ["artwork"], message: "Upload your artwork (PDF, JPG or PNG) or write the ad text above." });
            else if (PLACEHOLDER_RE.test(t)) ctx.addIssue({ code: "custom", path: ["text"], message: "Replace the [BRACKETED] placeholders with your details." });
          }
        } else if (!v.artwork) {
          ctx.addIssue({ code: "custom", path: ["artwork"], message: mode === "upload" ? "Upload your print-ready creative (PDF, TIFF or JPG)." : "Upload your artwork (PDF, JPG or PNG)." });
        }
        if (!(v.heightCm >= 3 && v.heightCm <= 60))
          ctx.addIssue({ code: "custom", path: ["heightCm"], message: "Height must be between 3 and 60 cm." });
        if (!(v.widthCm >= 3 && v.widthCm <= 40))
          ctx.addIssue({ code: "custom", path: ["widthCm"], message: "Width must be between 3 and 40 cm." });
      }
      for (const id of requiredDocIds) {
        if (!v.documents[id])
          ctx.addIssue({ code: "custom", path: ["documents", id], message: "This document is required." });
      }
    });
}

export type ComposeValues = {
  text: string;
  columns: number;
  widthCm: number;
  heightCm: number;
  colorMode: "bw" | "color";
  enhancements: { bold: boolean; border: boolean; tint: boolean };
  artwork: z.infer<typeof fileMeta> | null;
  documents: Record<string, z.infer<typeof fileMeta>>;
};

export function requiredDocIds(categoryId: BookingState["categoryId"]) {
  return (getCategory(categoryId)?.documents ?? []).filter((d) => d.required).map((d) => d.id);
}

export function validateStep1(s: BookingState): string | null {
  if (!s.categoryId) return "Choose an ad category.";
  const total = Object.values(s.selection).reduce((a, ids) => a + ids.length, 0);
  if (total === 0) return "Select at least one publication edition.";
  return null;
}

export function validateStep3(s: BookingState, now: Date): string | null {
  if (!s.releaseDate) return "Pick a release date.";
  if (!isBookable(s.releaseDate, Object.keys(s.selection).filter((k) => s.selection[k].length), s.adType, now))
    return "The cut-off for that date has passed for one of your publications.";
  return null;
}

export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.email("Enter a valid email address"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  company: z.string().trim().optional(),
  gstin: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase()), "Enter a valid 15-character GSTIN")
    .optional(),
  address: z.string().trim().min(8, "Enter your billing address"),
  paymentMethod: z.enum(["upi", "card", "netbanking"]),
  terms: z.literal(true, { error: "Please accept the terms to continue" }),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;

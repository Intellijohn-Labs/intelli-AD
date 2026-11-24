/** Company templates (admin-uploaded invitation / greeting designs): shared types, validation and filename helpers (safe for the browser). */
export const TEMPLATE_BUCKET = "company-templates";
export const TEMPLATE_KINDS = [{ id: "invitation", label: "Invitation" }, { id: "greeting", label: "Greeting" }] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number]["id"];
export const TEMPLATE_CATEGORIES = [
  { id: "wedding", label: "Wedding" }, { id: "birthday", label: "Birthday" }, { id: "housewarming", label: "Housewarming" }, { id: "baby", label: "Baby & Kids" },
  { id: "events", label: "Events" }, { id: "inauguration", label: "Inauguration" }, { id: "festival", label: "Festival" }, { id: "custom", label: "Custom" },
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["id"];
export type TemplateMedia = "image" | "video";

export interface CustomTemplate {
  id: string; title: string; description: string; kind: TemplateKind; category: TemplateCategory; media_type: TemplateMedia; media_url: string;
  default_greeting_format: string; is_active: boolean; created_at: string;
}
/** What the public listing returns (no storage internals). */
export type PublicTemplate = Omit<CustomTemplate, "is_active">;

export const MEDIA_TYPES: Record<string, { media: TemplateMedia; ext: string }> = {
  "image/png": { media: "image", ext: "png" }, "image/jpeg": { media: "image", ext: "jpg" }, "image/webp": { media: "image", ext: "webp" },
  "video/mp4": { media: "video", ext: "mp4" }, "video/quicktime": { media: "video", ext: "mov" },
};
export const MAX_TEMPLATE_BYTES = 16 * 1024 * 1024;
export const TEMPLATE_ACCEPT = "image/png,image/jpeg,image/webp,video/mp4,video/quicktime,.mov";

/** Browsers sometimes leave `type` empty for .mov: fall back to the extension. */
export function mediaTypeOf(f: { name: string; type: string }): string {
  if (MEDIA_TYPES[f.type]) return f.type;
  const e = f.name.toLowerCase().split(".").pop();
  return e === "mov" ? "video/quicktime" : e === "mp4" ? "video/mp4" : e === "png" ? "image/png" : e === "webp" ? "image/webp" : e === "jpg" || e === "jpeg" ? "image/jpeg" : f.type;
}

/** `royal_gold_wedding.jpg` -> `Royal Gold Wedding`. */
export function titleFromFilename(name: string): string {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return base.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).slice(0, 80) || "Untitled Template";
}

export const isCategory = (v: unknown): v is TemplateCategory => TEMPLATE_CATEGORIES.some((c) => c.id === v);

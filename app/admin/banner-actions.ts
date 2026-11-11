"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  image_url: string;
  storage_path: string;
  placement: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
export type BannerResult = { ok: boolean; message: string; banners?: Banner[] };

const BUCKET = "promo-banners";
const NO_KEY = "SUPABASE_SERVICE_ROLE_KEY isn't set on the server, so banners can't be managed yet.";

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return (data.user?.app_metadata as { role?: string } | undefined)?.role === "admin" ? data.user : null;
}

async function all(admin: NonNullable<ReturnType<typeof createAdminClient>>): Promise<Banner[]> {
  const { data } = await admin.from("promotional_banners").select("*").order("sort_order").order("created_at", { ascending: false });
  return (data ?? []) as Banner[];
}

/** Every banner, active or not (admin only). */
export async function listBanners(): Promise<Banner[] | null> {
  if (!(await requireAdmin())) return null;
  const admin = createAdminClient();
  return admin ? all(admin) : null;
}

const optionalUrl = z.string().trim().max(500).optional().transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\//i.test(v) || v.startsWith("/"), "Target URL must start with http(s):// or /");

const createSchema = z.object({
  title: z.string().trim().min(2, "Enter a title.").max(120),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
  linkUrl: optionalUrl,
  isActive: z.boolean(),
  storagePath: z.string().regex(/^login\/[0-9a-f-]{36}\.(jpg|png|webp)$/, "Invalid image path."),
});

/** Saves the DB record for an image the admin's browser already uploaded to the promo-banners bucket. */
export async function createBanner(input: unknown): Promise<BannerResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Not authorised." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: NO_KEY };
  const p = createSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { title, description, linkUrl, isActive, storagePath } = p.data;
  const image_url = admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const rows = await all(admin);
  const { error } = await admin.from("promotional_banners").insert({
    title, description, link_url: linkUrl, image_url, storage_path: storagePath, placement: "login_page", is_active: isActive,
    sort_order: rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/banners");
  return { ok: true, message: "Banner added.", banners: await all(admin) };
}

export async function setBannerActive(id: unknown, active: unknown): Promise<BannerResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Not authorised." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: NO_KEY };
  const parsed = z.object({ id: z.uuid(), active: z.boolean() }).safeParse({ id, active });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { error } = await admin.from("promotional_banners").update({ is_active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: parsed.data.active ? "Banner is live." : "Banner hidden.", banners: await all(admin) };
}

/** Moves a banner one place earlier or later in the carousel. */
export async function moveBanner(id: unknown, direction: unknown): Promise<BannerResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Not authorised." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: NO_KEY };
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse({ id, direction });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const rows = await all(admin);
  const i = rows.findIndex((r) => r.id === parsed.data.id);
  const j = parsed.data.direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true, message: "Already there.", banners: rows };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  for (let n = 0; n < rows.length; n++) {
    if (rows[n].sort_order !== n) {
      const { error } = await admin.from("promotional_banners").update({ sort_order: n }).eq("id", rows[n].id);
      if (error) return { ok: false, message: error.message };
    }
  }
  return { ok: true, message: "Order updated.", banners: await all(admin) };
}

/** Deletes the record and its image in storage. */
export async function deleteBanner(id: unknown): Promise<BannerResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Not authorised." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: NO_KEY };
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { data: row } = await admin.from("promotional_banners").select("storage_path").eq("id", parsed.data).maybeSingle();
  const { error } = await admin.from("promotional_banners").delete().eq("id", parsed.data);
  if (error) return { ok: false, message: error.message };
  if (row?.storage_path) await admin.storage.from(BUCKET).remove([row.storage_path as string]);
  return { ok: true, message: "Banner deleted.", banners: await all(admin) };
}

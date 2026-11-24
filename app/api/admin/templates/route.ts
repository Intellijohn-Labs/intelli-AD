import { NextResponse } from "next/server";
import { z } from "zod";
import { MEDIA_TYPES, TEMPLATE_BUCKET, TEMPLATE_CATEGORIES, TEMPLATE_KINDS, type CustomTemplate } from "@/lib/custom-templates";
import { adminGate, NO_STORE, SETUP_HINT } from "@/lib/custom-templates-server";

export const dynamic = "force-dynamic";
const COLS = "id, title, description, kind, category, media_type, media_url, default_greeting_format, is_active, created_at";
const kind = z.enum(TEMPLATE_KINDS.map((k) => k.id) as [string, ...string[]]);
const category = z.enum(TEMPLATE_CATEGORIES.map((c) => c.id) as [string, ...string[]]);
const PATH = /^templates\/[0-9a-f-]{36}\.(png|jpg|webp|mp4|mov)$/;

const createBody = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(80),
  description: z.string().trim().max(200).default(""),
  kind, category,
  greetingFormat: z.string().trim().max(120).default(""),
  path: z.string().regex(PATH, "Bad file path."),
});
const patchBody = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(), title: z.string().trim().min(1).max(80).optional(), description: z.string().trim().max(200).optional(),
  category: category.optional(), default_greeting_format: z.string().trim().max(120).optional(),
}).refine((v) => Object.keys(v).length > 1, "Nothing to change.");
const deleteBody = z.object({ id: z.string().uuid() });
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE });

/** Admin only: every company template, hidden ones included. */
export async function GET(req: Request) {
  const g = await adminGate(req);
  if ("error" in g) return g.error;
  const { data, error } = await g.admin.from("custom_templates").select(COLS).order("created_at", { ascending: false }).limit(1000);
  if (error) { console.error("[admin/templates] list:", error.message); return NextResponse.json({ templates: [], setup: true, error: `Couldn't read templates. ${SETUP_HINT}` }, { headers: NO_STORE }); }
  return NextResponse.json({ templates: (data ?? []) as CustomTemplate[] }, { headers: NO_STORE });
}

/** Admin only: records a template whose file was just uploaded through /upload-url. */
export async function POST(req: Request) {
  const g = await adminGate(req);
  if ("error" in g) return g.error;
  const parsed = createBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  const b = parsed.data, ext = b.path.split(".").pop()!;
  const media = Object.values(MEDIA_TYPES).find((m) => m.ext === ext)!.media;
  if (media === "video" && b.kind !== "greeting") return fail(400, "Videos can only be Greeting templates.");
  const ex = await g.admin.storage.from(TEMPLATE_BUCKET).exists(b.path);
  if (ex.error || !ex.data) return fail(400, "The file wasn't uploaded. Try again.");
  const media_url = g.admin.storage.from(TEMPLATE_BUCKET).getPublicUrl(b.path).data.publicUrl;
  const { data, error } = await g.admin.from("custom_templates").insert({ title: b.title, description: b.description, kind: b.kind, category: b.category, media_type: media, media_url, storage_path: b.path, default_greeting_format: b.greetingFormat }).select(COLS).single();
  if (error) {
    console.error("[admin/templates] insert:", error.message);
    await g.admin.storage.from(TEMPLATE_BUCKET).remove([b.path]);
    return fail(500, `Couldn't save the template. ${SETUP_HINT}`);
  }
  return NextResponse.json({ template: data as CustomTemplate }, { status: 201, headers: NO_STORE });
}

/** Admin only: show / hide, rename, recategorise. */
export async function PATCH(req: Request) {
  const g = await adminGate(req);
  if ("error" in g) return g.error;
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  const { id, ...patch } = parsed.data;
  const { data, error } = await g.admin.from("custom_templates").update(patch).eq("id", id).select(COLS).maybeSingle();
  if (error) { console.error("[admin/templates] update:", error.message); return fail(500, "Couldn't save the change."); }
  if (!data) return fail(404, "That template no longer exists.");
  return NextResponse.json({ template: data as CustomTemplate }, { headers: NO_STORE });
}

/** Admin only: deletes the row and its storage file. */
export async function DELETE(req: Request) {
  const g = await adminGate(req);
  if ("error" in g) return g.error;
  const parsed = deleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Invalid request.");
  const { data: row, error: re } = await g.admin.from("custom_templates").select("storage_path").eq("id", parsed.data.id).maybeSingle();
  if (re) return fail(500, "Couldn't delete the template.");
  if (!row) return NextResponse.json({ ok: true }, { headers: NO_STORE });
  const rm = await g.admin.storage.from(TEMPLATE_BUCKET).remove([(row as { storage_path: string }).storage_path]);
  if (rm.error) console.error("[admin/templates] storage cleanup:", rm.error.message);
  const { error } = await g.admin.from("custom_templates").delete().eq("id", parsed.data.id);
  if (error) return fail(500, "Couldn't delete the template.");
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

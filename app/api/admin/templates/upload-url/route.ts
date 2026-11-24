import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_TEMPLATE_BYTES, MEDIA_TYPES, TEMPLATE_BUCKET } from "@/lib/custom-templates";
import { adminGate, NO_STORE } from "@/lib/custom-templates-server";

export const dynamic = "force-dynamic";
const body = z.object({ contentType: z.string().refine((t) => t in MEDIA_TYPES, "Use PNG, JPG, WEBP, MP4 or MOV."), size: z.number().int().positive().max(MAX_TEMPLATE_BYTES, "Files can be up to 16 MB.") });

/** Admin only: a one-time signed upload URL for a fresh path (files are bigger than the request body the host allows, so the browser uploads straight to Storage). */
export async function POST(req: Request) {
  const g = await adminGate(req);
  if ("error" in g) return g.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400, headers: NO_STORE });
  const path = `templates/${crypto.randomUUID()}.${MEDIA_TYPES[parsed.data.contentType].ext}`;
  const { data, error } = await g.admin.storage.from(TEMPLATE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[admin/templates/upload-url]", error?.message);
    return NextResponse.json({ error: "Couldn't prepare the upload. Run supabase/custom_templates.sql (it creates the company-templates bucket)." }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({ path, token: data.token }, { headers: NO_STORE });
}

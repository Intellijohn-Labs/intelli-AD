import { NextResponse } from "next/server";
import { z } from "zod";
import { TEMPLATES } from "@/lib/wedding";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdminUser } from "@/lib/supabase/session";

const IDS = new Set(TEMPLATES.map((t) => t.id));
const body = z.object({
  templateId: z.string().refine((id) => IDS.has(id), "Unknown template."),
  enabled: z.boolean().optional(),
  deleted: z.boolean().optional(),
}).refine((v) => v.enabled !== undefined || v.deleted !== undefined, "Nothing to change.");

/** Admin only: enable / disable a template, or soft-delete / restore it. */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in as an admin." }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." }, { status: 503 });

  const { templateId, enabled, deleted } = parsed.data;
  const { error } = await admin.from("invitation_template_settings").upsert(
    { template_id: templateId, ...(enabled !== undefined ? { enabled } : {}), ...(deleted !== undefined ? { deleted } : {}), updated_at: new Date().toISOString() },
    { onConflict: "template_id" },
  );
  if (error) {
    console.error("[admin/invitations/templates]", error.message);
    return NextResponse.json({ error: "Couldn't save. Run the invitation_template_settings SQL from supabase/schema.sql." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, templateId, ...(enabled !== undefined ? { enabled } : {}), ...(deleted !== undefined ? { deleted } : {}) });
}

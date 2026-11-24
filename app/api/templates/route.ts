import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicTemplate } from "@/lib/custom-templates";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** Public: the active company templates for the client studio. Never fails the studio: a missing table / key just returns an empty list. */
export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ templates: [] satisfies PublicTemplate[] }, { headers: NO_STORE });
  const { data, error } = await admin.from("custom_templates")
    .select("id, title, description, kind, category, media_type, media_url, default_greeting_format, created_at")
    .eq("is_active", true).order("created_at", { ascending: false }).limit(500);
  if (error) {
    console.error("[templates] read failed:", error.message);
    return NextResponse.json({ templates: [] satisfies PublicTemplate[] }, { headers: NO_STORE });
  }
  return NextResponse.json({ templates: (data ?? []) as PublicTemplate[] }, { headers: NO_STORE });
}

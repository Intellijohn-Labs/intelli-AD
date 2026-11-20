import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TemplateStatuses {
  /** Template ids the admin switched off. */
  disabled: string[];
  /** Template ids the admin removed (soft delete, restorable). */
  deleted: string[];
  /** False when the service key or the invitation_template_settings table is missing (every template then shows). */
  available: boolean;
}

const NONE: TemplateStatuses = { disabled: [], deleted: [], available: false };

/** Reads the admin's enable / delete choices. Never throws: the studio must keep working with every template on. */
export async function getTemplateStatuses(): Promise<TemplateStatuses> {
  const admin = createAdminClient();
  if (!admin) return NONE;
  const { data, error } = await admin.from("invitation_template_settings").select("template_id, enabled, deleted");
  if (error) {
    console.error("[invitation-templates] status read failed:", error.message);
    return NONE;
  }
  const rows = (data ?? []) as { template_id: string; enabled: boolean; deleted: boolean }[];
  return { disabled: rows.filter((r) => !r.enabled).map((r) => r.template_id), deleted: rows.filter((r) => r.deleted).map((r) => r.template_id), available: true };
}

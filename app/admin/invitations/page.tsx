import type { Metadata } from "next";
import { TemplateManager } from "@/components/admin/template-manager";
import { getTemplateStatuses } from "@/lib/invitation-template-status";

export const metadata: Metadata = { title: "Invitation Templates" };
export const dynamic = "force-dynamic";

export default async function InvitationTemplatesPage() {
  const s = await getTemplateStatuses();
  return <TemplateManager initialDisabled={s.disabled} initialDeleted={s.deleted} available={s.available} />;
}

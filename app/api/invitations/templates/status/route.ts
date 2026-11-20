import { NextResponse } from "next/server";
import { getTemplateStatuses } from "@/lib/invitation-template-status";

export const dynamic = "force-dynamic";

/** Public: the studio asks which templates to hide. Only ids are returned. */
export async function GET() {
  const { disabled, deleted } = await getTemplateStatuses();
  return NextResponse.json({ disabled, deleted }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } });
}

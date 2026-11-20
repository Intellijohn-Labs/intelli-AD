import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

const digest = (v: string) => createHash("sha256").update(v).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/** n8n proves itself with the shared secret (x-webhook-secret), or a service-role bearer token; both compared in constant time. */
function authorised(req: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const header = req.headers.get("x-webhook-secret");
  if (secret && header && same(header, secret)) return true;
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  return !!(service && bearer && same(bearer, service));
}

const one = z.object({
  id: z.string().uuid(),
  status: z.enum(["sent", "failed"]),
  providerResponse: z.unknown().optional(),
  errorMessage: z.string().trim().max(1000).optional(),
  sentAt: z.string().datetime({ offset: true }).optional(),
});
const body = z.union([one, z.object({ items: z.array(one).min(1).max(500) })]);

/**
 * Callback for the delivery worker: n8n reports each WhatsApp message as it completes.
 * POST { id, status: "sent" | "failed", providerResponse?, errorMessage?, sentAt? } or { items: [...up to 500] }.
 */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." }, { status: 503 });

  const items = "items" in parsed.data ? parsed.data.items : [parsed.data];
  const now = new Date().toISOString();
  let updated = 0;
  const missing: string[] = [];
  for (const it of items) {
    const patch: Record<string, unknown> = { status: it.status, updated_at: now };
    if (it.providerResponse !== undefined) patch.provider_response = it.providerResponse;
    if (it.status === "sent") { patch.sent_at = it.sentAt ?? now; patch.error_message = null; patch.error = null; }
    else { const msg = (it.errorMessage ?? "Delivery failed").slice(0, 500); patch.error_message = msg; patch.error = msg; }
    const { data, error } = await admin.from("invitation_dispatches").update(patch).eq("id", it.id).select("id");
    if (error) {
      console.error("[invitations/waau-status]", error.message);
      return NextResponse.json({ error: "Couldn't save the status. Run the invitation_dispatches SQL from supabase/schema.sql.", updated }, { status: 502 });
    }
    if (data?.length) updated++; else missing.push(it.id);
  }
  return NextResponse.json({ ok: true, updated, ...(missing.length ? { missing } : {}) }, { headers: { "Cache-Control": "no-store" } });
}

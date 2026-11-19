import { createClient } from "./supabase/client";
import { localInviteKey, newId, type CardEffect, type InvitePayload, type WeddingDetails } from "./wedding";

const BUCKET = "wedding-media";

async function upload(path: string, blob: Blob): Promise<string> {
  const sb = createClient();
  if (!sb) throw new Error("Storage is not configured.");
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || undefined, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Creates the shareable invitation. With Supabase it uploads the photos and video and stores one row guests can open from any
 * device; without it (or if anything fails) the invitation is kept in this browser only and the result says so.
 */
export async function publishInvitation(templateId: string, details: WeddingDetails, video: File | null, effect: CardEffect = "none"): Promise<{ id: string; local: boolean; videoUrl: string | null; note?: string }> {
  const sb = createClient();
  const localSave = (note?: string) => {
    const id = `local-${newId()}`;
    const payload: InvitePayload = { template_id: templateId, data: { details, videoUrl: null, effect } };
    try { localStorage.setItem(localInviteKey(id), JSON.stringify(payload)); } catch { /* storage full */ }
    return { id, local: true, videoUrl: null, note: note ?? "Supabase isn't configured, so this invitation opens only on this browser. Connect Supabase to let guests open it on their own phones." };
  };
  if (!sb) return localSave();
  try {
    const folder = `invites/${newId()}`;
    const photos: string[] = [];
    for (const [i, p] of details.photos.entries()) photos.push(await upload(`${folder}/photo-${i}.jpg`, await (await fetch(p)).blob()));
    let videoUrl: string | null = null;
    if (video) videoUrl = await upload(`${folder}/video.${video.type.includes("webm") ? "webm" : "mp4"}`, video);
    const id = newId();
    const { error } = await sb.from("wedding_invitations").insert({ id, template_id: templateId, data: { details: { ...details, photos }, videoUrl, effect } });
    if (error) throw new Error(error.message);
    return { id, local: false, videoUrl };
  } catch (e) {
    return localSave(`Couldn't save online (${e instanceof Error ? e.message : "error"}). Run the wedding tables SQL from supabase/schema.sql; until then the invitation opens only on this browser.`);
  }
}

export async function fetchInvitation(id: string): Promise<InvitePayload | null> {
  if (id.startsWith("local-")) {
    try { const r = localStorage.getItem(localInviteKey(id)); return r ? (JSON.parse(r) as InvitePayload) : null; } catch { return null; }
  }
  const sb = createClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_wedding_invitation", { p_id: id });
  if (error || !data) return null;
  return data as InvitePayload;
}

/** Best-effort record of a sent guest (needs the wedding_guests table and a signed-in owner; failures are ignored). */
export async function recordGuest(invitationId: string, g: { name: string; place: string; phone: string }) {
  if (invitationId.startsWith("local-")) return;
  try { await createClient()?.from("wedding_guests").insert({ invitation_id: invitationId, name: g.name, place: g.place, phone: g.phone, status: "sent", sent_at: new Date().toISOString() }); } catch { /* ignore */ }
}

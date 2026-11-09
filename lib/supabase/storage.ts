import { createClient, supabaseConfigured } from "./client";

export const ARTWORK_BUCKET = "ad-artworks";

const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/svg+xml": "svg", "image/tiff": "tiff", "application/pdf": "pdf" };

/** Uploads an ad artwork / photo to the public `ad-artworks` bucket and returns its public URL. */
export async function uploadArtwork(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { error: "Storage is not configured." };
  const ext = MIME_EXT[file.type] ?? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  // Random name: no customer file names or guessable paths in the public bucket.
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ARTWORK_BUCKET).upload(path, file, { contentType: file.type || undefined, cacheControl: "31536000", upsert: false });
  if (error) return { error: error.message };
  return { url: supabase.storage.from(ARTWORK_BUCKET).getPublicUrl(path).data.publicUrl };
}

export { supabaseConfigured };

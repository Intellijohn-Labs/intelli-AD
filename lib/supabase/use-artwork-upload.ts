"use client";

import { useCallback, useRef, useState } from "react";
import type { FileMeta } from "@/lib/types";
import { supabaseConfigured } from "./client";
import { uploadArtwork } from "./storage";

/**
 * Starts the Supabase upload for a just-picked file and calls `onChange` again with the public URL attached once it
 * finishes. A newer pick or `cancel()` (file removed) makes an older upload's result get ignored.
 */
export function useArtworkUpload(onChange: (f: FileMeta | null) => void) {
  const token = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const start = useCallback((file: File, meta: FileMeta) => {
    const mine = ++token.current;
    setError(undefined);
    if (!supabaseConfigured) return;
    setBusy(true);
    void uploadArtwork(file).then((r) => {
      if (mine !== token.current) return;
      setBusy(false);
      if (r.url) onChange({ ...meta, url: r.url });
      else setError(`Upload failed: ${r.error ?? "unknown error"}. Remove the file and try again.`);
    });
  }, [onChange]);

  const cancel = useCallback(() => { token.current++; setBusy(false); setError(undefined); }, []);
  return { start, cancel, busy, error };
}

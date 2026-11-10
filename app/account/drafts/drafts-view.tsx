"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { getAdType, getCategory } from "@/data/categories";
import { getNewspaper } from "@/data/newspapers";
import { useAuth } from "@/lib/auth";
import { deleteDraft, listDrafts, loadDraftIntoWizard, type Draft } from "@/lib/drafts";

export function DraftsView() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && user) setDrafts(listDrafts(user.identifier));
  }, [ready, user]);

  if (!ready || !user || drafts === null) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-zinc-500">Loading drafts…</div>;

  const resume = (d: Draft) => {
    if (loadDraftIntoWizard(d)) router.push("/book");
  };
  const remove = (d: Draft) => {
    deleteDraft(user.identifier, d.id);
    setDrafts(listDrafts(user.identifier));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-headline text-3xl font-black">Ad Drafts</h1>
      {drafts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-white/20">
          <p className="text-lg font-semibold">No saved drafts found</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Use “Save as draft” while booking to keep an ad for later.</p>
          <ButtonLink href="/book" className="mt-6">Start Booking</ButtonLink>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {drafts.map((d) => {
            const s = d.state;
            const papers = Object.keys(s.selection).filter((k) => s.selection[k]?.length).map((k) => getNewspaper(k)?.name).filter(Boolean).join(", ");
            const snippet = s.text.trim().replace(/\s+/g, " ");
            return (
              <li key={d.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/15 dark:bg-[#0F1D3D]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{papers || "No publication chosen yet"}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {getCategory(s.categoryId)?.name ?? "No category"} · {getAdType(s.adType).short}
                      {s.releaseDate ? ` · ${s.releaseDate}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">Saved {new Date(d.savedAt).toLocaleString()}</p>
                </div>
                <p className="mt-3 line-clamp-2 rounded bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
                  {snippet ? snippet.slice(0, 160) + (snippet.length > 160 ? "…" : "") : <em className="text-zinc-400">No ad text yet</em>}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => resume(d)}>Resume Booking</Button>
                  <button type="button" onClick={() => remove(d)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" /> Delete Draft
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

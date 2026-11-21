"use client";

import { Loader2, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchInvitation } from "@/lib/wedding-publish";
import { loadImage, renderWeddingCard } from "@/lib/wedding-render";
import { MotionCanvas } from "./motion-canvas";
import { warmPetals } from "@/lib/wedding-motion";
import { eventConfig, EVENT_TITLE, formatDate, getTemplate, mapsLink, type InvitePayload } from "@/lib/wedding";

/** What a guest sees at /invitation-cards/invite/[id]?guest=…: their personalised card, the photos, the video and the venue button. */
export function InviteView({ id }: { id: string }) {
  const sp = useSearchParams();
  const guest = sp.get("guest")?.slice(0, 80) || "";
  const addr = sp.get("addr")?.slice(0, 80) || "";
  const [inv, setInv] = useState<InvitePayload | null | undefined>(undefined);
  const [img, setImg] = useState("");

  useEffect(() => {
    let live = true;
    void fetchInvitation(id).then((r) => { if (live) setInv(r); });
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    if (!inv) return;
    let live = true;
    void (async () => {
      const photo = inv.data.details.photos[0] ? await loadImage(inv.data.details.photos[0]) : null;
      const photo2 = inv.data.details.photos[1] ? await loadImage(inv.data.details.photos[1]) : null;
      const c = await renderWeddingCard({ template: getTemplate(inv.template_id), details: inv.data.details, guest: guest ? { name: guest, place: addr } : null, photo, photo2, width: 1080 });
      if (live) setImg(c.toDataURL("image/png"));
    })();
    return () => { live = false; };
  }, [inv, guest, addr]);

  if (inv === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" aria-label="Loading invitation" /></div>;
  if (!inv) return <div className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-bold text-slate-900 dark:text-white">Invitation not found</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This link may be incomplete, or the invitation was saved only on the sender&apos;s browser. Please ask them to send it again.</p></div>;

  const d = inv.data.details;
  const map = mapsLink(d);
  const festival = eventConfig(d.eventType).group === "festival" ? getTemplate(inv.template_id).festival : undefined;
  const title = festival ? (d.customTitle.trim() ? { en: d.customTitle.trim(), ml: festival.title.ml } : festival.title) : EVENT_TITLE[d.eventType];
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <p className="kicker mb-2">{title.en}{title.ml && title.ml !== title.en ? ` · ${title.ml}` : ""}</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-white">{festival ? (guest ? `Dear ${guest}, a greeting for you` : "A greeting for you") : guest ? `Dear ${guest}, you are invited` : "You are invited"}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{(eventConfig(d.eventType).couple ? [d.groom, d.bride] : [d.groom]).filter(Boolean).join(" & ")}{d.date ? ` · ${formatDate(d.date, "en")}` : ""}</p>
      </div>
      <div className="mx-auto mt-6 max-w-xl space-y-5">
        <div onContextMenu={(e) => e.preventDefault()} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg select-none dark:border-slate-700 dark:bg-white/5" style={{ aspectRatio: "1080 / 1500" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img ? (inv.data.effect && inv.data.effect !== "none" ? <MotionCanvas src={img} effect={inv.data.effect} pal={getTemplate(inv.template_id).pal} warm={warmPetals(getTemplate(inv.template_id).motif)} /> : <img src={img} alt="Your invitation card" draggable={false} className="pointer-events-none h-full w-full object-cover select-none" />) : <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {map && <a href={map} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#D12014] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A91400]"><MapPin className="h-4 w-4" aria-hidden="true" /> Open in Google Maps</a>}

        </div>
        {inv.data.videoUrl && <video src={inv.data.videoUrl} controls controlsList="nodownload noplaybackrate" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} playsInline className="w-full rounded-xl bg-black" aria-label="Invitation video" />}
        {d.photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3">
            {d.photos.map((p, i) => (<li key={i} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p} alt={`Couple photo ${i + 1}`} draggable={false} onContextMenu={(e) => e.preventDefault()} className="pointer-events-none select-none h-full w-full object-cover" /></li>))}
          </ul>
        )}
        {(d.venue || d.time) && <p className="text-center text-sm text-slate-700 dark:text-slate-200">{d.time}{d.time && d.venue ? " · " : ""}{d.venue}</p>}
      </div>
    </div>
  );
}

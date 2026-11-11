"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Slide { id: string; title: string; image_url: string; link_url: string | null }

/** Home page strip under the navbar: active `home_top` banners scrolling right to left. Renders nothing when none are active. */
export function HomeTopBanner() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const sb = createClient();
        if (!sb) return;
        const { data, error } = await sb
          .from("promotional_banners")
          .select("id,title,image_url,link_url")
          .eq("placement", "home_top")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(12);
        if (live && !error && data?.length) setSlides(data as Slide[]);
      } catch { /* no banner strip */ }
    })();
    return () => { live = false; };
  }, []);

  if (!slides.length) return null;

  // Each group repeats the set so it is wider than any screen; two identical groups make the -50% loop seamless.
  const group = [...slides, ...slides, ...slides];
  const item = (s: Slide, key: string, hidden: boolean) => {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={s.image_url} alt={hidden ? "" : s.title || "Promotion"} draggable={false} className="h-full w-auto max-w-none rounded-xl object-cover object-center lg:rounded-2xl" />
    );
    return s.link_url ? (
      <a key={key} href={s.link_url} aria-hidden={hidden || undefined} tabIndex={hidden ? -1 : undefined} {...(/^https?:/i.test(s.link_url) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mr-4 block h-full shrink-0">{img}</a>
    ) : (
      <div key={key} aria-hidden={hidden || undefined} className="mr-4 h-full shrink-0">{img}</div>
    );
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-8">
      <div
        role="region"
        aria-label="Promotions"
        data-paused={paused}
        onPointerDown={(e) => { if (e.pointerType === "touch") setPaused((p) => !p); }} // tap to pause / resume on phones; hover pauses on desktop
        className="home-marquee h-[120px] w-full overflow-hidden rounded-xl shadow-sm sm:h-[160px] lg:h-[220px] lg:rounded-2xl"
      >
        <div className="home-marquee-track flex h-full w-max" style={{ ["--marquee-dur" as string]: `${slides.length * 3 * 9}s` }}>
          {[0, 1].map((g) => (
            <div key={g} className="flex h-full shrink-0" aria-hidden={g === 1 || undefined}>
              {group.map((s, i) => item(s, `${g}-${i}`, g === 1 || i >= slides.length))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

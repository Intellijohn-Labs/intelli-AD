"use client";

import { useEffect, useState } from "react";
import { PROMO_SLIDES, type PromoSlide } from "@/data/login-slides";
import { createClient } from "@/lib/supabase/client";
import { PromoSlider } from "./promo-slider";

/** Login-page carousel: active `login_page` banners from the admin portal, or the built-in slides when there are none. */
export function LoginPromo() {
  const [slides, setSlides] = useState<PromoSlide[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const sb = createClient();
        if (!sb) return live && setSlides(PROMO_SLIDES);
        const { data, error } = await sb
          .from("promotional_banners")
          .select("id,title,description,link_url,image_url")
          .eq("placement", "login_page")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(12);
        if (!live) return;
        if (error || !data?.length) return setSlides(PROMO_SLIDES);
        setSlides(data.map((b) => ({ id: b.id, title: b.title, description: b.description ?? "", imageUrl: b.image_url, linkUrl: b.link_url ?? undefined, gradient: "from-slate-800 to-slate-900", custom: true })));
      } catch {
        if (live) setSlides(PROMO_SLIDES);
      }
    })();
    return () => { live = false; };
  }, []);

  if (!slides) return <div aria-hidden="true" className="aspect-video w-full animate-pulse rounded-2xl bg-slate-200 lg:aspect-[4/5] lg:max-h-[640px] dark:bg-slate-800" />;
  return <PromoSlider slides={slides} />;
}

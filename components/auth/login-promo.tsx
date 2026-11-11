"use client";

import { useEffect, useState } from "react";
import type { PromoSlide } from "@/data/login-slides";
import { createClient } from "@/lib/supabase/client";
import { PromoSlider } from "./promo-slider";

/** Login-page carousel: only active `login_page` banners from the admin portal. With none, nothing is rendered at all. */
export function LoginPromo() {
  const [slides, setSlides] = useState<PromoSlide[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const sb = createClient();
        if (!sb) return live && setSlides([]);
        const { data, error } = await sb
          .from("promotional_banners")
          .select("id,title,description,link_url,image_url")
          .eq("placement", "login_page")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(12);
        if (!live) return;
        if (error || !data?.length) return setSlides([]);
        setSlides(data.map((b) => ({ id: b.id, title: b.title, description: b.description ?? "", imageUrl: b.image_url, linkUrl: b.link_url ?? undefined, gradient: "from-slate-800 to-slate-900", custom: true })));
      } catch {
        if (live) setSlides([]);
      }
    })();
    return () => { live = false; };
  }, []);

  // Loading, none active, or fetch failed: render nothing, so the sign-in card stays centred with no empty placeholder.
  if (!slides?.length) return null;
  return (
    <div className="w-full max-w-md lg:max-w-none lg:flex-1">
      <PromoSlider slides={slides} />
    </div>
  );
}

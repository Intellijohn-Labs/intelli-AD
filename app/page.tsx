import { EditorialLanding } from "@/components/home/editorial-landing";
import { HomeTopBanner } from "@/components/home/home-top-banner";
import { MediaHub } from "@/components/home/media-hub";

/** Home: promo strip, the media picker, then the editorial hero, the papers on the desk and the three-step workflow. */
export default function HomePage() {
  return (
    <div className="relative -mb-20 overflow-hidden bg-[#F3F3F4] pb-20 dark:bg-[#0A0B0D]">
      <HomeTopBanner />
      <MediaHub />
      <EditorialLanding />
    </div>
  );
}

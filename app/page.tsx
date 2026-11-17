import { EditorialLanding } from "@/components/home/editorial-landing";
import { HomeTopBanner } from "@/components/home/home-top-banner";
import { MediaHub } from "@/components/home/media-hub";

/** Home: editorial hero, the papers on the desk, the three-step workflow, then the wider media picker. */
export default function HomePage() {
  return (
    <div className="relative -mb-20 overflow-hidden bg-[#F2F5F4] pb-20 dark:bg-[#0B1215]">
      <HomeTopBanner />
      <EditorialLanding />
      <MediaHub />
    </div>
  );
}

import { HomeTopBanner } from "@/components/home/home-top-banner";
import { MediaHub } from "@/components/home/media-hub";

/**
 * Home: only the media picker, on a layered "architectural paper" backdrop: a soft tint, three faint
 * colour glows behind the cards and a micro dot-grid. The wrapper's bottom padding cancels the
 * footer's top margin so the backdrop runs right down to the wave crest.
 */
export default function HomePage() {
  return (
    <div className="relative -mb-20 overflow-hidden bg-[#F6F8FA] pb-20 dark:bg-[#0B132B]">
      {/* Ambient mesh: blue top-left, emerald top-right, rose at the foot */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.05), transparent 40%), radial-gradient(circle at 90% 15%, rgba(16, 185, 129, 0.05), transparent 40%), radial-gradient(circle at 50% 80%, rgba(244, 63, 94, 0.04), transparent 50%)",
        }}
      />
      {/* Print-style dot matrix */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-[0.06]" />
      <div className="relative">
        <HomeTopBanner />
        <MediaHub />
      </div>
    </div>
  );
}

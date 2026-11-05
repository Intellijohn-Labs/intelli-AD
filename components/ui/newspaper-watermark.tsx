import Image from "next/image";

/**
 * Full-viewport newspaper watermark: fixed behind all content, non-interactive.
 * Multiplied into the page in light mode, screen-blended (inverted) in dark mode,
 * with a light wash so foreground content stays readable.
 */
export function NewspaperWatermark() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Image
        src="/images/newspaper-rack.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="h-full w-full object-cover opacity-20 mix-blend-multiply grayscale contrast-125 dark:opacity-10 dark:mix-blend-screen dark:invert"
      />
      <div className="absolute inset-0 bg-white/50 dark:bg-[#0f172a]/85" />
    </div>
  );
}

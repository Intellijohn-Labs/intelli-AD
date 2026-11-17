import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The AI admanager logo (public/logo.png). Its artwork has its own near-black ground, so it sits cleanly on the obsidian header; a hairline ring defines the edge. */
export function BrandLogo({ className, size = 48, ring = true }: { className?: string; onDark?: boolean; size?: number; ring?: boolean }) {
  return (
    <Link href="/" aria-label="AI admanager home" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image src="/logo.png" alt="AI admanager" width={size} height={size} priority sizes={`${size}px`} className={cn("rounded-xl object-contain", ring && "ring-1 ring-white/15")} style={{ width: size, height: size }} />
    </Link>
  );
}

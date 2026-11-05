import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** IntelliAd logo: the supplied mark plus a live wordmark in the logo's greens. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/" aria-label="IntelliAd home" className={cn("flex items-center gap-2.5", className)}>
      <Image src="/images/intelliad-icon.png" alt="" width={600} height={540} priority className="h-10 w-auto" />
      <span className="text-2xl leading-none font-extrabold tracking-tight">
        <span className={onDark ? "text-emerald-200" : "text-emerald-900 dark:text-emerald-200"}>Intelli</span>
        <span className={onDark ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"}>Ad</span>
      </span>
    </Link>
  );
}

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** IntelliAd logo: black newspaper with a red quill, plus a live black wordmark. */
export function BrandLogo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link href="/" aria-label="IntelliAd home" className={cn("flex items-center gap-2.5", className)}>
      <Image src="/images/intelliad-icon.png" alt="" width={600} height={540} priority className={cn("h-9 w-auto", onDark && "h-10 rounded-lg bg-white p-1")} />
      <span className="font-[family-name:var(--font-syne)] text-xl leading-none font-black tracking-tight">
        <span className={onDark ? "text-white" : "text-slate-950 dark:text-white"}>IntelliAd</span>
      </span>
    </Link>
  );
}

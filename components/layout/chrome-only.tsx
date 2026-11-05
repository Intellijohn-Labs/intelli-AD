"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicPath } from "@/lib/auth";

/** Renders the site chrome (header, footer, watermarks) on every page except the login portal. */
export function ChromeOnly({ children }: { children: ReactNode }) {
  return isPublicPath(usePathname()) ? null : <>{children}</>;
}

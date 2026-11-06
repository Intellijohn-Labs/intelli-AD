"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicPath } from "@/lib/auth";

/** Renders the site chrome (header, footer) on every page except the login portal. */
export function ChromeOnly({ children }: { children: ReactNode }) {
  return isPublicPath(usePathname()) ? null : <>{children}</>;
}

/** Hides its children on the home page, which stays a clean media picker (no publication tabs). */
export function HideOnHome({ children }: { children: ReactNode }) {
  return usePathname() === "/" ? null : <>{children}</>;
}

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicPath } from "@/lib/auth";

/** True inside the admin portal, which has its own header and none of the customer-facing chrome. */
export const isAdminPath = (p: string) => p === "/admin" || p.startsWith("/admin/");

/** Renders the customer site chrome (header, masthead, footer) on every page except the login portal and the admin portal. */
export function ChromeOnly({ children }: { children: ReactNode }) {
  const p = usePathname();
  return isPublicPath(p) || isAdminPath(p) ? null : <>{children}</>;
}

/** Hides its children on the home page, which stays a clean media picker (no publication tabs). */
export function HideOnHome({ children }: { children: ReactNode }) {
  const p = usePathname();
  return p === "/" || p.startsWith("/agency") ? null : <>{children}</>; // also hidden in the partner portal
}

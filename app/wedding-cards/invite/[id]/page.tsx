import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteView } from "@/components/wedding/invite-view";

export const metadata: Metadata = { title: "Wedding invitation", robots: { index: false, follow: false } };

/** Public: guests open this from WhatsApp without signing in (see proxy.ts). */
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={null}><InviteView id={id} /></Suspense>;
}

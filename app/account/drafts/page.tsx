import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DraftsView } from "./drafts-view";

export const metadata: Metadata = { title: "Ad Drafts" };

export default async function DraftsPage() {
  // proxy.ts already bounces guests; this re-checks on the server (the demo cookie is dev-only and handled by the proxy).
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user && process.env.NODE_ENV === "production") redirect("/login?auth=required");
  }
  return <DraftsView />;
}

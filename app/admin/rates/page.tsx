import type { Metadata } from "next";
import { RateManager } from "@/components/admin/rate-manager";

export const metadata: Metadata = { title: "Rate Cards" };

export default function RatesPage() {
  return <RateManager />;
}

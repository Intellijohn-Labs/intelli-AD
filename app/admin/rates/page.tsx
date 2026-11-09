import type { Metadata } from "next";
import { NewspaperDirectory } from "@/components/admin/newspaper-directory";

export const metadata: Metadata = { title: "Newspapers & Rates" };

export default function RatesPage() {
  return <NewspaperDirectory />;
}

import type { Metadata } from "next";
import { WeddingStudio } from "@/components/wedding/wedding-studio";

export const metadata: Metadata = { title: "Wedding & Event Invitations" };

export default function WeddingCardsPage() {
  return <WeddingStudio />;
}

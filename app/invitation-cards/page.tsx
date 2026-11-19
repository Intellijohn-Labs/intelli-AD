import type { Metadata } from "next";
import { WeddingStudio } from "@/components/wedding/wedding-studio";

export const metadata: Metadata = { title: "Invitation Cards · ക്ഷണക്കത്തുകൾ", description: "Design wedding, birthday, housewarming and baby-ceremony invitation cards with 30+ luxury templates, then share personalised PNG or animated GIF cards on WhatsApp." };

export default function InvitationCardsPage() {
  return <WeddingStudio />;
}

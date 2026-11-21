import type { Metadata } from "next";
import { Suspense } from "react";
import { WeddingStudio } from "@/components/wedding/wedding-studio";

export const metadata: Metadata = { title: "Invitation or Greeting Cards · ക്ഷണക്കത്തും ആശംസാ കാർഡും", description: "Design wedding, housewarming, birthday and inauguration invitations or Onam, Vishu, Christmas, New Year, Eid and Diwali greetings, then send personalised cards on WhatsApp." };

export default function InvitationCardsPage() {
  return (
    <Suspense fallback={null}>
      <WeddingStudio />
    </Suspense>
  );
}

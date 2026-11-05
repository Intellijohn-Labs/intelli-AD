import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Bookings" };

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-headline text-3xl font-black">My Bookings</h1>
      <p className="mt-3 text-zinc-600">Your confirmed Release Orders will appear here. You haven&apos;t booked any ads yet.</p>
      <ButtonLink href="/book" className="mt-6">Book an ad</ButtonLink>
    </div>
  );
}

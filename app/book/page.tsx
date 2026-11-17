import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { buildInitialState } from "@/lib/booking-params";

export const metadata: Metadata = { title: "Book an ad" };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = buildInitialState(await searchParams);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="sr-only">Book a newspaper ad</h1>
      <BookingWizard initial={initial} />
    </div>
  );
}

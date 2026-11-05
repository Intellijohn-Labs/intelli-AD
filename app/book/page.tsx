import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { buildInitialState } from "@/lib/booking-params";
import { BookHeader } from "@/components/booking/book-header";

export const metadata: Metadata = { title: "Book an ad" };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = buildInitialState(await searchParams);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <BookHeader />
      <BookingWizard initial={initial} />
    </div>
  );
}

import type { Metadata } from "next";
import { ActiveRateCard } from "@/components/home/active-rate-card";
import { Hero } from "@/components/home/hero";
import { HowItWorks, PopularTemplates, Publications } from "@/components/home/sections";
import { ServicesHub } from "@/components/home/services-hub";

export const metadata: Metadata = { title: "Newspaper Advertising Hub" };

/** The newspaper booking portal: hero + quick booking, ad formats, live rates, publications and templates. */
export default function NewspaperPage() {
  return (
    <>
      <Hero />
      <ServicesHub />
      <ActiveRateCard />
      <Publications />
      <PopularTemplates />
      <HowItWorks />
    </>
  );
}

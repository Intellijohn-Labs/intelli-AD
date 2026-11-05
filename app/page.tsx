import { ActiveRateCard } from "@/components/home/active-rate-card";
import { Hero } from "@/components/home/hero";
import { HowItWorks, PopularTemplates, Publications } from "@/components/home/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ActiveRateCard />
      <Publications />
      <PopularTemplates />
      <HowItWorks />
    </>
  );
}

import type { Metadata } from "next";
import { AgencyDashboard } from "@/components/agency/agency-dashboard";

export const metadata: Metadata = { title: "Partner Dashboard" };

export default function AgencyDashboardPage() {
  return <AgencyDashboard />;
}

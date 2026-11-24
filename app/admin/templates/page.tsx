import type { Metadata } from "next";
import { CompanyTemplates } from "@/components/admin/company-templates";

export const metadata: Metadata = { title: "Company Templates" };
export const dynamic = "force-dynamic";

export default function CompanyTemplatesPage() {
  return <CompanyTemplates />;
}

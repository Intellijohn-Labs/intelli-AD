import type { Metadata } from "next";
import { listBanners } from "../banner-actions";
import { BannerManager } from "@/components/admin/banner-manager";

export const metadata: Metadata = { title: "Ad Banners" };

export default async function BannersPage() {
  return <BannerManager initial={(await listBanners()) ?? []} />;
}

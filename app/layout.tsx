import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ChromeOnly } from "@/components/layout/chrome-only";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NewspaperMastheadBar } from "@/components/layout/newspaper-masthead-bar";
import { NewspaperWatermark } from "@/components/ui/newspaper-watermark";
import { ManoramaWatermarkBg } from "@/components/ui/manorama-watermark-bg";
import { Providers } from "@/components/providers";
import { T } from "@/context/language-context";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IntelliAd | Smart Newspaper Ad Booking Across Kerala", template: "%s | IntelliAd" },
  description: "Compare rates, compose and preview classified and display ads, and book across Kerala's and India's leading dailies with an instant Release Order.",
};
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter for Latin + Noto Sans Malayalam for crisp Malayalam; system fonts are the fallback. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700;800;900&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Manjari:wght@400;700&family=Gayathri:wght@400;700&family=Noto+Serif+Malayalam:wght@600;700;800&family=Baloo+Chettan+2:wght@600;800&family=Anek+Malayalam:wght@500;800&family=Chilanka&family=Meera+Inimai&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">
        <ChromeOnly>
          <NewspaperWatermark />
          <ManoramaWatermarkBg />
        </ChromeOnly>
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
            <T k="Skip to content" />
          </a>
          <ChromeOnly>
            <Header />
            <NewspaperMastheadBar />
          </ChromeOnly>
          <main id="main">{children}</main>
          <ChromeOnly><Footer /></ChromeOnly>
        </Providers>
      </body>
    </html>
  );
}

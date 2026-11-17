import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { ChromeOnly, HideOnHome } from "@/components/layout/chrome-only";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NewspaperMastheadBar } from "@/components/layout/newspaper-masthead-bar";
import { Providers } from "@/components/providers";
import { THEME_INIT_SCRIPT } from "@/components/theme-provider";
import { SplashLoader } from "@/components/brand/splash-loader";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { T } from "@/context/language-context";
import { COMPANY } from "@/lib/company";
import "./globals.css";

/** Geometric sans for headings, the logo and prices; Inter (loaded below) for dense UI text. */
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AI admanager | Smart Newspaper Ad Booking Across Kerala", template: "%s | AI admanager" },
  applicationName: "AI admanager",
  icons: { icon: [{ url: "/logo.png", type: "image/png" }], apple: [{ url: "/logo.png" }] },
  openGraph: { siteName: "AI admanager", title: "AI admanager | Smart Newspaper Ad Booking Across Kerala", type: "website", locale: "en_IN", images: [{ url: "/logo.png", width: 768, height: 768, alt: "AI admanager" }] },
  publisher: COMPANY.tradeName,
  creator: COMPANY.tradeName,
  authors: [{ name: COMPANY.tradeName }],
  description: "Compare rates, compose and preview classified and display ads, and book across Kerala's and India's leading dailies with an instant Release Order.",
};
export const viewport: Viewport = {
  // Browser chrome follows the theme: soft paper in light mode, Deep Midnight Slate (not pure black) in dark.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F3F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0B0D" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter for Latin + Noto Sans Malayalam for crisp Malayalam; system fonts are the fallback. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Manjari:wght@400;700&family=Gayathri:wght@400;700&family=Noto+Serif+Malayalam:wght@600;700;800&family=Baloo+Chettan+2:wght@600;800&family=Anek+Malayalam:wght@500;800&family=Chilanka&family=Meera+Inimai&display=swap"
        />
      </head>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden antialiased">
        <SplashLoader />
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
            <T k="Skip to content" />
          </a>
          <ChromeOnly>
            <Header />
            <HideOnHome><NewspaperMastheadBar /></HideOnHome>
          </ChromeOnly>
          <main id="main">{children}</main>
          <ChromeOnly><Footer /></ChromeOnly>
          <WhatsAppWidget />
        </Providers>
      </body>
    </html>
  );
}

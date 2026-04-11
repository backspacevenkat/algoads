import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

// Google Ads conversion tag. This is a TRAINING SIGNAL for Google's ML —
// the ads themselves still point at YouTube videos via `finalUrl` (see
// src/lib/google-ads/demand-gen.ts). Installing the tag gives the bidder
// enough signal to exit the BIDDING_STRATEGY_LEARNING cold-start trap on
// Max Conversions campaigns. It does NOT change where the ads drive traffic.
const GOOGLE_ADS_TAG_ID = "AW-17993336067";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Algo Thinker — Documentaries on AI & Autonomous Systems",
    template: "%s — Algo Thinker",
  },
  description:
    "Long-form documentaries about AI, autonomous systems, and the engineering behind the technologies redefining modern life.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_TAG_ID}');
          `}
        </Script>
        <SiteHeader />
        <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10 sm:py-14">
          {children}
        </main>
      </body>
    </html>
  );
}

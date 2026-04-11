import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlgoAds — Retention-safe YouTube ad launcher",
  description:
    "Launch and monitor retention-safe Google Ads Demand Gen campaigns for your YouTube videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">
              AlgoAds
            </a>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="/" className="hover:text-foreground transition-colors">
                Dashboard
              </a>
              <a href="/launch" className="hover:text-foreground transition-colors">
                Launch
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

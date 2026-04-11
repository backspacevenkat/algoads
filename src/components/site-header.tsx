"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Youtube } from "lucide-react";

/**
 * Route-aware site header.
 *
 * On the marketing landing page (/) we show the public nav with YouTube CTA.
 * On admin pages (/campaigns, /launch, /campaigns/[id]) we show the
 * compact dashboard nav so the user can move between launch + list.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isAdmin =
    pathname.startsWith("/campaigns") || pathname.startsWith("/launch");

  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-base font-semibold tracking-tight"
        >
          <Image
            src="/logo-icon.png"
            alt=""
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-mono">algo_thinker</span>
        </Link>

        {isAdmin ? (
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/campaigns" className="hover:text-foreground transition-colors">
              Campaigns
            </Link>
            <Link href="/launch" className="hover:text-foreground transition-colors">
              Launch
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Site
            </Link>
          </nav>
        ) : (
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">
              About
            </a>
            <a href="#work" className="hover:text-foreground transition-colors">
              Work
            </a>
            <a href="#contact" className="hover:text-foreground transition-colors">
              Contact
            </a>
            <a
              href="https://www.youtube.com/@AlgoThinker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Youtube className="size-4" />
              YouTube
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}

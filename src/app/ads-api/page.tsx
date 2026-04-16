import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Megaphone,
  FileVideo,
  BarChart3,
  Lock,
  Database,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AlgoAds — Google Ads API Use Case",
  description:
    "AlgoAds is a campaign automation tool that uses the Google Ads API to create Demand Gen video campaigns for YouTube creators. This page documents our Google Ads API use case, data flow, and scope.",
};

export default function AdsApiPage() {
  return (
    <article className="prose prose-neutral max-w-none space-y-16 sm:space-y-20">
      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="pt-6 sm:pt-10">
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full border border-cyan-200 bg-cyan-50">
          <span className="size-1.5 rounded-full bg-cyan-500" />
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] uppercase text-cyan-700">
            Product · Google Ads API Use Case
          </span>
        </div>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight text-foreground">
          AlgoAds: a campaign automation tool for YouTube video promotion.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl leading-relaxed">
          AlgoAds uses the Google Ads API to create, monitor, and manage Demand
          Gen video campaigns on behalf of YouTube content creators — using the
          creator&apos;s own Google Ads account, their own budget, and their own
          ad creative. It is not a resale or white-label product. Users sign in
          with OAuth and retain full ownership of every campaign.
        </p>
      </section>

      <Separator />

      {/* ─── What AlgoAds does ─────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold">What the tool does</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            The Google Ads UI is powerful but has a steep learning curve for
            first-time advertisers. YouTube creators who want to promote their
            own videos typically spend 1–2 hours setting up a single Demand Gen
            campaign. AlgoAds compresses that to under 5 minutes while keeping
            the creator in full control.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={<KeyRound className="size-5" />}
            title="1. Sign in with Google"
            body="The creator signs into AlgoAds with their own Google Ads account via Google OAuth. We receive a refresh token that is stored encrypted and used only to call the Google Ads API on their explicit behalf."
          />
          <FeatureCard
            icon={<FileVideo className="size-5" />}
            title="2. Paste a YouTube URL"
            body="The creator pastes the URL of a YouTube video they own. AlgoAds reads the public video metadata (title, description, thumbnail) via YouTube&apos;s public oEmbed — no API key needed for this step."
          />
          <FeatureCard
            icon={<Zap className="size-5" />}
            title="3. Generate creative"
            body="AlgoAds uses Google&apos;s Gemini API to draft ad headlines, long headlines, descriptions, and a call-to-action that fit Google Ads policy constraints (character limits, allowed claims)."
          />
          <FeatureCard
            icon={<Megaphone className="size-5" />}
            title="4. Review and launch"
            body="The creator reviews the generated creative, uploads a square logo, sets a daily budget and duration, then clicks Launch. AlgoAds creates the campaign (PAUSED by default) via the Google Ads API on the creator&apos;s account."
          />
          <FeatureCard
            icon={<BarChart3 className="size-5" />}
            title="5. Monitor results"
            body="AlgoAds queries the Google Ads API via GAQL to show the creator impressions, views, clicks, and cost inside our dashboard. All metrics are pulled live — we store no aggregated reporting data."
          />
          <FeatureCard
            icon={<Lock className="size-5" />}
            title="Creator-owned"
            body="All campaigns run on the creator&apos;s own Google Ads account and are billed to their own payment method. AlgoAds is never in the billing path. The creator can revoke our OAuth access and delete campaigns at any time."
          />
        </div>
      </section>

      {/* ─── API use case ─────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Google Ads API use case
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            AlgoAds makes calls to the Google Ads REST API v23 using the
            creator&apos;s OAuth refresh token. The scope is narrow and
            campaign-management only.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UseCaseCard
            scope="READ"
            title="Read campaign metadata and metrics"
            services={[
              "customers.search (GAQL)",
              "campaigns.list / get",
              "ad_groups.list",
              "ads.list",
              "metrics.* via GAQL",
            ]}
          />
          <UseCaseCard
            scope="WRITE"
            title="Create campaigns on user&apos;s explicit action"
            services={[
              "campaignBudgets:mutate",
              "campaigns:mutate (Demand Gen, PAUSED by default)",
              "adGroups:mutate",
              "adGroupCriteria:mutate (geo + language)",
              "assets:mutate (YouTube video + logo image)",
              "adGroupAds:mutate (DemandGenVideoResponsiveAd)",
            ]}
          />
          <UseCaseCard
            scope="WRITE"
            title="Pause, enable, remove campaigns"
            services={[
              "campaigns:mutate (status ENABLED/PAUSED/REMOVED)",
              "Only triggered by user action in the dashboard",
            ]}
          />
          <UseCaseCard
            scope="N/A"
            title="What AlgoAds does NOT do"
            services={[
              "Does not create or manage Google Ads accounts",
              "Does not handle billing or payments",
              "Does not access customer PII from campaigns",
              "Does not modify account-level settings",
              "Does not manage campaigns for other advertisers or on a resale basis",
              "Does not use the API for audience insights or targeting outside the user&apos;s own campaigns",
            ]}
          />
        </div>
      </section>

      {/* ─── Data flow ─────────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Data we store and why
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            AlgoAds stores the minimum data required to maintain the user&apos;s
            session and resume their workflow. No advertising or audience data
            is stored.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DataCard
            icon={<Database className="size-5" />}
            what="User account"
            body="Email, display name, and the hashed Google OAuth subject identifier. Used to authenticate the user into AlgoAds itself."
          />
          <DataCard
            icon={<KeyRound className="size-5" />}
            what="Google Ads credentials"
            body="OAuth refresh token + MCC customer ID, stored encrypted at rest. Used to call the Google Ads API on the user&apos;s behalf. Rotated on every OAuth sign-in."
          />
          <DataCard
            icon={<BarChart3 className="size-5" />}
            what="Campaign references"
            body="Campaign IDs, names, creation timestamps, and status. Used only to display the user&apos;s own campaigns in their dashboard. No metrics data is stored — it is queried live via GAQL."
          />
        </div>
        <p className="text-sm text-muted-foreground pt-2">
          For the full details, see our{" "}
          <Link href="/privacy" className="text-cyan-700 hover:text-cyan-600 font-medium">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-cyan-700 hover:text-cyan-600 font-medium">
            Terms of Service
          </Link>
          .
        </p>
      </section>

      {/* ─── Contact ─────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold">
          Developer &amp; API contact
        </h2>
        <Card>
          <CardContent className="pt-6 pb-6 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary" className="font-mono">
                API Compliance
              </Badge>
              <a
                href="mailto:api@algo-thinker.com"
                className="font-mono text-base text-cyan-700 hover:text-cyan-600"
              >
                api@algo-thinker.com
              </a>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary" className="font-mono">
                General / Legal
              </Badge>
              <a
                href="mailto:venkat@algo-thinker.com"
                className="font-mono text-base text-cyan-700 hover:text-cyan-600"
              >
                venkat@algo-thinker.com
              </a>
            </div>
            <div className="text-sm text-muted-foreground pt-2">
              Business: Algo Thinker · Founder: Venkat Ghanta · Location: Remote
            </div>
          </CardContent>
        </Card>
      </section>
    </article>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="hover:border-cyan-300 hover:shadow-sm transition-all">
      <CardContent className="pt-7 pb-6">
        <div className="size-10 rounded-xl grid place-items-center bg-cyan-50 text-cyan-600 mb-5 border border-cyan-100">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-[15px] text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}

function UseCaseCard({
  scope,
  title,
  services,
}: {
  scope: "READ" | "WRITE" | "N/A";
  title: string;
  services: string[];
}) {
  const scopeColors = {
    READ: "bg-cyan-50 text-cyan-700 border-cyan-200",
    WRITE: "bg-amber-50 text-amber-700 border-amber-200",
    "N/A": "bg-neutral-100 text-neutral-600 border-neutral-200",
  } as const;
  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div
          className={`inline-block font-mono text-[10px] font-semibold tracking-[0.14em] uppercase px-2 py-1 rounded border mb-3 ${scopeColors[scope]}`}
        >
          {scope}
        </div>
        <h3 className="text-lg font-semibold mb-3 leading-snug">{title}</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground font-mono">
          {services.map((s) => (
            <li key={s} className="flex gap-2 items-start">
              <span className="text-cyan-600 mt-0.5">·</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DataCard({
  icon,
  what,
  body,
}: {
  icon: React.ReactNode;
  what: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="pt-7 pb-6">
        <div className="size-10 rounded-xl grid place-items-center bg-cyan-50 text-cyan-600 mb-5 border border-cyan-100">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{what}</h3>
        <p className="text-[15px] text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}

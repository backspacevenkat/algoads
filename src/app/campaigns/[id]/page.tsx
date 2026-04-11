import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  diagnoseCampaign,
  getDailyMetrics,
} from "@/lib/google-ads/campaigns";
import type { GoogleAdsCredentials } from "@/lib/google-ads/client";
import { getAuthContext } from "@/lib/auth-context";
import { formatUsd, formatNumber } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { MetricsChart } from "./metrics-chart";
import { CampaignActions } from "./actions";
import { GoogleAdsApiError } from "@/lib/google-ads/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadCampaign(creds: GoogleAdsCredentials, id: string) {
  try {
    const [diagnostic, daily] = await Promise.all([
      diagnoseCampaign(creds, id),
      getDailyMetrics(creds, id, 14),
    ]);
    return { diagnostic, daily, error: null };
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return null;
    }
    return {
      diagnostic: null,
      daily: null,
      error:
        e instanceof GoogleAdsApiError
          ? `${e.message}${e.trigger ? ` (trigger: ${e.trigger})` : ""}`
          : e instanceof Error
            ? e.message
            : "Unknown error",
    };
  }
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthContext();
  if (!auth.user) redirect(`/login?next=/campaigns/${id}`);
  if (!auth.googleAdsCreds) redirect("/campaigns");

  const data = await loadCampaign(auth.googleAdsCreds, id);

  if (data === null) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {data.error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load campaign</AlertTitle>
          <AlertDescription className="font-mono text-xs">{data.error}</AlertDescription>
        </Alert>
      )}

      {data.diagnostic && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.diagnostic.campaign.name}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span className="font-mono">{data.diagnostic.campaign.id}</span>
                <span>•</span>
                <Badge variant="secondary">
                  {data.diagnostic.campaign.advertisingChannelType}
                </Badge>
                <Badge
                  className={
                    data.diagnostic.campaign.status === "ENABLED"
                      ? "bg-emerald-600/20 text-emerald-500 border border-emerald-600/30"
                      : "bg-amber-600/20 text-amber-400 border border-amber-600/30"
                  }
                >
                  {data.diagnostic.campaign.status}
                </Badge>
              </div>
            </div>
            <CampaignActions
              campaignId={id}
              currentStatus={data.diagnostic.campaign.status}
              channelType={data.diagnostic.campaign.advertisingChannelType}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Budget"
              value={formatUsd(data.diagnostic.campaign.dailyBudgetUsd)}
              sublabel="per day"
            />
            <StatCard
              label="Geos"
              value={formatNumber(data.diagnostic.targeting.geos)}
              sublabel="targeting"
            />
            <StatCard
              label="Ad groups"
              value={formatNumber(data.diagnostic.adGroups.length)}
            />
            <StatCard label="Ads" value={formatNumber(data.diagnostic.ads.length)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              {data.daily && data.daily.length > 0 ? (
                <MetricsChart rows={data.daily} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No metrics yet — campaign may still be in review or recently enabled.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ad groups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.diagnostic.adGroups.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium">{ag.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {ag.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{ag.status}</Badge>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        CPC {formatUsd(ag.cpcBidMicros / 1_000_000)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.diagnostic.ads.map((ad) => (
                  <div key={ad.id} className="text-sm">
                    <div className="font-medium">{ad.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {ad.type}
                      </Badge>
                      <Badge
                        className={
                          ad.approvalStatus === "APPROVED"
                            ? "bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 text-xs"
                            : "bg-amber-600/20 text-amber-400 border border-amber-600/30 text-xs"
                        }
                      >
                        {ad.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data.diagnostic.ads.length === 0 && (
                  <p className="text-xs text-muted-foreground">No ads yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="flex gap-2">
            <a
              href={`https://ads.google.com/aw/campaigns?campaignId=${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">Open in Google Ads UI</Button>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="font-mono text-2xl mt-1">{value}</div>
        {sublabel && (
          <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
        )}
      </CardContent>
    </Card>
  );
}


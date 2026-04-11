import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { listCampaigns, getCampaignMetrics } from "@/lib/google-ads/campaigns";
import type { GoogleAdsCredentials } from "@/lib/google-ads/client";
import { getAuthContext } from "@/lib/auth-context";
import { formatUsd, formatNumber, formatPct } from "@/lib/utils";
import { Plus, Radio, Pause, CircleSlash, Link2 } from "lucide-react";
import type { CampaignRow, MetricsRow } from "@/lib/google-ads/types";

// Force dynamic so we always hit the live API (no build-time prerender)
export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusBadge(status: CampaignRow["status"]) {
  if (status === "ENABLED")
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
        <Radio className="size-3 mr-1" />
        Enabled
      </Badge>
    );
  if (status === "PAUSED")
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-medium">
        <Pause className="size-3 mr-1" />
        Paused
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <CircleSlash className="size-3 mr-1" />
      {status}
    </Badge>
  );
}

async function loadData(
  creds: GoogleAdsCredentials,
): Promise<
  { campaigns: CampaignRow[]; metricsById: Map<string, MetricsRow>; error: null } |
  { campaigns: null; metricsById: null; error: string }
> {
  try {
    const [campaigns, metrics] = await Promise.all([
      listCampaigns(creds),
      getCampaignMetrics(creds, 7),
    ]);
    const metricsById = new Map(metrics.map((m) => [m.campaignId, m]));
    return { campaigns, metricsById, error: null };
  } catch (e) {
    return {
      campaigns: null,
      metricsById: null,
      error: e instanceof Error ? e.message : "Unknown error loading campaigns",
    };
  }
}

export default async function DashboardPage() {
  const auth = await getAuthContext();
  if (!auth.user) redirect("/login?next=/campaigns");

  // User logged in but hasn't connected a Google Ads account — show CTA
  if (!auth.googleAdsCreds) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-[15px] text-muted-foreground mt-2">
            Signed in as <span className="font-medium text-foreground">{auth.user.email}</span>
          </p>
        </div>
        <Card>
          <CardContent className="py-14 text-center space-y-5">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Link2 className="size-7" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Connect your Google Ads account</h2>
              <p className="text-[15px] text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                AlgoAds needs access to your Google Ads account to launch and
                monitor campaigns. You&apos;ll be redirected to Google to grant
                permission — we only request the scopes required for Demand
                Gen campaigns.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/api/oauth/google-ads/start">
                <Button size="lg">
                  Connect Google Ads
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await loadData(auth.googleAdsCreds);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-[15px] text-muted-foreground mt-2">
            Retention-safe YouTube promotion — last 7 days performance
          </p>
        </div>
        <Link href="/launch">
          <Button size="lg">
            <Plus className="size-4" />
            Launch new campaign
          </Button>
        </Link>
      </div>

      {data.error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load campaigns</AlertTitle>
          <AlertDescription className="font-mono text-xs">{data.error}</AlertDescription>
        </Alert>
      )}

      {data.campaigns && data.campaigns.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No campaigns yet.</p>
            <Link href="/launch">
              <Button>
                <Plus className="size-4" />
                Launch your first campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {data.campaigns && data.campaigns.length > 0 && (
        <div className="grid gap-4">
          {data.campaigns.map((c) => {
            const m = data.metricsById.get(c.id);
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <Card className="hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg font-semibold tracking-tight truncate">
                        {c.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-mono">
                        <span>{c.id}</span>
                        <span>·</span>
                        <span>{c.advertisingChannelType}</span>
                        {c.biddingStrategyType && (
                          <>
                            <span>·</span>
                            <span>{c.biddingStrategyType}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </CardHeader>
                  <CardContent>
                    {m ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <Metric label="Impressions" value={formatNumber(m.impressions)} />
                        <Metric label="Clicks" value={formatNumber(m.clicks)} />
                        <Metric label="CTR" value={formatPct(m.ctrPct)} />
                        <Metric label="Views" value={formatNumber(m.videoViews)} />
                        <Metric label="Spend" value={formatUsd(m.costUsd)} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No metrics yet</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
        {label}
      </div>
      <div className="font-mono text-lg font-semibold text-foreground mt-1 tabular-nums">
        {value}
      </div>
    </div>
  );
}

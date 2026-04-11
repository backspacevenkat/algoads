import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { listCampaigns, getCampaignMetrics } from "@/lib/google-ads/campaigns";
import { formatUsd, formatNumber, formatPct } from "@/lib/utils";
import { Plus, Radio, Pause, CircleSlash } from "lucide-react";
import type { CampaignRow, MetricsRow } from "@/lib/google-ads/types";

// Force dynamic so we always hit the live API (no build-time prerender)
export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusBadge(status: CampaignRow["status"]) {
  if (status === "ENABLED")
    return (
      <Badge className="bg-emerald-600/20 text-emerald-500 border border-emerald-600/30">
        <Radio className="size-3 mr-1" />
        Enabled
      </Badge>
    );
  if (status === "PAUSED")
    return (
      <Badge className="bg-amber-600/20 text-amber-400 border border-amber-600/30">
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

async function loadData(): Promise<
  { campaigns: CampaignRow[]; metricsById: Map<string, MetricsRow>; error: null } |
  { campaigns: null; metricsById: null; error: string }
> {
  try {
    const [campaigns, metrics] = await Promise.all([
      listCampaigns(),
      getCampaignMetrics(7),
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
  const data = await loadData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Retention-safe YouTube promotion — last 7 days performance
          </p>
        </div>
        <Link href="/launch">
          <Button>
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
                <Card className="hover:border-border/80 hover:bg-card/80 transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-medium">
                        {c.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="font-mono">{c.id}</span>
                        <span>•</span>
                        <span>{c.advertisingChannelType}</span>
                        {c.biddingStrategyType && (
                          <>
                            <span>•</span>
                            <span>{c.biddingStrategyType}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </CardHeader>
                  <CardContent>
                    {m ? (
                      <div className="grid grid-cols-5 gap-4 text-sm">
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
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="font-mono text-base mt-1">{value}</div>
    </div>
  );
}

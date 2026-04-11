import { NextResponse } from "next/server";
import { listCampaigns, getCampaignMetrics } from "@/lib/google-ads/campaigns";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const [campaigns, metrics] = await Promise.all([
      listCampaigns(),
      getCampaignMetrics(7),
    ]);
    // Left-join metrics onto campaigns by id
    const metricsById = new Map(metrics.map((m) => [m.campaignId, m]));
    const enriched = campaigns.map((c) => ({
      ...c,
      metrics: metricsById.get(c.id) ?? null,
    }));
    log.info({
      route: "GET /api/campaigns",
      event: "list_success",
      count: enriched.length,
      ms: Date.now() - start,
    });
    return NextResponse.json({ campaigns: enriched });
  } catch (e) {
    log.error({
      route: "GET /api/campaigns",
      event: "list_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

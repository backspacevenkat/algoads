import { NextResponse } from "next/server";
import { listCampaigns, getCampaignMetrics } from "@/lib/google-ads/campaigns";
import {
  getAuthContext,
  unauthorizedResponse,
  notConnectedResponse,
} from "@/lib/auth-context";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const auth = await getAuthContext();
    if (!auth.user) return unauthorizedResponse();
    if (!auth.googleAdsCreds) return notConnectedResponse();

    const [campaigns, metrics] = await Promise.all([
      listCampaigns(auth.googleAdsCreds),
      getCampaignMetrics(auth.googleAdsCreds, 7),
    ]);
    const metricsById = new Map(metrics.map((m) => [m.campaignId, m]));
    const enriched = campaigns.map((c) => ({
      ...c,
      metrics: metricsById.get(c.id) ?? null,
    }));
    log.info({
      route: "GET /api/campaigns",
      event: "list_success",
      user_id: auth.user.id,
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

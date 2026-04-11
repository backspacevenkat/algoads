import { NextResponse } from "next/server";
import { getDailyMetrics } from "@/lib/google-ads/campaigns";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  const { id } = await params;
  try {
    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam === "30" ? 30 : daysParam === "14" ? 14 : 7;
    const rows = await getDailyMetrics(id, days);
    log.info({
      route: `GET /api/campaigns/${id}/metrics`,
      event: "metrics_success",
      days,
      rows: rows.length,
      ms: Date.now() - start,
    });
    return NextResponse.json({ days, rows });
  } catch (e) {
    log.error({
      route: `GET /api/campaigns/${id}/metrics`,
      event: "metrics_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

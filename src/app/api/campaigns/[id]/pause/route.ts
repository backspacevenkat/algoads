import { NextResponse } from "next/server";
import { pauseCampaign } from "@/lib/google-ads/campaigns";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  const { id } = await params;
  try {
    await pauseCampaign(id);
    log.info({
      route: `POST /api/campaigns/${id}/pause`,
      event: "pause_success",
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: true, status: "PAUSED" });
  } catch (e) {
    log.error({
      route: `POST /api/campaigns/${id}/pause`,
      event: "pause_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";
import { pauseCampaign } from "@/lib/google-ads/campaigns";
import {
  getAuthContext,
  unauthorizedResponse,
  notConnectedResponse,
} from "@/lib/auth-context";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  const { id } = await params;
  try {
    const auth = await getAuthContext();
    if (!auth.user) return unauthorizedResponse();
    if (!auth.googleAdsCreds) return notConnectedResponse();

    await pauseCampaign(auth.googleAdsCreds, id);
    log.info({
      route: `POST /api/campaigns/${id}/pause`,
      event: "pause_success",
      user_id: auth.user.id,
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

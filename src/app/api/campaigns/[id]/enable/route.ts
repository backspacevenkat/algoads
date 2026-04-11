import { NextResponse } from "next/server";
import { enableCampaign } from "@/lib/google-ads/campaigns";
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

    await enableCampaign(auth.googleAdsCreds, id);
    log.info({
      route: `POST /api/campaigns/${id}/enable`,
      event: "enable_success",
      user_id: auth.user.id,
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: true, status: "ENABLED" });
  } catch (e) {
    log.error({
      route: `POST /api/campaigns/${id}/enable`,
      event: "enable_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

import { NextResponse } from "next/server";
import {
  diagnoseCampaign,
  deleteCampaign,
} from "@/lib/google-ads/campaigns";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  const { id } = await params;
  try {
    const diagnostic = await diagnoseCampaign(id);
    log.info({
      route: `GET /api/campaigns/${id}`,
      event: "diagnose_success",
      ms: Date.now() - start,
    });
    return NextResponse.json(diagnostic);
  } catch (e) {
    log.error({
      route: `GET /api/campaigns/${id}`,
      event: "diagnose_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const start = Date.now();
  const { id } = await params;
  try {
    await deleteCampaign(id);
    log.info({
      route: `DELETE /api/campaigns/${id}`,
      event: "delete_success",
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error({
      route: `DELETE /api/campaigns/${id}`,
      event: "delete_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

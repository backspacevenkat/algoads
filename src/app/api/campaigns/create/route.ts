import { NextResponse } from "next/server";
import { z } from "zod";
import { createDemandGenCampaign } from "@/lib/google-ads/demand-gen";
import type { CreateDemandGenInput } from "@/lib/google-ads/types";
import { INDIA_TECH_CITIES, LANG_ENGLISH } from "@/lib/google-ads/geos";
import { jsonError } from "@/lib/api-utils";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Full pipeline can take 30-60s

const createSchema = z.object({
  campaignName: z.string().min(1).max(100),
  dailyBudgetUsd: z.number().positive().max(1000),
  durationDays: z.number().int().min(1).max(90),
  adGroupName: z.string().min(1).max(100),
  targetCpcMicros: z.number().int().positive(),
  videoId: z.string().min(1),
  finalUrl: z.string().url(),
  businessName: z.string().min(1).max(25),
  headlines: z.array(z.string().max(40)).min(3).max(5),
  longHeadlines: z.array(z.string().max(90)).min(1).max(5),
  descriptions: z.array(z.string().max(90)).min(1).max(5),
  logoImageBase64: z.string().min(1),
  locations: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional(),
  languages: z.array(z.string()).optional(),
  channelControls: z
    .object({
      youtubeInFeed: z.boolean(),
      youtubeInStream: z.boolean(),
      youtubeShorts: z.boolean(),
      discover: z.boolean(),
      gmail: z.boolean(),
      display: z.boolean(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      log.warn({
        route: "POST /api/campaigns/create",
        event: "validation_failed",
        issues: parsed.error.issues,
      });
      return NextResponse.json(
        { error: "invalid_input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const input: CreateDemandGenInput = {
      ...parsed.data,
      locations: parsed.data.locations ?? INDIA_TECH_CITIES,
      languages: parsed.data.languages ?? [LANG_ENGLISH],
    };

    log.info({
      route: "POST /api/campaigns/create",
      event: "create_start",
      campaignName: input.campaignName,
      videoId: input.videoId,
      budget: input.dailyBudgetUsd,
      geos: input.locations.length,
    });

    const result = await createDemandGenCampaign(input);

    log.info({
      route: "POST /api/campaigns/create",
      event: "create_success",
      campaignId: result.campaignId,
      criteriaCount: result.criteriaCount,
      ms: Date.now() - start,
    });

    return NextResponse.json(result);
  } catch (e) {
    log.error({
      route: "POST /api/campaigns/create",
      event: "create_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return jsonError(e);
  }
}

/**
 * Retention-safe Demand Gen campaign creation pipeline.
 *
 * Ported from scripts/algo_ads.py in story-forge. Encodes 5 non-obvious
 * v23 rules that aren't in the official docs:
 *
 * 1. `demandGenCampaignSettings.upgradedTargeting = true` moves geo/language
 *    to the AD GROUP level. Campaign-level criteria fail with the cryptic
 *    "OWNED_AND_OPERATED" error. upgradedTargeting is immutable after create.
 *
 * 2. v23 uses `startDateTime` / `endDateTime` (not `startDate` / `endDate`).
 *    End must be 23:59:59 or you get DATE_RANGE_ERROR_END_TIME_MUST_BE_THE_END_OF_A_DAY.
 *
 * 3. Ad group must NOT include a `type` field — it's inferred from campaign.
 *    Any value returns OPERATION_NOT_PERMITTED_FOR_CONTEXT.
 *
 * 4. DemandGenVideoResponsiveAd requires `ad.name` AND at least one
 *    `logoImages` entry (pre-uploaded IMAGE asset).
 *
 * 5. `call_to_actions` is optional — each item needs a pre-uploaded
 *    CallToActionAsset resource. Skip it unless needed.
 */
import { apiCall } from "./client";
import type { GoogleAdsCredentials } from "./client";
import type { CreateDemandGenInput, CreateDemandGenResult } from "./types";
import { GoogleAdsApiError } from "./types";

type MutateResponse = {
  results: Array<{ resourceName: string }>;
};

/** Format a Date as `YYYY-MM-DD HH:MM:SS` for v23 datetime fields. */
function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * Rollback partial state on failure. Deletes the budget (which will cascade-
 * disable dependent campaigns, though they stay around as REMOVED).
 */
async function rollback(
  creds: GoogleAdsCredentials,
  budgetResourceName: string,
  reason: string,
): Promise<never> {
  try {
    await apiCall(
      creds,
      "POST",
      `customers/${creds.customerId}/campaignBudgets:mutate`,
      { operations: [{ remove: budgetResourceName }] },
    );
  } catch {
    // ignore — cleanup is best-effort
  }
  throw new Error(`Demand Gen create rolled back: ${reason}`);
}

/**
 * Run the complete 7-step retention-safe Demand Gen pipeline.
 * Returns resource names for every created entity.
 */
export async function createDemandGenCampaign(
  creds: GoogleAdsCredentials,
  input: CreateDemandGenInput,
): Promise<CreateDemandGenResult> {
  const customerPath = `customers/${creds.customerId}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Default to retention-safe channels (YouTube In-Feed only)
  const channels = input.channelControls ?? {
    youtubeInFeed: true,
    youtubeInStream: false,
    youtubeShorts: false,
    discover: false,
    gmail: false,
    display: false,
  };

  // ─── STEP 1: Budget ──────────────────────────────────────────────
  const budgetMicros = Math.round(input.dailyBudgetUsd * 1_000_000);
  const budgetResp = await apiCall<MutateResponse>(
    creds,
    "POST",
    `${customerPath}/campaignBudgets:mutate`,
    {
      operations: [
        {
          create: {
            name: `${input.campaignName}_Budget_${timestamp}`,
            amountMicros: String(budgetMicros),
            deliveryMethod: "STANDARD",
            explicitlyShared: false,
          },
        },
      ],
    },
  );
  const budgetRn = budgetResp.results[0].resourceName;

  // ─── STEP 2: Campaign (PAUSED) ───────────────────────────────────
  const now = new Date();
  const endDt = new Date(now);
  endDt.setDate(endDt.getDate() + input.durationDays);
  endDt.setHours(23, 59, 59, 0);

  let campaignRn: string;
  try {
    const campResp = await apiCall<MutateResponse>(
      creds,
      "POST",
      `${customerPath}/campaigns:mutate`,
      {
        operations: [
          {
            create: {
              name: `${input.campaignName}_${timestamp}`,
              status: "PAUSED",
              advertisingChannelType: "DEMAND_GEN",
              campaignBudget: budgetRn,
              startDateTime: formatDateTime(now),
              endDateTime: formatDateTime(endDt),
              maximizeConversions: {},
              containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
              demandGenCampaignSettings: {
                upgradedTargeting: true,
              },
            },
          },
        ],
      },
    );
    campaignRn = campResp.results[0].resourceName;
  } catch (e) {
    await rollback(creds, budgetRn, `campaign create: ${(e as Error).message}`);
    throw e; // unreachable, satisfies TS
  }
  const campaignId = campaignRn.split("/").pop()!;

  // ─── STEP 3: Ad group with IN-FEED-ONLY channel controls ─────────
  let agRn: string;
  try {
    const agResp = await apiCall<MutateResponse>(
      creds,
      "POST",
      `${customerPath}/adGroups:mutate`,
      {
        operations: [
          {
            create: {
              name: `${input.adGroupName}_${timestamp}`,
              campaign: campaignRn,
              status: "ENABLED",
              cpcBidMicros: String(input.targetCpcMicros),
              demandGenAdGroupSettings: {
                channelControls: {
                  selectedChannels: channels,
                },
              },
            },
          },
        ],
      },
    );
    agRn = agResp.results[0].resourceName;
  } catch (e) {
    await rollback(creds, budgetRn, `ad group create: ${(e as Error).message}`);
    throw e;
  }

  // ─── STEP 4: Geo + language targeting (AD GROUP level) ───────────
  // Critical: with upgradedTargeting=true, these MUST be at ad group level.
  // Campaign-level fails with the cryptic OWNED_AND_OPERATED error.
  const criterionOps = [
    ...input.locations.map((geo) => ({
      create: {
        adGroup: agRn,
        location: { geoTargetConstant: `geoTargetConstants/${geo.id}` },
      },
    })),
    ...input.languages.map((langId) => ({
      create: {
        adGroup: agRn,
        language: { languageConstant: `languageConstants/${langId}` },
      },
    })),
  ];

  let criteriaCount = 0;
  try {
    const critResp = await apiCall<MutateResponse>(
      creds,
      "POST",
      `${customerPath}/adGroupCriteria:mutate`,
      { operations: criterionOps },
    );
    criteriaCount = critResp.results.length;
  } catch (e) {
    // Don't roll back — targeting can be added later in the UI if this fails
    console.warn("Criteria mutation failed:", (e as Error).message);
  }

  // ─── STEP 5: YouTube video asset + logo image asset ──────────────
  let videoAssetRn: string;
  let logoAssetRn: string;
  try {
    const videoResp = await apiCall<MutateResponse>(
      creds,
      "POST",
      `${customerPath}/assets:mutate`,
      {
        operations: [
          {
            create: {
              name: `${input.campaignName}_Video_${input.videoId}_${timestamp}`,
              type: "YOUTUBE_VIDEO",
              youtubeVideoAsset: { youtubeVideoId: input.videoId },
            },
          },
        ],
      },
    );
    videoAssetRn = videoResp.results[0].resourceName;

    const logoResp = await apiCall<MutateResponse>(
      creds,
      "POST",
      `${customerPath}/assets:mutate`,
      {
        operations: [
          {
            create: {
              name: `${input.campaignName}_Logo_${timestamp}`,
              type: "IMAGE",
              imageAsset: { data: input.logoImageBase64 },
            },
          },
        ],
      },
    );
    logoAssetRn = logoResp.results[0].resourceName;
  } catch (e) {
    await rollback(creds, budgetRn, `asset upload: ${(e as Error).message}`);
    throw e;
  }

  // ─── STEP 6: (inline text — no separate asset upload needed) ─────
  // headlines / long_headlines / descriptions / business_name are inline
  // AdTextAsset objects with just the `text` field.

  // ─── STEP 7: DemandGenVideoResponsiveAd ──────────────────────────
  let adRn: string;
  try {
    const adResp = await apiCall<MutateResponse>(
      creds,
      "POST",
      `${customerPath}/adGroupAds:mutate`,
      {
        operations: [
          {
            create: {
              adGroup: agRn,
              status: "ENABLED",
              ad: {
                name: `${input.campaignName}_Ad_${timestamp}`,
                finalUrls: [input.finalUrl],
                demandGenVideoResponsiveAd: {
                  videos: [{ asset: videoAssetRn }],
                  logoImages: [{ asset: logoAssetRn }],
                  headlines: input.headlines.map((h) => ({ text: h })),
                  longHeadlines: input.longHeadlines.map((h) => ({ text: h })),
                  descriptions: input.descriptions.map((d) => ({ text: d })),
                  businessName: { text: input.businessName },
                },
              },
            },
          },
        ],
      },
    );
    adRn = adResp.results[0].resourceName;
  } catch (e) {
    // Don't roll back — user has a valid campaign + ad group + assets, can
    // finish in the UI. Surface the error so the caller knows.
    if (e instanceof GoogleAdsApiError) {
      throw new Error(
        `Ad creation failed (campaign ${campaignId} exists, complete in UI): ${JSON.stringify(e.body).slice(0, 500)}`,
      );
    }
    throw e;
  }

  return {
    campaignId,
    campaignResourceName: campaignRn,
    adGroupResourceName: agRn,
    videoAssetResourceName: videoAssetRn,
    logoAssetResourceName: logoAssetRn,
    adResourceName: adRn,
    criteriaCount,
  };
}

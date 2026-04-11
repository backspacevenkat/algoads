/**
 * Campaign read/control operations.
 *
 * Ported from scripts/algo_ads.py. Uses v23 field names for dates and
 * metrics (renamed from v21):
 *   - campaign.start_date → campaign.start_date_time
 *   - metrics.video_views → metrics.video_trueview_views
 *   - metrics.average_cpv → metrics.trueview_average_cpv
 *   - metrics.video_view_rate → metrics.video_trueview_view_rate
 */
import { apiCall, gaql } from "./client";
import type { GoogleAdsCredentials } from "./client";
import type { CampaignRow, MetricsRow } from "./types";

type CampaignGaqlRow = {
  campaign: {
    id: string;
    name: string;
    status: string;
    servingStatus?: string;
    advertisingChannelType: string;
    biddingStrategyType?: string;
    startDateTime?: string;
    endDateTime?: string;
  };
};

type MetricsGaqlRow = {
  campaign: { id: string; name: string };
  metrics: {
    impressions?: string;
    clicks?: string;
    videoTrueviewViews?: string;
    costMicros?: string;
    ctr?: number;
    trueviewAverageCpv?: string;
    averageCpc?: string;
    videoTrueviewViewRate?: number;
    videoQuartileP25Rate?: number;
    videoQuartileP50Rate?: number;
    videoQuartileP75Rate?: number;
    videoQuartileP100Rate?: number;
  };
};

/**
 * List all non-removed campaigns in the configured customer account.
 * Used by the dashboard home page.
 */
export async function listCampaigns(
  creds: GoogleAdsCredentials,
): Promise<CampaignRow[]> {
  const rows = await gaql<CampaignGaqlRow>(
    creds,
    `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.advertising_channel_type, campaign.serving_status,
           campaign.start_date_time, campaign.end_date_time,
           campaign.bidding_strategy_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id
  `,
  );

  return rows.map((r) => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status as CampaignRow["status"],
    servingStatus: r.campaign.servingStatus,
    advertisingChannelType: r.campaign.advertisingChannelType as CampaignRow["advertisingChannelType"],
    biddingStrategyType: r.campaign.biddingStrategyType,
    startDateTime: r.campaign.startDateTime,
    endDateTime: r.campaign.endDateTime,
  }));
}

/**
 * Fetch metrics for all campaigns over a date range.
 * `days` should match a Google Ads LAST_N_DAYS macro (7, 14, 30, ...).
 */
export async function getCampaignMetrics(
  creds: GoogleAdsCredentials,
  days: 7 | 14 | 30 = 7,
): Promise<MetricsRow[]> {
  const rows = await gaql<MetricsGaqlRow>(
    creds,
    `
    SELECT campaign.name, campaign.id,
           metrics.impressions, metrics.clicks,
           metrics.video_trueview_views,
           metrics.cost_micros, metrics.ctr,
           metrics.trueview_average_cpv,
           metrics.average_cpc, metrics.video_trueview_view_rate,
           metrics.video_quartile_p25_rate, metrics.video_quartile_p50_rate,
           metrics.video_quartile_p75_rate, metrics.video_quartile_p100_rate
    FROM campaign
    WHERE segments.date DURING LAST_${days}_DAYS
  `,
  );

  return rows.map((r) => {
    const m = r.metrics;
    return {
      campaignId: r.campaign.id,
      campaignName: r.campaign.name,
      impressions: parseInt(m.impressions ?? "0", 10),
      clicks: parseInt(m.clicks ?? "0", 10),
      videoViews: parseInt(m.videoTrueviewViews ?? "0", 10),
      costUsd: parseInt(m.costMicros ?? "0", 10) / 1_000_000,
      ctrPct: (m.ctr ?? 0) * 100,
      averageCpvUsd: parseInt(m.trueviewAverageCpv ?? "0", 10) / 1_000_000,
      averageCpcUsd: parseInt(m.averageCpc ?? "0", 10) / 1_000_000,
      viewRatePct: (m.videoTrueviewViewRate ?? 0) * 100,
      quartileP25Pct: (m.videoQuartileP25Rate ?? 0) * 100,
      quartileP50Pct: (m.videoQuartileP50Rate ?? 0) * 100,
      quartileP75Pct: (m.videoQuartileP75Rate ?? 0) * 100,
      quartileP100Pct: (m.videoQuartileP100Rate ?? 0) * 100,
    };
  });
}

/** Daily metrics breakdown for a single campaign — feeds Recharts graphs. */
export interface DailyMetricRow {
  date: string;
  impressions: number;
  clicks: number;
  views: number;
  costUsd: number;
  ctrPct: number;
}

export async function getDailyMetrics(
  creds: GoogleAdsCredentials,
  campaignId: string,
  days: 7 | 14 | 30 = 14,
): Promise<DailyMetricRow[]> {
  const rows = await gaql<{
    segments: { date: string };
    metrics: {
      impressions?: string;
      clicks?: string;
      videoTrueviewViews?: string;
      costMicros?: string;
      ctr?: number;
    };
  }>(
    creds,
    `
    SELECT segments.date,
           metrics.impressions, metrics.clicks,
           metrics.video_trueview_views,
           metrics.cost_micros, metrics.ctr
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date DURING LAST_${days}_DAYS
    ORDER BY segments.date
  `,
  );

  return rows.map((r) => ({
    date: r.segments.date,
    impressions: parseInt(r.metrics.impressions ?? "0", 10),
    clicks: parseInt(r.metrics.clicks ?? "0", 10),
    views: parseInt(r.metrics.videoTrueviewViews ?? "0", 10),
    costUsd: parseInt(r.metrics.costMicros ?? "0", 10) / 1_000_000,
    ctrPct: (r.metrics.ctr ?? 0) * 100,
  }));
}

/** Diagnostic info for a single campaign — ad groups, ads, targeting counts. */
export interface CampaignDiagnostic {
  campaign: CampaignRow & { dailyBudgetUsd: number };
  adGroups: Array<{
    id: string;
    name: string;
    status: string;
    cpcBidMicros: number;
  }>;
  ads: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    approvalStatus: string;
  }>;
  targeting: {
    geos: number;
    languages: number;
    keywords: number;
    negativeKeywords: number;
  };
}

export async function diagnoseCampaign(
  creds: GoogleAdsCredentials,
  campaignId: string,
): Promise<CampaignDiagnostic> {
  // Campaign + budget
  const campRows = await gaql<{
    campaign: {
      id: string;
      name: string;
      status: string;
      servingStatus?: string;
      advertisingChannelType: string;
      biddingStrategyType?: string;
      startDateTime?: string;
      endDateTime?: string;
    };
    campaignBudget?: { amountMicros?: string };
  }>(
    creds,
    `
    SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status,
           campaign.advertising_channel_type, campaign.bidding_strategy_type,
           campaign.start_date_time, campaign.end_date_time,
           campaign_budget.amount_micros
    FROM campaign WHERE campaign.id = ${campaignId}
  `,
  );
  if (campRows.length === 0) {
    throw new Error(`Campaign ${campaignId} not found`);
  }
  const c = campRows[0].campaign;
  const b = campRows[0].campaignBudget;

  // Ad groups
  const agRows = await gaql<{
    adGroup: { id: string; name: string; status: string; cpcBidMicros?: string };
  }>(
    creds,
    `
    SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros
    FROM ad_group WHERE campaign.id = ${campaignId}
  `,
  );

  // Ads
  const adRows = await gaql<{
    adGroupAd: {
      ad: { id: string; name?: string; type: string };
      status: string;
      policySummary?: { approvalStatus?: string };
    };
  }>(
    creds,
    `
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.name,
           ad_group_ad.ad.type, ad_group_ad.status,
           ad_group_ad.policy_summary.approval_status
    FROM ad_group_ad WHERE campaign.id = ${campaignId}
  `,
  );

  // Ad-group-level criteria (Demand Gen with upgradedTargeting)
  let geoCount = 0;
  let langCount = 0;
  try {
    const agCritRows = await gaql<{
      adGroupCriterion: { type: string };
    }>(
      creds,
      `
      SELECT ad_group_criterion.type,
             ad_group_criterion.location.geo_target_constant,
             ad_group_criterion.language.language_constant
      FROM ad_group_criterion WHERE campaign.id = ${campaignId}
    `,
    );
    for (const r of agCritRows) {
      if (r.adGroupCriterion.type === "LOCATION") geoCount++;
      else if (r.adGroupCriterion.type === "LANGUAGE") langCount++;
    }
  } catch {
    // some campaign types don't support this query — fall through
  }

  // Keywords (campaign-level)
  let kwCount = 0;
  let negKwCount = 0;
  try {
    const cCritRows = await gaql<{
      campaignCriterion: { type: string; negative?: boolean };
    }>(
      creds,
      `
      SELECT campaign_criterion.type, campaign_criterion.negative
      FROM campaign_criterion WHERE campaign.id = ${campaignId}
    `,
    );
    for (const r of cCritRows) {
      const t = r.campaignCriterion.type;
      if (t === "KEYWORD") {
        if (r.campaignCriterion.negative) negKwCount++;
        else kwCount++;
      } else if (t === "LOCATION" && geoCount === 0) {
        // Fall back to campaign-level geos if ad-group query returned nothing
        geoCount++;
      } else if (t === "LANGUAGE" && langCount === 0) {
        langCount++;
      }
    }
  } catch {
    // ignore
  }

  return {
    campaign: {
      id: c.id,
      name: c.name,
      status: c.status as CampaignRow["status"],
      servingStatus: c.servingStatus,
      advertisingChannelType: c.advertisingChannelType as CampaignRow["advertisingChannelType"],
      biddingStrategyType: c.biddingStrategyType,
      startDateTime: c.startDateTime,
      endDateTime: c.endDateTime,
      dailyBudgetUsd: parseInt(b?.amountMicros ?? "0", 10) / 1_000_000,
    },
    adGroups: agRows.map((r) => ({
      id: r.adGroup.id,
      name: r.adGroup.name,
      status: r.adGroup.status,
      cpcBidMicros: parseInt(r.adGroup.cpcBidMicros ?? "0", 10),
    })),
    ads: adRows.map((r) => ({
      id: r.adGroupAd.ad.id,
      name: r.adGroupAd.ad.name ?? "(unnamed)",
      type: r.adGroupAd.ad.type,
      status: r.adGroupAd.status,
      approvalStatus: r.adGroupAd.policySummary?.approvalStatus ?? "UNKNOWN",
    })),
    targeting: {
      geos: geoCount,
      languages: langCount,
      keywords: kwCount,
      negativeKeywords: negKwCount,
    },
  };
}

/** Flip a campaign to ENABLED status. */
export async function enableCampaign(
  creds: GoogleAdsCredentials,
  campaignId: string,
): Promise<void> {
  await apiCall(
    creds,
    "POST",
    `customers/${creds.customerId}/campaigns:mutate`,
    {
      operations: [
        {
          updateMask: "status",
          update: {
            resourceName: `customers/${creds.customerId}/campaigns/${campaignId}`,
            status: "ENABLED",
          },
        },
      ],
    },
  );
}

/** Flip a campaign to PAUSED status. */
export async function pauseCampaign(
  creds: GoogleAdsCredentials,
  campaignId: string,
): Promise<void> {
  await apiCall(
    creds,
    "POST",
    `customers/${creds.customerId}/campaigns:mutate`,
    {
      operations: [
        {
          updateMask: "status",
          update: {
            resourceName: `customers/${creds.customerId}/campaigns/${campaignId}`,
            status: "PAUSED",
          },
        },
      ],
    },
  );
}

/** Remove (soft-delete) a campaign. Legacy VIDEO campaigns cannot be deleted. */
export async function deleteCampaign(
  creds: GoogleAdsCredentials,
  campaignId: string,
): Promise<void> {
  await apiCall(
    creds,
    "POST",
    `customers/${creds.customerId}/campaigns:mutate`,
    {
      operations: [
        {
          remove: `customers/${creds.customerId}/campaigns/${campaignId}`,
        },
      ],
    },
  );
}

/** Update a campaign's daily budget (by mutating the linked budget resource). */
export async function updateBudget(
  creds: GoogleAdsCredentials,
  budgetResourceName: string,
  dailyUsd: number,
): Promise<void> {
  await apiCall(
    creds,
    "POST",
    `customers/${creds.customerId}/campaignBudgets:mutate`,
    {
      operations: [
        {
          updateMask: "amount_micros",
          update: {
            resourceName: budgetResourceName,
            amountMicros: String(Math.round(dailyUsd * 1_000_000)),
          },
        },
      ],
    },
  );
}

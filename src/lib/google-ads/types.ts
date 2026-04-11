/**
 * Google Ads API v23 types — only the subset we actually use.
 *
 * These are hand-written rather than generated because (a) google-ads-node
 * is heavyweight and (b) we only hit ~12 endpoints. Typing the exact shape
 * catches v23-specific quirks (startDateTime vs startDate, etc.) at compile
 * time instead of at runtime.
 */

export type CampaignStatus = "ENABLED" | "PAUSED" | "REMOVED";
export type AdChannel =
  | "DEMAND_GEN"
  | "VIDEO"
  | "SEARCH"
  | "SHOPPING"
  | "PERFORMANCE_MAX"
  | "DISPLAY";

/** Flat campaign row as returned by GAQL status query. */
export interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  servingStatus?: string;
  advertisingChannelType: AdChannel;
  biddingStrategyType?: string;
  startDateTime?: string;
  endDateTime?: string;
}

/** Metrics row returned by GAQL reports. */
export interface MetricsRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  videoViews: number;
  costUsd: number;
  ctrPct: number;
  averageCpvUsd: number;
  averageCpcUsd: number;
  viewRatePct: number;
  quartileP25Pct: number;
  quartileP50Pct: number;
  quartileP75Pct: number;
  quartileP100Pct: number;
}

/** Verified geo target constants from our research. */
export interface GeoTarget {
  id: string;
  name: string;
}

/** Input to create a full retention-safe Demand Gen campaign. */
export interface CreateDemandGenInput {
  campaignName: string;
  dailyBudgetUsd: number;
  durationDays: number;
  adGroupName: string;
  targetCpcMicros: number;
  languages: string[]; // language constant IDs
  locations: GeoTarget[];

  videoId: string;
  finalUrl: string;
  businessName: string;
  headlines: string[];
  longHeadlines: string[];
  descriptions: string[];

  /** Base64-encoded PNG/JPG logo. Square 1:1, min 300x300. */
  logoImageBase64: string;

  /** Retention-safe channel selection — default all false except youtubeInFeed. */
  channelControls?: {
    youtubeInFeed: boolean;
    youtubeInStream: boolean;
    youtubeShorts: boolean;
    discover: boolean;
    gmail: boolean;
    display: boolean;
  };
}

/** Return value of the 7-step create pipeline. */
export interface CreateDemandGenResult {
  campaignId: string;
  campaignResourceName: string;
  adGroupResourceName: string;
  videoAssetResourceName: string;
  logoAssetResourceName: string;
  adResourceName: string;
  criteriaCount: number;
}

/** Generic error wrapper from the Google Ads REST API. */
export interface GoogleAdsError {
  code: number;
  message: string;
  details?: unknown;
}

export class GoogleAdsApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly trigger?: string;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Google Ads API error ${status}`);
    this.status = status;
    this.body = body;

    // Try to extract the trigger stringValue that's often the real root cause
    // (e.g. "OWNED_AND_OPERATED" for the Demand Gen criteria gotcha)
    try {
      const errors =
        (body as { error?: { details?: Array<{ errors?: Array<{ trigger?: { stringValue?: string } }> }> } })
          ?.error?.details?.[0]?.errors ?? [];
      const triggerValue = errors.find((e) => e?.trigger?.stringValue)?.trigger?.stringValue;
      if (triggerValue) this.trigger = triggerValue;
    } catch {
      // ignore extraction failures
    }
  }
}

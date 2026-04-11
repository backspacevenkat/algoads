/**
 * Verified geo target constant IDs.
 *
 * These were hand-verified on 2026-04-07 via `SELECT geo_target_constant ...`
 * queries against the live API. Hardcoded lists often go stale — if you need
 * a different city, run the query in `findGeoId` below to get the real ID.
 */

import { gaql } from "./client";
import type { GeoTarget } from "./types";

/**
 * Tier-1 India tech cities — our default retention-safe targets.
 * Why these: high English literacy, massive engineering talent density,
 * CPCs 10-50x cheaper than US/UK, low advertiser competition.
 */
export const INDIA_TECH_CITIES: GeoTarget[] = [
  { id: "1007768", name: "Bengaluru" },
  { id: "1007740", name: "Hyderabad" },
  { id: "1007785", name: "Mumbai" },
  { id: "9075215", name: "Delhi" },
  { id: "1007788", name: "Pune" },
  { id: "1007809", name: "Chennai" },
  { id: "1007765", name: "Gurugram" },
  { id: "1007826", name: "Noida" },
];

/** Tier-2 expansion set — broader English-speaking tech-curious markets. */
export const TIER_2_EXPANSION: GeoTarget[] = [
  { id: "2608", name: "Philippines" },
  { id: "2704", name: "Vietnam" },
  { id: "2458", name: "Malaysia" },
  { id: "2702", name: "Singapore" },
  { id: "2784", name: "UAE" },
];

/** English language constant ID in the Google Ads API. */
export const LANG_ENGLISH = "1000";

/**
 * Look up a geo target constant by name. Returns the first matching ENABLED
 * result. Use this when adding a city that isn't in the hardcoded list.
 */
export async function findGeoId(cityName: string, countryCode?: string): Promise<GeoTarget | null> {
  const countryFilter = countryCode
    ? `AND geo_target_constant.country_code = '${countryCode}'`
    : "";
  const rows = await gaql<{
    geoTargetConstant: { id: string; name: string; targetType: string; status: string };
  }>(`
    SELECT geo_target_constant.id, geo_target_constant.name,
           geo_target_constant.country_code, geo_target_constant.target_type,
           geo_target_constant.status
    FROM geo_target_constant
    WHERE geo_target_constant.name = '${cityName.replace(/'/g, "\\'")}'
      AND geo_target_constant.status = 'ENABLED'
      ${countryFilter}
    LIMIT 1
  `);

  if (rows.length === 0) return null;
  const g = rows[0].geoTargetConstant;
  return { id: g.id, name: g.name };
}

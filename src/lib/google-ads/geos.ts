/**
 * Verified geo target constant IDs.
 *
 * These were hand-verified on 2026-04-07 via `SELECT geo_target_constant ...`
 * queries against the live API. Hardcoded lists often go stale — if you need
 * a different city, run the query in `findGeoId` below to get the real ID.
 */

import { gaql } from "./client";
import type { GoogleAdsCredentials } from "./client";
import type { GeoTarget } from "./types";

/**
 * Tier-1 India tech cities — smaller, denser subset when you want to start
 * very narrow. Each id is a Google Ads city-level geo target.
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

/**
 * Global-south tech-crowd target set — 57 countries with large
 * English-literate engineer/CS-student populations and cheap CPVs.
 * This is the DEFAULT for /launch and reproduces the exact country list
 * we had on the old TrueView campaign that I was asked to match.
 *
 * If you want narrower targeting (e.g. only the 8 India cities above),
 * pass `locations: INDIA_TECH_CITIES` explicitly in the launch body.
 */
export const GLOBAL_SOUTH_TECH_COUNTRIES: GeoTarget[] = [
  { id: "2004", name: "Afghanistan" },
  { id: "2012", name: "Algeria" },
  { id: "2024", name: "Angola" },
  { id: "2032", name: "Argentina" },
  { id: "2050", name: "Bangladesh" },
  { id: "2068", name: "Bolivia" },
  { id: "2076", name: "Brazil" },
  { id: "2104", name: "Myanmar (Burma)" },
  { id: "2108", name: "Burundi" },
  { id: "2116", name: "Cambodia" },
  { id: "2120", name: "Cameroon" },
  { id: "2144", name: "Sri Lanka" },
  { id: "2148", name: "Chad" },
  { id: "2152", name: "Chile" },
  { id: "2170", name: "Colombia" },
  { id: "2218", name: "Ecuador" },
  { id: "2231", name: "Ethiopia" },
  { id: "2288", name: "Ghana" },
  { id: "2320", name: "Guatemala" },
  { id: "2324", name: "Guinea" },
  { id: "2332", name: "Haiti" },
  { id: "2356", name: "India" },
  { id: "2360", name: "Indonesia" },
  { id: "2398", name: "Kazakhstan" },
  { id: "2400", name: "Jordan" },
  { id: "2404", name: "Kenya" },
  { id: "2450", name: "Madagascar" },
  { id: "2458", name: "Malaysia" },
  { id: "2466", name: "Mali" },
  { id: "2484", name: "Mexico" },
  { id: "2508", name: "Mozambique" },
  { id: "2524", name: "Nepal" },
  { id: "2562", name: "Niger" },
  { id: "2566", name: "Nigeria" },
  { id: "2586", name: "Pakistan" },
  { id: "2604", name: "Peru" },
  { id: "2608", name: "Philippines" },
  { id: "2643", name: "Russia" },
  { id: "2646", name: "Rwanda" },
  { id: "2686", name: "Senegal" },
  { id: "2704", name: "Vietnam" },
  { id: "2706", name: "Somalia" },
  { id: "2710", name: "South Africa" },
  { id: "2716", name: "Zimbabwe" },
  { id: "2728", name: "South Sudan" },
  { id: "2736", name: "Sudan" },
  { id: "2760", name: "Syria" },
  { id: "2764", name: "Thailand" },
  { id: "2788", name: "Tunisia" },
  { id: "2792", name: "Turkiye" },
  { id: "2800", name: "Uganda" },
  { id: "2818", name: "Egypt" },
  { id: "2834", name: "Tanzania" },
  { id: "2860", name: "Uzbekistan" },
  { id: "2862", name: "Venezuela" },
  { id: "2887", name: "Yemen" },
  { id: "2894", name: "Zambia" },
];

/** Premium tier — smaller, English-first secondary markets. */
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
export async function findGeoId(
  creds: GoogleAdsCredentials,
  cityName: string,
  countryCode?: string,
): Promise<GeoTarget | null> {
  const countryFilter = countryCode
    ? `AND geo_target_constant.country_code = '${countryCode}'`
    : "";
  const rows = await gaql<{
    geoTargetConstant: { id: string; name: string; targetType: string; status: string };
  }>(
    creds,
    `
    SELECT geo_target_constant.id, geo_target_constant.name,
           geo_target_constant.country_code, geo_target_constant.target_type,
           geo_target_constant.status
    FROM geo_target_constant
    WHERE geo_target_constant.name = '${cityName.replace(/'/g, "\\'")}'
      AND geo_target_constant.status = 'ENABLED'
      ${countryFilter}
    LIMIT 1
  `,
  );

  if (rows.length === 0) return null;
  const g = rows[0].geoTargetConstant;
  return { id: g.id, name: g.name };
}

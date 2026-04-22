/**
 * YouTube Data API v3 + Analytics API client.
 *
 * Reuses the same OAuth refresh token flow as the Google Ads client
 * (same OAuth app, same refresh token — the YouTube scopes are included
 * in the consent screen via `include_granted_scopes`).
 */
import { getAccessToken } from "../google-ads/client";
import type { GoogleAdsCredentials } from "../google-ads/client";
import type { YouTubeAnalyticsResponse, YouTubeListResponse } from "./types";

const YT_DATA_BASE = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";

export class YouTubeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `YouTube API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Call the YouTube Data API v3.
 *
 * @param path - Endpoint path (e.g. "channels" or "playlistItems")
 * @param creds - Google OAuth credentials (refresh token is shared with Ads)
 * @param params - Query parameters (part, mine, etc.)
 */
export async function youtubeApiFetch<T>(
  path: string,
  creds: GoogleAdsCredentials,
  params?: Record<string, string>,
): Promise<T> {
  const token = await getAccessToken(creds);
  const url = new URL(`${YT_DATA_BASE}/${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
    throw new YouTubeApiError(res.status, parsed, `YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

/**
 * Call the YouTube Analytics API v2.
 *
 * @param creds - Google OAuth credentials
 * @param params - Query parameters (ids, startDate, endDate, metrics, dimensions, filters, etc.)
 */
export async function youtubeAnalyticsFetch(
  creds: GoogleAdsCredentials,
  params: Record<string, string>,
): Promise<YouTubeAnalyticsResponse> {
  const token = await getAccessToken(creds);
  const url = new URL(`${YT_ANALYTICS_BASE}/reports`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
    throw new YouTubeApiError(res.status, parsed, `YouTube Analytics ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as YouTubeAnalyticsResponse;
}

/**
 * Fetch a paginated list from the YouTube Data API, collecting all items.
 * Used internally to exhaust nextPageToken pagination.
 */
export async function youtubeListAll<T>(
  path: string,
  creds: GoogleAdsCredentials,
  params: Record<string, string>,
  maxPages = 5,
): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < maxPages; i++) {
    const p = { ...params };
    if (pageToken) p.pageToken = pageToken;

    const resp = await youtubeApiFetch<YouTubeListResponse<T>>(path, creds, p);
    items.push(...resp.items);

    if (!resp.nextPageToken) break;
    pageToken = resp.nextPageToken;
  }

  return items;
}

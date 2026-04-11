/**
 * Unified auth context for API routes and server components.
 *
 * Handles:
 *   1. Fetching the current InsForge user from cookies
 *   2. Looking up their Google Ads connection (if any)
 *   3. Assembling the full GoogleAdsCredentials bundle
 *
 * API routes typically do:
 *   const auth = await getAuthContext();
 *   if (!auth.user) return unauthorized();
 *   if (!auth.googleAdsCreds) return notConnected();
 *   const data = await listCampaigns(auth.googleAdsCreds);
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "./insforge/server";
import type { InsForgeUser } from "./insforge/server";
import { getUserGoogleAdsConnection } from "./insforge/db";
import type { GoogleAdsConnection } from "./insforge/db";
import { credentialsForUser } from "./google-ads/client";
import type { GoogleAdsCredentials } from "./google-ads/client";

export interface AuthContext {
  user: InsForgeUser | null;
  accessToken: string | null;
  connection: GoogleAdsConnection | null;
  googleAdsCreds: GoogleAdsCredentials | null;
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getSessionUser();
  if (!session) {
    return { user: null, accessToken: null, connection: null, googleAdsCreds: null };
  }
  const { user, accessToken } = session;

  let connection: GoogleAdsConnection | null = null;
  try {
    connection = await getUserGoogleAdsConnection(accessToken);
  } catch {
    // Table may not exist yet, or network hiccup — degrade gracefully
    connection = null;
  }

  const googleAdsCreds = connection ? credentialsForUser(connection) : null;

  return { user, accessToken, connection, googleAdsCreds };
}

/** Standard 401 response for API routes. */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

/** Standard 403 response when the user is logged in but hasn't connected Google Ads. */
export function notConnectedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "google_ads_not_connected",
      message:
        "Your AlgoAds account isn't connected to a Google Ads account yet. Visit /campaigns/connect to link one.",
    },
    { status: 403 },
  );
}

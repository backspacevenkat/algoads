/**
 * Google Ads OAuth connect flow — step 2 (callback).
 *
 * Receives the authorization code from Google, exchanges it for an access
 * token + refresh token, then calls the Google Ads API's
 * `customers:listAccessibleCustomers` to discover which account the user
 * has access to. Saves the refresh token + customer ID in D1 so we can call
 * Google Ads on their behalf going forward.
 *
 * This is also the redirect URI for Google sign-in (the only one registered
 * on the OAuth client): when the sign-in state cookie matches, the request is
 * handed to completeGoogleSignIn instead.
 *
 * MVP decisions:
 * - If the user has access to multiple customers, we pick the first one.
 *   They can re-run the flow to switch, or we can add an "account picker"
 *   screen later.
 * - We don't try to detect manager accounts. If their OAuth user has
 *   direct access to the customer, login_customer_id stays null.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/server";
import { upsertGoogleAdsConnection } from "@/lib/auth/db";
import { completeGoogleSignIn, exchangeGoogleCode, SIGNIN_STATE_COOKIE } from "@/lib/auth/google";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/** Redirect to /campaigns with an error query param. */
function failRedirect(req: Request, reason: string): NextResponse {
  const url = new URL("/campaigns", req.url);
  url.searchParams.set("connect_error", reason);
  return NextResponse.redirect(url);
}

async function exchangeCodeForTokens(
  code: string,
  req: Request,
): Promise<{ accessToken: string; refreshToken: string }> {
  const data = await exchangeGoogleCode(code, req);
  if (!data.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Reconnect and approve the consent screen.",
    );
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function listAccessibleCustomers(accessToken: string): Promise<string[]> {
  const developerToken = requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  const res = await fetch(
    "https://googleads.googleapis.com/v23/customers:listAccessibleCustomers",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
      },
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `listAccessibleCustomers failed ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  const data = (await res.json()) as { resourceNames?: string[] };
  const ids = (data.resourceNames ?? []).map((rn) => rn.split("/").pop()!);
  return ids;
}

async function fetchCustomerName(
  accessToken: string,
  customerId: string,
): Promise<string | null> {
  const developerToken = requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  const res = await fetch(
    `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "SELECT customer.descriptive_name, customer.currency_code FROM customer LIMIT 1",
      }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  const batches = Array.isArray(data) ? data : [data];
  for (const batch of batches) {
    const b = batch as { results?: Array<{ customer?: { descriptiveName?: string } }> };
    const name = b.results?.[0]?.customer?.descriptiveName;
    if (name) return name;
  }
  return null;
}

export async function GET(req: Request) {
  const start = Date.now();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // User denied the consent screen
  const store = await cookies();
  const signInState = store.get(SIGNIN_STATE_COOKIE)?.value;
  const isSignIn = !!state && !!signInState && signInState === state;

  if (errorParam) {
    log.warn({
      route: "GET /api/oauth/google-ads/callback",
      event: "consent_denied",
      error: errorParam,
      sign_in: isSignIn,
    });
    if (isSignIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", errorParam);
      return NextResponse.redirect(loginUrl);
    }
    return failRedirect(req, errorParam);
  }

  if (!code || !state) {
    return failRedirect(req, "missing_code_or_state");
  }

  // Google sign-in shares this redirect URI; its own state cookie is the CSRF check.
  if (isSignIn) {
    return completeGoogleSignIn(req, code, store);
  }

  // Validate the state cookie matches (CSRF check)
  const expectedState = store.get("google_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    log.warn({
      route: "GET /api/oauth/google-ads/callback",
      event: "state_mismatch",
    });
    return failRedirect(req, "state_mismatch");
  }
  // One-time use: clear it immediately
  store.set("google_oauth_state", "", { path: "/", maxAge: 0 });

  // Must be logged in
  const session = await getSessionUser();
  if (!session) {
    return failRedirect(req, "not_logged_in");
  }

  try {
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, req);

    const customerIds = await listAccessibleCustomers(accessToken);
    if (customerIds.length === 0) {
      return failRedirect(req, "no_accessible_customer");
    }
    // MVP: pick the first accessible customer
    const customerId = customerIds[0];

    const accountName = await fetchCustomerName(accessToken, customerId);

    await upsertGoogleAdsConnection(session.user.id, {
      refresh_token: refreshToken,
      customer_id: customerId,
      login_customer_id: null,
      account_name: accountName,
    });

    log.info({
      route: "GET /api/oauth/google-ads/callback",
      event: "connect_success",
      user_id: session.user.id,
      customer_id: customerId,
      accessible_count: customerIds.length,
      ms: Date.now() - start,
    });

    return NextResponse.redirect(new URL("/campaigns?connected=1", req.url));
  } catch (e) {
    log.error({
      route: "GET /api/oauth/google-ads/callback",
      event: "connect_failed",
      user_id: session.user.id,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    return failRedirect(
      req,
      encodeURIComponent(e instanceof Error ? e.message : "unknown"),
    );
  }
}

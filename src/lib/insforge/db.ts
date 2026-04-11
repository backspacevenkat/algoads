/**
 * InsForge database client for server-side use.
 *
 * Uses raw REST (PostgREST) calls rather than the SDK's query builder
 * because (a) we want explicit control over the access token used for
 * each request and (b) our query surface is tiny (one table, basic CRUD).
 *
 * PostgREST enforces row-level security when the request is authenticated
 * with the user's access token — our policies on google_ads_connections
 * say `auth.uid() = user_id`, so users can only see their own row.
 */
import { InsForgeAuthError } from "./server";

export interface GoogleAdsConnection {
  id: string;
  user_id: string;
  refresh_token: string;
  customer_id: string;
  login_customer_id: string | null;
  account_name: string | null;
  connected_at: string;
}

function requireBaseUrl(): string {
  const url = process.env.INSFORGE_BASE_URL;
  if (!url) throw new Error("INSFORGE_BASE_URL env var is required");
  return url.replace(/\/$/, "");
}

async function dbFetch<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const baseUrl = requireBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${init.accessToken}`,
    // PostgREST: return the updated/inserted row in the response
    Prefer: "return=representation",
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new InsForgeAuthError(res.status, body);
  }
  return body as T;
}

/**
 * Fetch the current user's Google Ads connection. Returns null if they
 * haven't connected their account yet.
 */
export async function getUserGoogleAdsConnection(
  accessToken: string,
): Promise<GoogleAdsConnection | null> {
  // PostgREST: `?select=*` and filter by user_id via RLS (auth.uid())
  // Using eq filter on user_id is redundant under RLS but harmless.
  const rows = await dbFetch<GoogleAdsConnection[]>(
    "/api/database/records/google_ads_connections?select=*&limit=1",
    { method: "GET", accessToken },
  );
  return rows[0] ?? null;
}

/**
 * Insert or update the user's Google Ads connection. Called after
 * completing the Google OAuth flow.
 */
export async function upsertGoogleAdsConnection(
  accessToken: string,
  userId: string,
  connection: {
    refresh_token: string;
    customer_id: string;
    login_customer_id?: string | null;
    account_name?: string | null;
  },
): Promise<GoogleAdsConnection> {
  const body = [
    {
      user_id: userId,
      refresh_token: connection.refresh_token,
      customer_id: connection.customer_id,
      login_customer_id: connection.login_customer_id ?? null,
      account_name: connection.account_name ?? null,
    },
  ];

  // PostgREST upsert via `resolution=merge-duplicates` preference + unique
  // index on user_id handles the "insert or update" semantics.
  const rows = await dbFetch<GoogleAdsConnection[]>(
    "/api/database/records/google_ads_connections?on_conflict=user_id",
    {
      method: "POST",
      body: JSON.stringify(body),
      accessToken,
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    },
  );

  if (!rows[0]) {
    throw new Error("Upsert returned no rows");
  }
  return rows[0];
}

/** Delete the user's Google Ads connection (disconnect). */
export async function deleteGoogleAdsConnection(
  accessToken: string,
): Promise<void> {
  // RLS ensures we only delete the caller's own row
  await dbFetch<unknown>(
    "/api/database/records/google_ads_connections?user_id=not.is.null",
    { method: "DELETE", accessToken },
  );
}

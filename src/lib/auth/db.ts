/**
 * Google Ads connections in Cloudflare D1 (replaces the InsForge table).
 *
 * InsForge enforced "own rows only" with row-level security. D1 has no RLS,
 * so every query here is scoped by the signed-in user's id, which callers
 * take from getSessionUser().
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface GoogleAdsConnection {
  id: string;
  user_id: string;
  refresh_token: string;
  customer_id: string;
  login_customer_id: string | null;
  account_name: string | null;
  connected_at: string;
}

function db(): D1Database {
  return getCloudflareContext().env.DB;
}

/** The user's Google Ads connection, or null if they haven't connected yet. */
export async function getUserGoogleAdsConnection(userId: string): Promise<GoogleAdsConnection | null> {
  return db()
    .prepare("SELECT * FROM google_ads_connections WHERE user_id = ?")
    .bind(userId)
    .first<GoogleAdsConnection>();
}

/** Insert or update the user's Google Ads connection after the OAuth flow. */
export async function upsertGoogleAdsConnection(
  userId: string,
  connection: {
    refresh_token: string;
    customer_id: string;
    login_customer_id?: string | null;
    account_name?: string | null;
  },
): Promise<GoogleAdsConnection> {
  const row = await db()
    .prepare(
      `INSERT INTO google_ads_connections (id, user_id, refresh_token, customer_id, login_customer_id, account_name)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         refresh_token = excluded.refresh_token,
         customer_id = excluded.customer_id,
         login_customer_id = excluded.login_customer_id,
         account_name = excluded.account_name,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       RETURNING *`,
    )
    .bind(
      crypto.randomUUID(),
      userId,
      connection.refresh_token,
      connection.customer_id,
      connection.login_customer_id ?? null,
      connection.account_name ?? null,
    )
    .first<GoogleAdsConnection>();
  if (!row) throw new Error("Upsert returned no rows");
  return row;
}

/** Delete the user's Google Ads connection (disconnect). */
export async function deleteGoogleAdsConnection(userId: string): Promise<void> {
  await db().prepare("DELETE FROM google_ads_connections WHERE user_id = ?").bind(userId).run();
}

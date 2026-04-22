/**
 * Google Ads OAuth connect flow — step 1.
 *
 * Redirects the currently signed-in AlgoAds user to Google's consent screen
 * asking for the `adwords` scope. Google then redirects back to our
 * `/api/oauth/google-ads/callback` endpoint with an authorization code.
 *
 * We set a `state` cookie for CSRF protection: the callback must receive
 * the same value we generated here.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/insforge/server";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  // Full YouTube scope (not just readonly) — required for Brand Account
  // channels accessed via managedByMe=true. Also covers upload + manage.
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function randomState(): string {
  // 16 random bytes → 32-char hex state
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function redirectUri(req: Request): string {
  // Allow override via env so we don't hardcode the prod URL
  const override = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (override) return override;
  // Fall back to the request's own origin (covers localhost dev + preview deploys)
  const url = new URL(req.url);
  return `${url.origin}/api/oauth/google-ads/callback`;
}

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    // Not logged in — bounce to login with redirect back here
    return NextResponse.redirect(
      new URL("/login?next=/api/oauth/google-ads/start", req.url),
    );
  }

  const clientId = requireEnv("GOOGLE_ADS_CLIENT_ID");
  const state = randomState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: OAUTH_SCOPES,
    // offline + consent is the only way to reliably get a refresh token
    access_type: "offline",
    prompt: "consent",
    state,
    // include_granted_scopes lets users re-grant without losing prior consents
    include_granted_scopes: "true",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Store state in a short-lived httpOnly cookie for CSRF validation
  const store = await cookies();
  store.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  log.info({
    route: "GET /api/oauth/google-ads/start",
    event: "oauth_start",
    user_id: session.user.id,
  });

  return NextResponse.redirect(authUrl);
}

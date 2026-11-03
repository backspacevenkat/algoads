/**
 * Google sign-in / sign-up — step 1.
 *
 * Sends the user to Google's consent screen with `openid email profile`
 * scopes only — just enough to identify them. Google returns to the shared
 * callback (`/api/oauth/google-ads/callback`), which sees our state cookie
 * and finishes the sign-in in lib/auth/google.ts.
 *
 * Google Ads access is a separate grant: the user clicks "Connect Google
 * Ads" on the dashboard after signing in.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googleSignInUrl, SIGNIN_NEXT_COOKIE, SIGNIN_STATE_COOKIE } from "@/lib/auth/google";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get("next") ?? "/campaigns";

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    // State (CSRF check) and the post-auth destination live in short-lived
    // httpOnly cookies until Google sends the user back.
    const store = await cookies();
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600, // 10 minutes
    };
    store.set(SIGNIN_STATE_COOKIE, state, cookieOpts);
    store.set(SIGNIN_NEXT_COOKIE, next, cookieOpts);

    log.info({ route: "GET /api/auth/google-start", event: "oauth_start", provider: "google", next });
    return NextResponse.redirect(googleSignInUrl(req, state));
  } catch (e) {
    log.error({
      route: "GET /api/auth/google-start",
      event: "oauth_start_failed",
      error: e instanceof Error ? e.message : String(e),
    });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "oauth_init_failed");
    return NextResponse.redirect(loginUrl);
  }
}

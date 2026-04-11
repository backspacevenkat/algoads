/**
 * Google sign-in / sign-up — step 1.
 *
 * Uses InsForge's built-in Google OAuth with PKCE. We generate a code
 * verifier + challenge, store the verifier in a short-lived httpOnly
 * cookie, and redirect the user to Google via InsForge's initiate
 * endpoint.
 *
 * After the user signs in at Google, InsForge handles the provider
 * callback internally and redirects the browser back to our
 * /api/auth/google-callback endpoint with `?insforge_code=...`. The
 * callback route reads the cookie + query param and exchanges them for
 * a session.
 *
 * This flow grants only `openid email profile` scopes — just enough to
 * identify the user. To additionally grant Google Ads access, the user
 * clicks "Connect Google Ads" on the dashboard after signing in (that's
 * a separate OAuth flow we already built).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initiateOAuth, generatePkcePair } from "@/lib/insforge/server";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get("next") ?? "/campaigns";

    const { verifier, challenge } = await generatePkcePair();

    const redirectUri = `${url.origin}/api/auth/google-callback`;
    const authUrl = await initiateOAuth("google", redirectUri, challenge);

    // Store the verifier AND the post-auth destination in httpOnly cookies
    // so the callback can complete the exchange and send the user where
    // they wanted to go.
    const store = await cookies();
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600, // 10 minutes
    };
    store.set("insforge_pkce_verifier", verifier, cookieOpts);
    store.set("insforge_oauth_next", next, cookieOpts);

    log.info({
      route: "GET /api/auth/google-start",
      event: "oauth_start",
      provider: "google",
      next,
    });

    return NextResponse.redirect(authUrl);
  } catch (e) {
    log.error({
      route: "GET /api/auth/google-start",
      event: "oauth_start_failed",
      error: e instanceof Error ? e.message : String(e),
    });
    // Bounce back to /login with error query
    const url = new URL(req.url);
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set(
      "error",
      e instanceof Error ? e.message : "oauth_init_failed",
    );
    return NextResponse.redirect(loginUrl);
  }
}

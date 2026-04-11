/**
 * Google sign-in / sign-up — step 2 (callback).
 *
 * InsForge redirects the browser here after a successful Google sign-in
 * with `?insforge_code=...`. We read the PKCE verifier we stored in
 * google-start, exchange the code for a full session, set our cookies,
 * and redirect the user to their originally requested page (defaults
 * to /campaigns).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeOAuthCode,
  setSessionCookies,
  InsForgeAuthError,
} from "@/lib/insforge/server";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function failRedirect(req: Request, reason: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const start = Date.now();
  const url = new URL(req.url);
  const code = url.searchParams.get("insforge_code") ?? url.searchParams.get("code");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    log.warn({
      route: "GET /api/auth/google-callback",
      event: "provider_error",
      error: providerError,
    });
    return failRedirect(req, providerError);
  }

  if (!code) {
    return failRedirect(req, "missing_code");
  }

  const store = await cookies();
  const verifier = store.get("insforge_pkce_verifier")?.value;
  const next = store.get("insforge_oauth_next")?.value ?? "/campaigns";

  if (!verifier) {
    log.warn({
      route: "GET /api/auth/google-callback",
      event: "missing_verifier",
    });
    return failRedirect(req, "missing_verifier");
  }

  // One-time use: clear the verifier + next cookies regardless of outcome
  store.set("insforge_pkce_verifier", "", { path: "/", maxAge: 0 });
  store.set("insforge_oauth_next", "", { path: "/", maxAge: 0 });

  try {
    const session = await exchangeOAuthCode(code, verifier);
    setSessionCookies(store, session);

    log.info({
      route: "GET /api/auth/google-callback",
      event: "oauth_success",
      user_id: session.user.id,
      ms: Date.now() - start,
    });

    // Ensure `next` is a safe local path to prevent open-redirect attacks
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/campaigns";
    return NextResponse.redirect(new URL(safeNext, req.url));
  } catch (e) {
    log.error({
      route: "GET /api/auth/google-callback",
      event: "oauth_exchange_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    const reason =
      e instanceof InsForgeAuthError
        ? `exchange_failed_${e.status}`
        : "exchange_failed";
    return failRedirect(req, reason);
  }
}

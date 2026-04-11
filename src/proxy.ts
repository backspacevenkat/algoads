/**
 * Next.js 16 proxy — route gate for admin areas.
 *
 * This is defense-in-depth only. The real auth check runs inside server
 * components and API routes via `getAuthContext()` (which validates the
 * InsForge access token against their API). The proxy's job is to redirect
 * unauthenticated users to /login before we bother hitting any code.
 *
 * Authentication signal: presence of the `insforge_refresh` cookie.
 * Whoever holds a valid cookie has some chance of having a live session;
 * the downstream getAuthContext will confirm it for real.
 *
 * Protected routes:
 *   - /campaigns       (dashboard)
 *   - /launch          (campaign launcher)
 *   - /api/campaigns/**
 *   - /api/creative/**
 *
 * Always public:
 *   - /                (marketing landing)
 *   - /login           (Supabase-style password form)
 *   - /signup          (new account)
 *   - /api/auth/**     (signup/login/logout handlers)
 *   - /api/oauth/**    (Google Ads connect flow)
 */
import { NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE = "insforge_refresh";

function isProtectedPath(pathname: string): boolean {
  // Auth + OAuth endpoints are always public so users can sign in / connect
  if (pathname === "/login" || pathname === "/signup") return false;
  if (pathname.startsWith("/api/auth/")) return false;
  if (pathname.startsWith("/api/oauth/")) return false;

  if (pathname.startsWith("/campaigns")) return true;
  if (pathname.startsWith("/launch")) return true;
  if (pathname.startsWith("/api/campaigns")) return true;
  if (pathname.startsWith("/api/creative")) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasRefresh = !!req.cookies.get(REFRESH_COOKIE)?.value;
  if (hasRefresh) {
    return NextResponse.next();
  }

  // Unauthenticated: API routes get 401 JSON, pages redirect to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

// Run on all routes except Next.js internals and public static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-16.png|favicon-32.png|apple-touch-icon.png|logo-icon.png|logo-full.png|logo-square.png|og-image.png).*)",
  ],
};

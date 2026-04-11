/**
 * Next.js 16 proxy (formerly middleware) — simple password gate for admin
 * pages and API routes.
 *
 * What's protected:
 *   - /campaigns        — dashboard list
 *   - /campaigns/[id]   — campaign detail
 *   - /launch           — campaign launcher
 *   - /api/**           — all API routes EXCEPT /api/auth (the login handler)
 *
 * What's public:
 *   - /                 — marketing landing page
 *   - /login            — password form
 *   - /api/auth         — POST login handler
 *   - all static assets (logo, favicon, og-image)
 *
 * Two ways to authenticate:
 *   1. Cookie `algoads_session` = sha256(ALGOADS_ADMIN_PASSWORD) — set by
 *      the /login form after the user enters the password. 30-day expiry.
 *   2. Header `Authorization: Bearer <ALGOADS_API_TOKEN>` — used by the MCP
 *      server and by any programmatic caller.
 *
 * If ALGOADS_ADMIN_PASSWORD is unset (local dev), the gate is disabled and
 * everything is accessible — makes `npm run dev` painless.
 */
import { NextRequest, NextResponse } from "next/server";

// Web Crypto SHA-256 helper — available in Node.js 20+ and Edge runtimes.
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/api/auth") return false;
  if (pathname.startsWith("/campaigns")) return true;
  if (pathname.startsWith("/launch")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const gateValue = process.env.ALGOADS_ADMIN_PASSWORD;
  // Dev mode: no password configured → gate is off
  if (!gateValue) {
    return NextResponse.next();
  }

  // 1) Bearer token (for MCP / programmatic access)
  const apiToken = process.env.ALGOADS_API_TOKEN;
  if (apiToken) {
    const authHeader = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${apiToken}`;
    if (authHeader === expected) {
      return NextResponse.next();
    }
  }

  // 2) Cookie-based session
  const expectedCookie = await sha256Hex(gateValue);
  const cookie = req.cookies.get("algoads_session")?.value;
  if (cookie === expectedCookie) {
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

// Next.js 16 proxy.ts always runs on Node.js — the runtime is implicit and
// declaring it explicitly causes a build error. See CVE-2025-29927 context
// for why the rename from middleware.ts → proxy.ts happened.

// Run on all routes except Next.js internals and public static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-16.png|favicon-32.png|apple-touch-icon.png|logo-icon.png|logo-full.png|logo-square.png|og-image.png).*)",
  ],
};

/**
 * Server-side InsForge helpers.
 *
 * Cookie-based auth for Next.js App Router. We don't use the InsForge
 * SDK's built-in cookie handling because:
 *
 * 1. The SDK expects the browser to talk directly to InsForge, which would
 *    set httpOnly cookies on the InsForge domain (not ours). In a Next.js
 *    SSR app we want cookies on our own domain.
 * 2. We need the user's access token available in server components, route
 *    handlers, AND the proxy (middleware). Owning the cookie ourselves is
 *    simpler than trying to plumb the SDK state around.
 *
 * We call InsForge's REST API with `client_type=server` which returns
 * refreshToken in the response body (not a cookie), then store both
 * accessToken + refreshToken in our own httpOnly cookies.
 */
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const ACCESS_COOKIE = "insforge_access";
const REFRESH_COOKIE = "insforge_refresh";

// Access tokens are short-lived (InsForge default is ~1h). Refresh cookies
// live longer so the user stays signed in.
const ACCESS_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface InsForgeUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  providers?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface SignUpOrInResponse {
  user: InsForgeUser;
  accessToken: string;
  refreshToken: string;
  requireEmailVerification?: boolean;
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  [k: string]: unknown;
}

export class InsForgeAuthError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `InsForge auth error ${status}`);
    this.status = status;
    this.body = body;
  }
}

function requireBaseUrl(): string {
  const url = process.env.INSFORGE_BASE_URL;
  if (!url) throw new Error("INSFORGE_BASE_URL env var is required");
  return url.replace(/\/$/, "");
}

function requireAnonKey(): string {
  const key = process.env.INSFORGE_ANON_KEY;
  if (!key) throw new Error("INSFORGE_ANON_KEY env var is required");
  return key;
}

async function insforgeFetch<T>(
  path: string,
  init: RequestInit & { token?: string },
): Promise<T> {
  const baseUrl = requireBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${init.token ?? requireAnonKey()}`,
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    // never cache auth calls
    cache: "no-store",
  });

  let body: unknown;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const errBody = body as ApiErrorBody;
    throw new InsForgeAuthError(
      res.status,
      body,
      errBody?.message ?? errBody?.error ?? `InsForge API ${res.status}`,
    );
  }

  return body as T;
}

/** Sign up a new user with email/password. Returns the new session. */
export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<SignUpOrInResponse> {
  return insforgeFetch<SignUpOrInResponse>(
    "/api/auth/users?client_type=server",
    {
      method: "POST",
      body: JSON.stringify({ email, password, ...(name ? { name } : {}) }),
    },
  );
}

/** Sign in an existing user with email/password. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignUpOrInResponse> {
  return insforgeFetch<SignUpOrInResponse>(
    "/api/auth/sessions?client_type=server",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
}

/** Exchange a refresh token for a new access + refresh token pair. */
export async function refreshSession(
  refreshToken: string,
): Promise<SignUpOrInResponse> {
  return insforgeFetch<SignUpOrInResponse>(
    "/api/auth/refresh?client_type=server",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
  );
}

/**
 * Initiate an InsForge OAuth PKCE flow. Returns the URL to redirect the
 * user to for provider sign-in. The caller must generate code_verifier and
 * code_challenge, and store the verifier for the callback exchange step.
 *
 * Supported providers: google, github, discord, linkedin, facebook,
 * instagram, tiktok, apple, x, spotify, microsoft.
 */
export async function initiateOAuth(
  provider: "google" | "github",
  redirectUri: string,
  codeChallenge: string,
): Promise<string> {
  const baseUrl = requireBaseUrl();
  const url =
    `${baseUrl}/api/auth/oauth/${provider}?` +
    new URLSearchParams({
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
    }).toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${requireAnonKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new InsForgeAuthError(res.status, body, `OAuth initiate failed: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { authUrl: string };
  if (!data.authUrl) {
    throw new Error("InsForge did not return an authUrl");
  }
  return data.authUrl;
}

/**
 * Exchange the `insforge_code` received in the OAuth callback for a full
 * session. Uses the previously stored `code_verifier` (PKCE).
 */
export async function exchangeOAuthCode(
  code: string,
  codeVerifier: string,
): Promise<SignUpOrInResponse> {
  return insforgeFetch<SignUpOrInResponse>(
    "/api/auth/oauth/exchange?client_type=server",
    {
      method: "POST",
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    },
  );
}

/**
 * Generate a PKCE code verifier + challenge pair.
 * Verifier is a 64-char URL-safe random string, challenge is SHA-256 base64url.
 */
export async function generatePkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const bytes = new Uint8Array(48); // 48 bytes → ~64 chars of base64url
  crypto.getRandomValues(bytes);
  const verifier = base64UrlEncode(bytes);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

function base64UrlEncode(bytes: Uint8Array): string {
  // Node.js Buffer is available in Next.js server runtime
  const b64 = Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Fetch the current user given an access token. Returns null on expired/invalid. */
export async function fetchCurrentUser(
  accessToken: string,
): Promise<InsForgeUser | null> {
  try {
    const resp = await insforgeFetch<{ user: InsForgeUser }>(
      "/api/auth/sessions/current",
      { method: "GET", token: accessToken },
    );
    return resp.user;
  } catch (e) {
    if (e instanceof InsForgeAuthError && (e.status === 401 || e.status === 403)) {
      return null;
    }
    throw e;
  }
}

/**
 * Session context for use in route handlers / server components.
 * Stores the writable cookie store so we can refresh tokens inline.
 */
interface CookieStoreLike {
  get(name: string): { name: string; value: string } | undefined;
}

interface WritableCookieStore extends CookieStoreLike {
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

/**
 * Next.js 16 makes `cookies()` in Server Components return an object that
 * LOOKS writable (it has a `.set` method) but throws at runtime if you try
 * to use it. Only Server Actions, Route Handlers, and proxies can actually
 * write cookies.
 *
 * We can't detect the caller context cheaply, so we attempt the write and
 * silently swallow the specific "Cookies can only be modified..." error.
 * The refreshed access token is still returned to the current request — it
 * just won't persist to cookies from a server component. The next request
 * from the same browser will re-run the refresh path, which is one extra
 * InsForge call per page load on expired sessions — acceptable.
 */
function safeSet(
  store: Partial<WritableCookieStore>,
  name: string,
  value: string,
  options?: Record<string, unknown>,
): void {
  if (typeof store.set !== "function") return;
  try {
    store.set(name, value, options);
  } catch (e) {
    // Next.js throws a specific error when cookies() is used in a Server
    // Component context. We tolerate it silently; any other error re-throws.
    const msg = e instanceof Error ? e.message : "";
    if (!msg.includes("Cookies can only be modified")) throw e;
  }
}

/**
 * Write the session tokens into our httpOnly cookies. Call this after a
 * successful signUp / signInWithPassword / refreshSession.
 */
export function setSessionCookies(
  store: Partial<WritableCookieStore>,
  session: { accessToken: string; refreshToken: string },
): void {
  const secure = process.env.NODE_ENV === "production";
  const common = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  safeSet(store, ACCESS_COOKIE, session.accessToken, {
    ...common,
    maxAge: ACCESS_MAX_AGE,
  });
  safeSet(store, REFRESH_COOKIE, session.refreshToken, {
    ...common,
    maxAge: REFRESH_MAX_AGE,
  });
}

/** Clear session cookies (logout). */
export function clearSessionCookies(store: Partial<WritableCookieStore>): void {
  safeSet(store, ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  safeSet(store, REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Get the current authenticated user from cookies.
 *
 * Usage in server components or route handlers:
 *   const user = await getSessionUser();
 *   if (!user) redirect('/login');
 *
 * Automatically refreshes the access token if expired and the cookie store
 * is writable (route handlers can do this; some server components can't).
 */
export async function getSessionUser(): Promise<{
  user: InsForgeUser;
  accessToken: string;
} | null> {
  const store = (await cookies()) as unknown as ReadonlyRequestCookies &
    Partial<WritableCookieStore>;

  const access = store.get(ACCESS_COOKIE)?.value;
  const refresh = store.get(REFRESH_COOKIE)?.value;

  // Fast path: valid access token
  if (access) {
    const user = await fetchCurrentUser(access);
    if (user) return { user, accessToken: access };
  }

  // Slow path: try refresh. safeSet() silently no-ops in Server Component
  // contexts where cookie writes aren't allowed — we still return the
  // freshly-refreshed user for THIS request, and the next request will
  // re-refresh. Route handlers + proxies will persist the cookies normally.
  if (refresh) {
    try {
      const refreshed = await refreshSession(refresh);
      setSessionCookies(store, refreshed);
      return { user: refreshed.user, accessToken: refreshed.accessToken };
    } catch {
      // refresh failed, treat as logged out
      clearSessionCookies(store);
    }
  }

  return null;
}

/**
 * Get just the access token for a logged-in user, or null.
 * Used in API routes that need to call InsForge on behalf of the user.
 */
export async function getAccessTokenOrNull(): Promise<string | null> {
  const session = await getSessionUser();
  return session?.accessToken ?? null;
}

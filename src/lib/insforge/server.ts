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

function isWritable(store: CookieStoreLike): store is WritableCookieStore {
  return typeof (store as WritableCookieStore).set === "function";
}

/**
 * Write the session tokens into our httpOnly cookies. Call this after a
 * successful signUp / signInWithPassword / refreshSession.
 */
export function setSessionCookies(
  store: WritableCookieStore,
  session: { accessToken: string; refreshToken: string },
): void {
  const secure = process.env.NODE_ENV === "production";
  const common = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(ACCESS_COOKIE, session.accessToken, {
    ...common,
    maxAge: ACCESS_MAX_AGE,
  });
  store.set(REFRESH_COOKIE, session.refreshToken, {
    ...common,
    maxAge: REFRESH_MAX_AGE,
  });
}

/** Clear session cookies (logout). */
export function clearSessionCookies(store: WritableCookieStore): void {
  store.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
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

  // Slow path: try refresh
  if (refresh) {
    try {
      const refreshed = await refreshSession(refresh);
      if (isWritable(store)) {
        setSessionCookies(store, refreshed);
      }
      return { user: refreshed.user, accessToken: refreshed.accessToken };
    } catch {
      // refresh failed, treat as logged out
      if (isWritable(store)) {
        clearSessionCookies(store);
      }
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

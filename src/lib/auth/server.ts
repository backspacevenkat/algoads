/**
 * Server-side auth on Cloudflare D1 (replaces InsForge auth).
 *
 * A session is a random 32-byte token in an httpOnly cookie on our own
 * domain. D1 stores only the SHA-256 of the token, so a database leak does
 * not hand out live sessions. Sessions last 30 days; there is no separate
 * access/refresh pair any more, so server components never need to write
 * cookies.
 *
 * Passwords: users carried over from InsForge have bcrypt hashes ($2b$10$).
 * We verify those with bcryptjs and, on a successful sign-in, replace them
 * with PBKDF2-SHA256 from WebCrypto, which runs natively in Workers instead
 * of burning CPU in JavaScript. New passwords are PBKDF2 from the start.
 */
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "algoads_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// Workers caps WebCrypto PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000;

export interface AppUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  name?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  user: AppUser;
  token: string;
}

export class AuthError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface UserRow {
  id: string;
  email: string;
  password: string | null;
  email_verified: number;
  name: string | null;
  created_at: string;
  updated_at: string;
}

function db(): D1Database {
  return getCloudflareContext().env.DB;
}

function toUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    emailVerified: !!row.email_verified,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── hashing helpers ──────────────────────────────────────────────────

function base64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(plain: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashSecret(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(plain, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64Url(salt)}$${base64Url(hash)}`;
}

async function verifySecret(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) return bcrypt.compare(plain, stored);
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(plain, fromBase64Url(salt), Number(iter));
  return constantTimeEqual(actual, fromBase64Url(hash));
}

// ─── sessions ─────────────────────────────────────────────────────────

async function createSession(user: AppUser): Promise<Session> {
  const token = base64Url(randomBytes(32));
  const now = Date.now();
  await db()
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), user.id, now + SESSION_MAX_AGE * 1000, now)
    .run();
  return { user, token };
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  return db().prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
}

/** Sign up a new user with email/password. Returns the new session. */
export async function signUp(email: string, passwordInput: string, name?: string): Promise<Session> {
  if (await findUserByEmail(email)) {
    throw new AuthError(409, "An account with this email already exists");
  }
  const row = await db()
    .prepare("INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(crypto.randomUUID(), email, await hashSecret(passwordInput), name ?? null)
    .first<UserRow>();
  if (!row) throw new AuthError(500, "Could not create account");
  return createSession(toUser(row));
}

/** Sign in an existing user with email/password. */
export async function signInWithPassword(email: string, passwordInput: string): Promise<Session> {
  const row = await findUserByEmail(email);
  // Users who only ever signed in with Google have no password.
  if (!row?.password || !(await verifySecret(passwordInput, row.password))) {
    throw new AuthError(401, "Invalid email or password");
  }
  if (row.password.startsWith("$2")) {
    await db()
      .prepare("UPDATE users SET password = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
      .bind(await hashSecret(passwordInput), row.id)
      .run();
  }
  return createSession(toUser(row));
}

/**
 * Sign in (or sign up) with a Google identity that Google itself just
 * returned from the token endpoint. Matches on the Google account id first,
 * then links an existing account with the same verified email.
 */
export async function signInWithGoogle(profile: {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}): Promise<Session> {
  const linked = await db()
    .prepare(
      "SELECT u.* FROM user_providers p JOIN users u ON u.id = p.user_id WHERE p.provider = 'google' AND p.provider_account_id = ?",
    )
    .bind(profile.sub)
    .first<UserRow>();
  if (linked) return createSession(toUser(linked));

  if (!profile.emailVerified) throw new AuthError(403, "Google account email is not verified");

  let row = await findUserByEmail(profile.email);
  if (!row) {
    row = await db()
      .prepare("INSERT INTO users (id, email, email_verified, name) VALUES (?, ?, 1, ?) RETURNING *")
      .bind(crypto.randomUUID(), profile.email, profile.name ?? null)
      .first<UserRow>();
    if (!row) throw new AuthError(500, "Could not create account");
  }
  await db()
    .prepare("INSERT INTO user_providers (id, user_id, provider, provider_account_id) VALUES (?, ?, 'google', ?)")
    .bind(crypto.randomUUID(), row.id, profile.sub)
    .run();
  return createSession(toUser(row));
}

// ─── cookies ──────────────────────────────────────────────────────────

interface WritableCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
}

/** Write the session cookie. Call after signUp / signInWithPassword / signInWithGoogle. */
export function setSessionCookies(store: WritableCookieStore, session: Session): void {
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** End the session in D1 and clear the cookie (logout). */
export async function destroySession(store: WritableCookieStore): Promise<void> {
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256Hex(token)).run();
  }
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Get the current authenticated user from the session cookie, or null.
 *
 *   const session = await getSessionUser();
 *   if (!session) redirect('/login');
 */
export async function getSessionUser(): Promise<{ user: AppUser } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db()
    .prepare(
      "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?",
    )
    .bind(await sha256Hex(token), Date.now())
    .first<UserRow>();
  return row ? { user: toUser(row) } : null;
}

export { SESSION_COOKIE };

-- AlgoAds on Cloudflare D1. Replaces InsForge auth + the google_ads_connections table.
-- User ids are kept from InsForge so existing rows still point at the right person.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  -- "$2b$..." (bcrypt, carried over from InsForge) or "pbkdf2$<iterations>$<salt>$<hash>".
  -- Bcrypt hashes are replaced with PBKDF2 on the user's next successful sign-in.
  password TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE user_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, provider_account_id)
);

-- id is the SHA-256 of the session token; the token itself only lives in the user's cookie.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE google_ads_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  login_customer_id TEXT,
  account_name TEXT,
  connected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

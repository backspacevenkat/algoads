// Bindings from wrangler.jsonc. Hand-written rather than `wrangler types`, whose full runtime
// typings replace the DOM fetch/Response types the client components rely on.
import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
  type D1Database = import("@cloudflare/workers-types").D1Database;
}

export {};

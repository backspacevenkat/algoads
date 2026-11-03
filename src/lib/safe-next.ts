/**
 * Post-login redirect targets come from the query string, so they must stay
 * on our own origin. Browsers treat "\" like "/", so "/\evil.com" would become
 * "//evil.com"; resolving against a fixed base and comparing origins catches
 * that and every other trick the prefix checks miss.
 */
const BASE = "https://algoads.invalid";

export function safeNextPath(next: string | null | undefined, fallback = "/campaigns"): string {
  if (!next || !next.startsWith("/") || /[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, BASE);
    // "/..//evil.com" normalizes to the path "//evil.com", which is protocol-relative.
    if (url.origin !== BASE || url.pathname.startsWith("//")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

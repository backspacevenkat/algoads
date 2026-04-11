/**
 * POST /api/auth — password login endpoint.
 *
 * Takes { password: string }, compares against ALGOADS_ADMIN_PASSWORD,
 * and on match sets an `algoads_session` cookie = sha256(password).
 *
 * The proxy.ts then checks this cookie on every protected request.
 *
 * Note: we hash the password before storing it in the cookie so the raw
 * password never lives in browser storage. The comparison is a fixed-string
 * match — not bcrypt/argon — because this is a single-user personal tool,
 * not a multi-tenant SaaS. Revisit if that changes.
 */
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  try {
    const { password } = (await req.json()) as { password?: string };
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "missing_password" }, { status: 400 });
    }

    const expected = process.env.ALGOADS_ADMIN_PASSWORD;
    if (!expected) {
      log.warn({
        route: "POST /api/auth",
        event: "no_password_configured",
      });
      return NextResponse.json(
        { error: "no_password_configured", message: "Set ALGOADS_ADMIN_PASSWORD" },
        { status: 500 },
      );
    }

    if (password !== expected) {
      log.warn({ route: "POST /api/auth", event: "bad_password" });
      return NextResponse.json(
        { error: "bad_password", message: "Invalid password" },
        { status: 401 },
      );
    }

    const sessionValue = await sha256Hex(password);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("algoads_session", sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    log.info({ route: "POST /api/auth", event: "login_success" });
    return res;
  } catch (e) {
    log.error({
      route: "POST /api/auth",
      event: "login_failed",
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// Simple logout: clear the cookie
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("algoads_session", "", { path: "/", maxAge: 0 });
  return res;
}

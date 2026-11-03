import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth/server";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  await destroySession(store);
  log.info({ route: "POST /api/auth/logout", event: "logout_success" });
  return NextResponse.json({ ok: true });
}

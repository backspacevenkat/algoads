/**
 * Thin helpers for Next.js route handlers.
 * Centralises error mapping so we don't repeat try/catch boilerplate.
 */
import { NextResponse } from "next/server";
import { GoogleAdsApiError } from "./google-ads/types";

export function jsonError(e: unknown, fallbackStatus = 500): NextResponse {
  if (e instanceof GoogleAdsApiError) {
    return NextResponse.json(
      {
        error: "google_ads_api_error",
        message: e.message,
        status: e.status,
        trigger: e.trigger,
        details: e.body,
      },
      { status: e.status || fallbackStatus },
    );
  }
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: "server_error", message }, { status: fallbackStatus });
}

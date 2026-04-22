/**
 * GET /api/youtube/resolve?url=...
 *
 * Resolves a YouTube channel URL, handle, or username to a channel ID.
 * Supports:
 *   - https://www.youtube.com/@AlgoThinker
 *   - https://www.youtube.com/channel/UCaw8tzC_jq1gKvGCeSvnDQQ
 *   - https://www.youtube.com/c/SomeChannel
 *   - @AlgoThinker (handle only)
 *   - UCaw8tzC_jq1gKvGCeSvnDQQ (raw channel ID)
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { youtubeApiFetch } from "@/lib/youtube/client";
import { jsonError } from "@/lib/api-utils";
import type { YouTubeChannel, YouTubeListResponse } from "@/lib/youtube/types";

export const dynamic = "force-dynamic";

function extractFromUrl(input: string): { type: "id" | "handle" | "user"; value: string } | null {
  const trimmed = input.trim();

  // Raw channel ID: starts with UC and is 24 chars
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // Handle: @something
  if (trimmed.startsWith("@")) {
    return { type: "handle", value: trimmed };
  }

  // URL patterns
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const path = url.pathname;

    // /channel/UCxxxxxxxx
    const channelMatch = path.match(/^\/channel\/(UC[\w-]{22})/);
    if (channelMatch) return { type: "id", value: channelMatch[1] };

    // /@handle
    const handleMatch = path.match(/^\/@([\w.-]+)/);
    if (handleMatch) return { type: "handle", value: `@${handleMatch[1]}` };

    // /c/customname or /user/username
    const customMatch = path.match(/^\/(c|user)\/([\w.-]+)/);
    if (customMatch) return { type: "user", value: customMatch[2] };
  } catch {
    // Not a URL, try as handle
    if (/^[\w.-]+$/.test(trimmed)) {
      return { type: "handle", value: `@${trimmed}` };
    }
  }

  return null;
}

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  const url = new URL(req.url);
  const input = url.searchParams.get("url");
  if (!input) {
    return NextResponse.json({ error: "missing_url", message: "Provide a ?url= parameter" }, { status: 400 });
  }

  const parsed = extractFromUrl(input);
  if (!parsed) {
    return NextResponse.json(
      { error: "invalid_url", message: "Could not parse YouTube channel URL. Try @handle, channel URL, or channel ID." },
      { status: 400 },
    );
  }

  try {
    let params: Record<string, string>;
    switch (parsed.type) {
      case "id":
        params = { part: "snippet,statistics", id: parsed.value };
        break;
      case "handle":
        params = { part: "snippet,statistics", forHandle: parsed.value };
        break;
      case "user":
        params = { part: "snippet,statistics", forUsername: parsed.value };
        break;
    }

    const resp = await youtubeApiFetch<YouTubeListResponse<YouTubeChannel>>(
      "channels",
      auth.googleAdsCreds,
      params,
    );

    if (!resp.items?.length) {
      return NextResponse.json(
        { error: "not_found", message: `No channel found for "${input}"` },
        { status: 404 },
      );
    }

    const ch = resp.items[0];
    return NextResponse.json({
      id: ch.id,
      name: ch.snippet.title,
      customUrl: ch.snippet.customUrl,
      thumbnail: ch.snippet.thumbnails.medium?.url ?? ch.snippet.thumbnails.default?.url,
      subscriberCount: Number(ch.statistics.subscriberCount),
    });
  } catch (e) {
    return jsonError(e);
  }
}

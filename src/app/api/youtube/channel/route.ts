/**
 * GET /api/youtube/channel
 *
 * Returns the authenticated user's YouTube channel stats.
 *
 * Handles both personal channels AND Brand Account channels:
 * 1. Try `mine=true` (personal channel)
 * 2. If no results, try `managedByMe=true` (Brand Account channels)
 * 3. If a `channelId` query param is provided, fetch that specific channel
 *
 * Query params:
 *   channelId (optional) — fetch a specific channel by ID
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { youtubeApiFetch } from "@/lib/youtube/client";
import { jsonError } from "@/lib/api-utils";
import type { YouTubeChannel, YouTubeListResponse } from "@/lib/youtube/types";

export const dynamic = "force-dynamic";

function formatChannel(ch: YouTubeChannel) {
  return {
    id: ch.id,
    name: ch.snippet.title,
    customUrl: ch.snippet.customUrl,
    description: ch.snippet.description,
    thumbnail: ch.snippet.thumbnails.medium?.url ?? ch.snippet.thumbnails.default?.url,
    publishedAt: ch.snippet.publishedAt,
    subscriberCount: Number(ch.statistics.subscriberCount),
    viewCount: Number(ch.statistics.viewCount),
    videoCount: Number(ch.statistics.videoCount),
    hiddenSubscriberCount: ch.statistics.hiddenSubscriberCount,
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
  };
}

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");

  try {
    // If a specific channel ID is requested, fetch it directly
    if (channelId) {
      const resp = await youtubeApiFetch<YouTubeListResponse<YouTubeChannel>>(
        "channels",
        auth.googleAdsCreds,
        { part: "snippet,statistics,contentDetails", id: channelId },
      );
      if (!resp.items || resp.items.length === 0) {
        return NextResponse.json(
          { error: "no_channel", message: `Channel ${channelId} not found.` },
          { status: 404 },
        );
      }
      return NextResponse.json(formatChannel(resp.items[0]));
    }

    // Step 1: Try personal channel (mine=true)
    const mineResp = await youtubeApiFetch<YouTubeListResponse<YouTubeChannel>>(
      "channels",
      auth.googleAdsCreds,
      { part: "snippet,statistics,contentDetails", mine: "true" },
    );

    if (mineResp.items && mineResp.items.length > 0) {
      // If there are multiple channels, return all of them
      if (mineResp.items.length > 1) {
        return NextResponse.json({
          channels: mineResp.items.map(formatChannel),
          selected: formatChannel(mineResp.items[0]),
        });
      }
      return NextResponse.json(formatChannel(mineResp.items[0]));
    }

    // Step 2: Try Brand Account channels (managedByMe=true)
    const managedResp = await youtubeApiFetch<YouTubeListResponse<YouTubeChannel>>(
      "channels",
      auth.googleAdsCreds,
      { part: "snippet,statistics,contentDetails", managedByMe: "true" },
    );

    if (managedResp.items && managedResp.items.length > 0) {
      // Return all managed channels so the user can pick
      if (managedResp.items.length > 1) {
        return NextResponse.json({
          channels: managedResp.items.map(formatChannel),
          selected: formatChannel(managedResp.items[0]),
        });
      }
      return NextResponse.json(formatChannel(managedResp.items[0]));
    }

    return NextResponse.json(
      {
        error: "no_channel",
        message:
          "No YouTube channel found. This can happen if your channel is a Brand Account — try reconnecting at /api/oauth/google-ads/start and selecting the correct channel during the Google consent flow.",
      },
      { status: 404 },
    );
  } catch (e) {
    return jsonError(e);
  }
}

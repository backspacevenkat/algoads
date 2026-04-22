/**
 * GET /api/youtube/channel
 *
 * Returns the authenticated user's YouTube channel stats:
 * name, thumbnail, subscriber count, view count, video count.
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { youtubeApiFetch } from "@/lib/youtube/client";
import { jsonError } from "@/lib/api-utils";
import type { YouTubeChannel, YouTubeListResponse } from "@/lib/youtube/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  try {
    const resp = await youtubeApiFetch<YouTubeListResponse<YouTubeChannel>>(
      "channels",
      auth.googleAdsCreds,
      { part: "snippet,statistics,contentDetails", mine: "true" },
    );

    if (!resp.items || resp.items.length === 0) {
      return NextResponse.json(
        { error: "no_channel", message: "No YouTube channel found for this Google account." },
        { status: 404 },
      );
    }

    const ch = resp.items[0];
    return NextResponse.json({
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
    });
  } catch (e) {
    return jsonError(e);
  }
}

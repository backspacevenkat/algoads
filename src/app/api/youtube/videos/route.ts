/**
 * GET /api/youtube/videos
 *
 * Returns the user's uploaded videos with per-video stats.
 *
 * Pipeline:
 * 1. channels.list → get uploads playlist ID
 * 2. playlistItems.list → get video IDs (up to 50)
 * 3. videos.list → get stats + snippet + duration for each video
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { youtubeApiFetch } from "@/lib/youtube/client";
import { jsonError } from "@/lib/api-utils";
import type {
  YouTubeChannel,
  YouTubePlaylistItem,
  YouTubeVideo,
  YouTubeListResponse,
} from "@/lib/youtube/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  try {
    // Step 1: get the uploads playlist ID
    const channelResp = await youtubeApiFetch<YouTubeListResponse<YouTubeChannel>>(
      "channels",
      auth.googleAdsCreds,
      { part: "contentDetails", mine: "true" },
    );

    if (!channelResp.items?.length) {
      return NextResponse.json(
        { error: "no_channel", message: "No YouTube channel found." },
        { status: 404 },
      );
    }

    const uploadsId = channelResp.items[0].contentDetails.relatedPlaylists.uploads;

    // Step 2: get video IDs from the uploads playlist
    const playlistResp = await youtubeApiFetch<YouTubeListResponse<YouTubePlaylistItem>>(
      "playlistItems",
      auth.googleAdsCreds,
      { part: "snippet", playlistId: uploadsId, maxResults: "50" },
    );

    const videoIds = playlistResp.items.map((item) => item.snippet.resourceId.videoId);
    if (videoIds.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // Step 3: get full video details + stats
    const videosResp = await youtubeApiFetch<YouTubeListResponse<YouTubeVideo>>(
      "videos",
      auth.googleAdsCreds,
      {
        part: "statistics,snippet,contentDetails",
        id: videoIds.join(","),
      },
    );

    const videos = videosResp.items.map((v) => ({
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails.medium?.url ?? v.snippet.thumbnails.default?.url,
      duration: v.contentDetails.duration,
      viewCount: Number(v.statistics.viewCount),
      likeCount: Number(v.statistics.likeCount),
      commentCount: Number(v.statistics.commentCount),
    }));

    return NextResponse.json({ videos });
  } catch (e) {
    return jsonError(e);
  }
}

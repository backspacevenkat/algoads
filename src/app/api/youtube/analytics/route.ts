/**
 * GET /api/youtube/analytics
 *
 * Returns YouTube Analytics data for the channel or a specific video.
 *
 * Query params:
 *   - startDate (required): YYYY-MM-DD
 *   - endDate   (required): YYYY-MM-DD
 *   - videoId   (optional): filter to a specific video
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { youtubeAnalyticsFetch } from "@/lib/youtube/client";
import { jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const videoId = url.searchParams.get("videoId");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "missing_params", message: "startDate and endDate are required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  try {
    const params: Record<string, string> = {
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: "views,subscribersGained,estimatedMinutesWatched,likes,shares",
      dimensions: "day",
      sort: "day",
    };

    if (videoId) {
      params.filters = `video==${videoId}`;
    }

    const data = await youtubeAnalyticsFetch(auth.googleAdsCreds, params);

    // Transform into a friendlier shape
    const rows = (data.rows ?? []).map((row) => ({
      date: row[0] as string,
      views: row[1] as number,
      subscribersGained: row[2] as number,
      estimatedMinutesWatched: row[3] as number,
      likes: row[4] as number,
      shares: row[5] as number,
    }));

    return NextResponse.json({
      columnHeaders: data.columnHeaders,
      rows,
    });
  } catch (e) {
    return jsonError(e);
  }
}

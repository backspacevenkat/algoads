/**
 * /api/youtube/comments
 *
 * GET  — List comment threads for a video
 * POST — Reply to a comment
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { youtubeApiFetch } from "@/lib/youtube/client";
import { jsonError } from "@/lib/api-utils";
import type { YouTubeComment } from "@/lib/youtube/types";

export const dynamic = "force-dynamic";

// ─── Raw API response shapes ──────────────────────────────────────

interface RawCommentSnippet {
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  likeCount: number;
  publishedAt: string;
}

interface RawCommentThread {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: RawCommentSnippet;
    };
    totalReplyCount: number;
  };
  replies?: {
    comments: Array<{
      id: string;
      snippet: RawCommentSnippet;
    }>;
  };
}

interface CommentThreadListResponse {
  items: RawCommentThread[];
  nextPageToken?: string;
  pageInfo: { totalResults: number; resultsPerPage: number };
}

interface CommentInsertResponse {
  id: string;
  snippet: RawCommentSnippet & { parentId: string };
}

// ─── Helpers ──────────────────────────────────────────────────────

function mapComment(raw: { id: string; snippet: RawCommentSnippet }, totalReplyCount = 0): YouTubeComment {
  return {
    id: raw.id,
    authorDisplayName: raw.snippet.authorDisplayName,
    authorProfileImageUrl: raw.snippet.authorProfileImageUrl,
    textDisplay: raw.snippet.textDisplay,
    likeCount: raw.snippet.likeCount,
    publishedAt: raw.snippet.publishedAt,
    totalReplyCount,
  };
}

// ─── GET — list comment threads ───────────────────────────────────

export async function GET(req: Request) {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  const url = new URL(req.url);
  const videoId = url.searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json(
      { error: "missing_param", message: "videoId query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const resp = await youtubeApiFetch<CommentThreadListResponse>(
      "commentThreads",
      auth.googleAdsCreds,
      {
        part: "snippet,replies",
        videoId,
        maxResults: "50",
        order: "time",
      },
    );

    const comments: YouTubeComment[] = resp.items.map((thread) => {
      const comment = mapComment(
        thread.snippet.topLevelComment,
        thread.snippet.totalReplyCount,
      );

      if (thread.replies?.comments) {
        comment.replies = thread.replies.comments.map((r) => mapComment(r));
      }

      return comment;
    });

    return NextResponse.json({ comments });
  } catch (e) {
    return jsonError(e);
  }
}

// ─── POST — reply to a comment ────────────────────────────────────

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  let body: { parentId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected JSON body with parentId and text." },
      { status: 400 },
    );
  }

  const { parentId, text } = body;
  if (!parentId || !text) {
    return NextResponse.json(
      { error: "missing_fields", message: "parentId and text are required." },
      { status: 400 },
    );
  }

  try {
    // comments.insert requires posting to the YouTube Data API directly
    // since youtubeApiFetch is GET-only, we use the access token manually.
    const { getAccessToken } = await import("@/lib/google-ads/client");
    const token = await getAccessToken(auth.googleAdsCreds);

    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/comments?part=snippet",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            parentId,
            textOriginal: text,
          },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: "reply_failed", message: `Failed to post reply: ${errBody.slice(0, 300)}` },
        { status: res.status },
      );
    }

    const result = (await res.json()) as CommentInsertResponse;

    return NextResponse.json({
      id: result.id,
      text: result.snippet.textDisplay,
      authorDisplayName: result.snippet.authorDisplayName,
    });
  } catch (e) {
    return jsonError(e);
  }
}

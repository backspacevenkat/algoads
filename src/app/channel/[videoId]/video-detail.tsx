"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail?: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface AnalyticsRow {
  date: string;
  views: number;
  subscribersGained: number;
  estimatedMinutesWatched: number;
  likes: number;
  shares: number;
}

interface CommentData {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  likeCount: number;
  publishedAt: string;
  totalReplyCount: number;
  replies?: CommentData[];
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : "";
  const m = (match[2] ?? "0").padStart(h ? 2 : 1, "0");
  const s = (match[3] ?? "0").padStart(2, "0");
  return `${h}${m}:${s}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Strip HTML tags from YouTube comment text for safe rendering. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// ─── Mini bar chart (pure CSS, no deps) ──────────────────────────

function MiniBarChart({ data }: { data: AnalyticsRow[] }) {
  if (data.length === 0) return null;
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d) => {
          const height = Math.max((d.views / maxViews) * 100, 2);
          return (
            <div
              key={d.date}
              className="flex-1 bg-cyan-500/80 hover:bg-cyan-500 rounded-t-sm transition-colors cursor-default"
              style={{ height: `${height}%` }}
              title={`${d.date}: ${formatNumber(d.views)} views`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Comment component ───────────────────────────────────────────

function CommentItem({
  comment,
  onReply,
}: {
  comment: CommentData;
  onReply: (parentId: string, text: string) => Promise<void>;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  async function handleReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText("");
      setShowReplyInput(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-3">
      <Avatar className="size-8 flex-shrink-0">
        <AvatarImage src={comment.authorProfileImageUrl} alt={comment.authorDisplayName} />
        <AvatarFallback>{comment.authorDisplayName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.authorDisplayName}</span>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.publishedAt)}</span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap">
          {stripHtml(comment.textDisplay)}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {comment.likeCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ThumbsUp className="size-3" />
              {comment.likeCount}
            </span>
          )}
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            Reply
          </button>
        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div className="flex gap-2 mt-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="text-sm"
              disabled={sending}
            />
            <Button
              size="sm"
              onClick={handleReply}
              disabled={!replyText.trim() || sending}
              className="self-end"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Replies */}
        {comment.totalReplyCount > 0 && comment.replies && (
          <div className="mt-2">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 font-medium"
            >
              {showReplies ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {comment.totalReplyCount} {comment.totalReplyCount === 1 ? "reply" : "replies"}
            </button>
            {showReplies && (
              <div className="mt-2 space-y-3 pl-2 border-l-2 border-muted">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2">
                    <Avatar className="size-6 flex-shrink-0">
                      <AvatarImage src={reply.authorProfileImageUrl} alt={reply.authorDisplayName} />
                      <AvatarFallback>{reply.authorDisplayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{reply.authorDisplayName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(reply.publishedAt)}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 whitespace-pre-wrap">
                        {stripHtml(reply.textDisplay)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export function VideoDetail({ videoId }: { videoId: string }) {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Fetch video details, analytics, and comments in parallel
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [vidRes, analyticsRes, commentsRes] = await Promise.all([
        fetch("/api/youtube/videos"),
        fetch(`/api/youtube/analytics?videoId=${videoId}&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/youtube/comments?videoId=${videoId}`),
      ]);

      if (!vidRes.ok) {
        throw new Error("Failed to load video data");
      }

      const vidData = await vidRes.json();
      const found = (vidData.videos as VideoData[])?.find((v) => v.id === videoId);
      if (!found) {
        throw new Error("Video not found in your uploads");
      }
      setVideo(found);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData.rows ?? []);
      }

      if (commentsRes.ok) {
        const cData = await commentsRes.json();
        setComments(cData.comments ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load video");
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReply = async (parentId: string, text: string) => {
    const res = await fetch("/api/youtube/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, text }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? "Failed to post reply");
    }
    // Refresh comments after reply
    const commentsRes = await fetch(`/api/youtube/comments?videoId=${videoId}`);
    if (commentsRes.ok) {
      const cData = await commentsRes.json();
      setComments(cData.comments ?? []);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="aspect-video rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <p className="text-muted-foreground">{error ?? "Video not found"}</p>
          <Link href="/channel">
            <Button variant="outline" className="mt-4">
              Back to Channel
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const totalWatchMinutes = analytics.reduce((sum, r) => sum + r.estimatedMinutesWatched, 0);

  return (
    <div className="space-y-8">
      {/* Back link + title */}
      <div>
        <Link
          href="/channel"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Channel
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{formatDate(video.publishedAt)}</span>
          <span>·</span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            <Clock className="size-3 mr-1" />
            {formatDuration(video.duration)}
          </Badge>
        </div>
      </div>

      {/* Video embed */}
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
              Views
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-0.5 flex items-center gap-1.5">
              <Eye className="size-4 text-cyan-500" />
              {formatNumber(video.viewCount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
              Likes
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-0.5 flex items-center gap-1.5">
              <ThumbsUp className="size-4 text-cyan-500" />
              {formatNumber(video.likeCount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
              Comments
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-0.5 flex items-center gap-1.5">
              <MessageSquare className="size-4 text-cyan-500" />
              {formatNumber(video.commentCount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
              Watch Time
            </div>
            <div className="font-mono text-xl font-semibold tabular-nums mt-0.5 flex items-center gap-1.5">
              <Clock className="size-4 text-cyan-500" />
              {formatNumber(Math.round(totalWatchMinutes))}m
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics chart */}
      {analytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Daily Views (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={analytics} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Comments section */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight mb-4">
          Comments ({formatNumber(video.commentCount)})
        </h3>
        {comments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No comments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

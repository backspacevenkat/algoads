"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { Users, Eye, PlayCircle, Clock, ThumbsUp, MessageSquare } from "lucide-react";

interface ChannelData {
  id: string;
  name: string;
  customUrl?: string;
  thumbnail?: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

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

/** Parse ISO 8601 duration (PT#H#M#S) into a readable string. */
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center size-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-medium">
              {label}
            </div>
            <div className="font-mono text-xl font-semibold text-foreground tabular-nums">
              {value}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChannelDashboard() {
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [chRes, vidRes] = await Promise.all([
          fetch("/api/youtube/channel"),
          fetch("/api/youtube/videos"),
        ]);

        if (!chRes.ok) {
          const body = await chRes.json().catch(() => ({}));
          throw new Error(body.message ?? `Channel fetch failed (${chRes.status})`);
        }

        const chData = await chRes.json();
        setChannel(chData);

        if (vidRes.ok) {
          const vidData = await vidRes.json();
          setVideos(vidData.videos ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load channel data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure your Google account has a YouTube channel and you&apos;ve granted YouTube permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!channel) return null;

  return (
    <div className="space-y-8">
      {/* Channel header */}
      <div className="flex items-center gap-4">
        {channel.thumbnail && (
          <Image
            src={channel.thumbnail}
            alt={channel.name}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{channel.name}</h2>
          {channel.customUrl && (
            <p className="text-sm text-muted-foreground font-mono">{channel.customUrl}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Subscribers" value={formatNumber(channel.subscriberCount)} />
        <StatCard icon={Eye} label="Total Views" value={formatNumber(channel.viewCount)} />
        <StatCard icon={PlayCircle} label="Videos" value={formatNumber(channel.videoCount)} />
      </div>

      <Separator />

      {/* Videos list */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight mb-4">Recent Videos</h3>
        {videos.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No videos uploaded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {videos.map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex gap-4">
                      {v.thumbnail && (
                        <Image
                          src={v.thumbnail}
                          alt={v.title}
                          width={160}
                          height={90}
                          className="rounded-md object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold tracking-tight line-clamp-2">
                          {v.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{formatDate(v.publishedAt)}</span>
                          <span>·</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            <Clock className="size-3 mr-1" />
                            {formatDuration(v.duration)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="size-3" />
                            {formatNumber(v.viewCount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp className="size-3" />
                            {formatNumber(v.likeCount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {formatNumber(v.commentCount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

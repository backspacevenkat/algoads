/**
 * YouTube Data API v3 + Analytics API types.
 *
 * Only the subset we actually use — keeps things tight and avoids
 * pulling in the massive googleapis type package.
 */

// ─── Channel ───────────────────────────────────────────────────────

export interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
}

export interface YouTubeChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
  hiddenSubscriberCount: boolean;
}

export interface YouTubeChannelContentDetails {
  relatedPlaylists: {
    likes?: string;
    uploads: string;
  };
}

export interface YouTubeChannel {
  id: string;
  snippet: YouTubeChannelSnippet;
  statistics: YouTubeChannelStatistics;
  contentDetails: YouTubeChannelContentDetails;
}

// ─── Video ─────────────────────────────────────────────────────────

export interface YouTubeVideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
}

export interface YouTubeVideoStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeVideoContentDetails {
  duration: string; // ISO 8601 (PT#M#S)
}

export interface YouTubeVideo {
  id: string;
  snippet: YouTubeVideoSnippet;
  statistics: YouTubeVideoStatistics;
  contentDetails: YouTubeVideoContentDetails;
}

// ─── Playlist Items ────────────────────────────────────────────────

export interface YouTubePlaylistItem {
  snippet: {
    resourceId: { videoId: string };
    title: string;
    publishedAt: string;
  };
}

// ─── Analytics ─────────────────────────────────────────────────────

export interface YouTubeAnalyticsRow {
  /** Dimension values (e.g. date string) followed by metric values. */
  [index: number]: string | number;
}

export interface YouTubeAnalyticsResponse {
  kind: string;
  columnHeaders: Array<{
    name: string;
    columnType: string;
    dataType: string;
  }>;
  rows: YouTubeAnalyticsRow[];
}

// ─── API List Responses ────────────────────────────────────────────

export interface YouTubeListResponse<T> {
  items: T[];
  pageInfo: { totalResults: number; resultsPerPage: number };
  nextPageToken?: string;
}

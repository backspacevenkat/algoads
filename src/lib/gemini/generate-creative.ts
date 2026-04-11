/**
 * Gemini-powered creative generation from a YouTube video.
 *
 * Flow:
 * 1. Extract video ID from URL
 * 2. Fetch public metadata via YouTube oEmbed (no API key needed) + Data API v3 if key available
 * 3. Ask Gemini to write 5 headlines / 3 long headlines / 3 descriptions
 *    matching Demand Gen character limits
 * 4. Validate lengths and return structured output
 *
 * Character limits enforced by Demand Gen:
 * - headlines: max 40 chars
 * - long_headlines: max 90 chars
 * - descriptions: max 90 chars
 */
import { z } from "zod";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string;
}

export interface GeneratedCreative {
  headlines: string[]; // 5 items, each ≤ 40 chars
  longHeadlines: string[]; // 3 items, each ≤ 90 chars
  descriptions: string[]; // 3 items, each ≤ 90 chars
  businessName: string;
  callToAction: string;
}

const creativeSchema = z.object({
  headlines: z.array(z.string().max(40)).length(5),
  longHeadlines: z.array(z.string().max(90)).length(3),
  descriptions: z.array(z.string().max(90)).length(3),
  businessName: z.string().max(25),
  callToAction: z.string().max(15),
});

/** Extract the YouTube video ID from any common URL form. */
export function extractVideoId(url: string): string | null {
  // Raw ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  try {
    const u = new URL(url);
    // youtu.be/ID
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0];
    }
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return v;
    // youtube.com/embed/ID or /shorts/ID
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts") {
      return parts[1] ?? null;
    }
  } catch {
    // not a URL
  }
  return null;
}

/**
 * Fetch public video metadata. Uses oEmbed (no API key) which gives title,
 * author, thumbnail — enough for Gemini to write creative. If the full
 * Data API would give better results, we can add it later.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) {
    throw new Error(`YouTube oEmbed failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    title: string;
    author_name: string;
    thumbnail_url: string;
  };
  return {
    videoId,
    title: data.title,
    channelName: data.author_name,
    thumbnailUrl: data.thumbnail_url,
    description: undefined, // not available from oEmbed
  };
}

/**
 * Ask Gemini to generate Demand Gen creative given video metadata.
 * We ask for strict JSON output so we can Zod-validate the response.
 */
export async function generateCreativeWithGemini(
  metadata: YouTubeMetadata,
  brandHint?: string,
): Promise<GeneratedCreative> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const prompt = `You are writing Google Demand Gen ad creative for this YouTube video:

Title: ${metadata.title}
Channel: ${metadata.channelName}
${brandHint ? `Brand context: ${brandHint}\n` : ""}

Generate ad copy that would make an engineer or technically-curious viewer
click to watch. Be specific, concrete, and data-driven. Avoid clickbait.
Reference the actual subject matter of the video, not generic marketing fluff.

Return a JSON object with EXACTLY these keys and constraints:
- headlines: array of 5 strings, each MAX 40 characters (strict — count carefully)
- longHeadlines: array of 3 strings, each MAX 90 characters
- descriptions: array of 3 strings, each MAX 90 characters
- businessName: channel name (max 25 chars)
- callToAction: one of "Watch now", "Learn more", "Explore" (max 15 chars)

Output ONLY the JSON object. No markdown fences, no commentary.`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 300)}`);
  }

  // Validate with Zod. If Gemini exceeds character limits, we truncate
  // rather than retry — this keeps the happy path fast.
  const result = creativeSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Fallback: truncate overly-long strings to fit limits
  const fallback = parsed as Partial<GeneratedCreative>;
  return {
    headlines: (fallback.headlines ?? []).slice(0, 5).map((h) => h.slice(0, 40)),
    longHeadlines: (fallback.longHeadlines ?? []).slice(0, 3).map((h) => h.slice(0, 90)),
    descriptions: (fallback.descriptions ?? []).slice(0, 3).map((d) => d.slice(0, 90)),
    businessName: (fallback.businessName ?? metadata.channelName).slice(0, 25),
    callToAction: (fallback.callToAction ?? "Watch now").slice(0, 15),
  };
}

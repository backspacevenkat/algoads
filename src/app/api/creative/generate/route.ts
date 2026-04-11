import { NextResponse } from "next/server";
import { z } from "zod";
import {
  extractVideoId,
  fetchYouTubeMetadata,
  generateCreativeWithGemini,
} from "@/lib/gemini/generate-creative";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const inputSchema = z.object({
  url: z.string().min(1),
  brandHint: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      log.warn({
        route: "POST /api/creative/generate",
        event: "validation_failed",
        issues: parsed.error.issues,
      });
      return NextResponse.json(
        { error: "invalid_input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const videoId = extractVideoId(parsed.data.url);
    if (!videoId) {
      return NextResponse.json(
        { error: "invalid_youtube_url", message: "Could not extract video ID" },
        { status: 400 },
      );
    }

    log.info({
      route: "POST /api/creative/generate",
      event: "generate_start",
      videoId,
    });

    const metadata = await fetchYouTubeMetadata(videoId);
    const creative = await generateCreativeWithGemini(metadata, parsed.data.brandHint);

    log.info({
      route: "POST /api/creative/generate",
      event: "generate_success",
      videoId,
      headlineCount: creative.headlines.length,
      ms: Date.now() - start,
    });

    return NextResponse.json({ metadata, creative });
  } catch (e) {
    log.error({
      route: "POST /api/creative/generate",
      event: "generate_failed",
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    });
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "generation_failed", message }, { status: 500 });
  }
}

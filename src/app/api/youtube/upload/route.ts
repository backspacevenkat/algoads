/**
 * POST /api/youtube/upload
 *
 * Uploads a video to YouTube using the resumable upload protocol.
 * Accepts multipart form data with the video file and metadata fields.
 *
 * The resumable protocol is used because Vercel serverless functions
 * have a 4.5 MB request body limit — with resumable upload, we stream
 * the file bytes directly to Google's upload endpoint.
 */
import { NextResponse } from "next/server";
import { getAuthContext, unauthorizedResponse, notConnectedResponse } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/google-ads/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large uploads

export async function POST(req: Request) {
  const auth = await getAuthContext();
  if (!auth.user) return unauthorizedResponse();
  if (!auth.googleAdsCreds) return notConnectedResponse();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected multipart form data." },
      { status: 400 },
    );
  }

  const videoFile = formData.get("video") as File | null;
  const title = formData.get("title") as string | null;
  const description = (formData.get("description") as string) ?? "";
  const tags = (formData.get("tags") as string) ?? "";
  const privacyStatus = (formData.get("privacyStatus") as string) ?? "public";
  const categoryId = (formData.get("categoryId") as string) ?? "28";

  if (!videoFile || !title) {
    return NextResponse.json(
      { error: "missing_fields", message: "video file and title are required." },
      { status: 400 },
    );
  }

  if (!["public", "unlisted", "private"].includes(privacyStatus)) {
    return NextResponse.json(
      { error: "invalid_privacy", message: "privacyStatus must be public, unlisted, or private." },
      { status: 400 },
    );
  }

  const token = await getAccessToken(auth.googleAdsCreds);

  // Build the video metadata
  const metadata = {
    snippet: {
      title,
      description,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      categoryId,
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  try {
    // Step 1: Initiate the resumable upload — POST metadata to get the upload URI
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(videoFile.size),
          "X-Upload-Content-Type": videoFile.type || "video/*",
        },
        body: JSON.stringify(metadata),
      },
    );

    if (!initRes.ok) {
      const errBody = await initRes.text();
      return NextResponse.json(
        { error: "upload_init_failed", message: `YouTube rejected upload init: ${errBody.slice(0, 300)}` },
        { status: initRes.status },
      );
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      return NextResponse.json(
        { error: "no_upload_url", message: "YouTube did not return a resumable upload URL." },
        { status: 502 },
      );
    }

    // Step 2: PUT the video bytes to the resumable upload URI
    const videoBuffer = await videoFile.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(videoFile.size),
        "Content-Type": videoFile.type || "video/*",
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return NextResponse.json(
        { error: "upload_failed", message: `Video upload failed: ${errBody.slice(0, 300)}` },
        { status: uploadRes.status },
      );
    }

    const result = await uploadRes.json();

    return NextResponse.json({
      videoId: result.id,
      url: `https://www.youtube.com/watch?v=${result.id}`,
      title: result.snippet?.title,
      status: result.status?.uploadStatus,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "upload_error", message },
      { status: 500 },
    );
  }
}

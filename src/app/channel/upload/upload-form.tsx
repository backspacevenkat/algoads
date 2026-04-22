"use client";

import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, CheckCircle, AlertCircle, Film, ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { id: "28", label: "Science & Technology" },
  { id: "27", label: "Education" },
  { id: "24", label: "Entertainment" },
  { id: "22", label: "People & Blogs" },
  { id: "25", label: "News & Politics" },
  { id: "20", label: "Gaming" },
  { id: "10", label: "Music" },
  { id: "26", label: "How-to & Style" },
] as const;

interface UploadResult {
  videoId: string;
  url: string;
  title: string;
}

export function UploadForm() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState("public");
  const [categoryId, setCategoryId] = useState("28");
  const [isShort, setIsShort] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setProgress(0);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const videoFile = formData.get("video") as File | null;
    if (!videoFile || videoFile.size === 0) {
      setError("Please select a video file.");
      return;
    }

    const title = formData.get("title") as string;
    if (!title?.trim()) {
      setError("Title is required.");
      return;
    }

    // Build the upload payload
    const payload = new FormData();
    payload.append("video", videoFile);
    payload.append("title", title.trim());
    payload.append("description", (formData.get("description") as string) ?? "");
    payload.append("tags", (formData.get("tags") as string) ?? "");
    payload.append("privacyStatus", privacyStatus);
    payload.append("categoryId", categoryId);
    payload.append("isShort", String(isShort));

    setUploading(true);

    try {
      // Use XMLHttpRequest for upload progress tracking
      const response = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/youtube/upload");

        xhr.upload.addEventListener("progress", (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data as UploadResult);
            } else {
              reject(new Error(data.message ?? `Upload failed (${xhr.status})`));
            }
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

        xhr.send(payload);
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-green-50 text-green-600 mx-auto">
            <CheckCircle className="size-6" />
          </div>
          <h3 className="text-lg font-semibold">Upload Complete</h3>
          <p className="text-muted-foreground">{result.title}</p>
          <div className="flex items-center justify-center gap-3">
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              <Button>View on YouTube</Button>
            </a>
            <Link href={`/channel/${result.videoId}`}>
              <Button variant="outline">View Details</Button>
            </Link>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setResult(null);
              setProgress(0);
              setFileName(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            Upload Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/channel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Channel
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="size-5" />
            Video Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video file */}
            <div className="space-y-2">
              <Label htmlFor="video">Video File</Label>
              <div className="relative">
                <Input
                  ref={fileRef}
                  id="video"
                  name="video"
                  type="file"
                  accept="video/*"
                  required
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFileName(file ? file.name : null);
                  }}
                />
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground">
                  Selected: {fileName}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Video title"
                required
                maxLength={100}
                disabled={uploading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Video description (optional)"
                rows={4}
                disabled={uploading}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="tag1, tag2, tag3"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>

            {/* Privacy + Category row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Privacy</Label>
                <Select value={privacyStatus} onValueChange={(v) => v && setPrivacyStatus(v)} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Shorts toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="isShort"
                checked={isShort}
                onCheckedChange={setIsShort}
                disabled={uploading}
              />
              <Label htmlFor="isShort" className="cursor-pointer">
                This is a Short
              </Label>
              {isShort && (
                <Badge variant="secondary" className="text-[10px]">
                  Vertical, under 60s
                </Badge>
              )}
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Upload Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-mono tabular-nums">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="size-4 mr-2" />
                  Upload to YouTube
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

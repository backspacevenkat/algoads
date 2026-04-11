"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Rocket, Loader2, ArrowRight } from "lucide-react";

type Step = "url" | "review" | "launching" | "done";

interface YouTubeMeta {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

interface Creative {
  headlines: string[];
  longHeadlines: string[];
  descriptions: string[];
  businessName: string;
  callToAction: string;
}

export function LaunchFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [brandHint, setBrandHint] = useState("");
  const [budget, setBudget] = useState("5");
  const [durationDays, setDurationDays] = useState("7");

  const [generating, setGenerating] = useState(false);
  const [meta, setMeta] = useState<YouTubeMeta | null>(null);
  const [creative, setCreative] = useState<Creative | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const [launching, setLaunching] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, brandHint: brandHint || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      setMeta(data.metadata);
      setCreative(data.creative);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/png;base64," prefix
      const base64 = result.split(",")[1] ?? "";
      setLogoBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleLaunch() {
    if (!meta || !creative || !logoBase64) {
      setError("Missing video metadata, creative, or logo image");
      return;
    }
    setError(null);
    setLaunching(true);
    setStep("launching");
    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: `${creative.businessName}_${meta.videoId}`,
          dailyBudgetUsd: parseFloat(budget),
          durationDays: parseInt(durationDays, 10),
          adGroupName: "InFeed_TechGeos",
          targetCpcMicros: 50_000, // $0.05
          videoId: meta.videoId,
          finalUrl: `https://www.youtube.com/watch?v=${meta.videoId}`,
          businessName: creative.businessName,
          headlines: creative.headlines,
          longHeadlines: creative.longHeadlines,
          descriptions: creative.descriptions,
          logoImageBase64: logoBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      setCreatedCampaignId(data.campaignId);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
      setStep("review");
    } finally {
      setLaunching(false);
    }
  }

  function updateCreativeField<K extends keyof Creative>(key: K, value: Creative[K]) {
    if (!creative) return;
    setCreative({ ...creative, [key]: value });
  }

  // ─── STEP 1: URL input ─────────────────────────────────────────────
  if (step === "url") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">YouTube video</CardTitle>
          <CardDescription>
            Paste any YouTube URL. We&apos;ll fetch metadata and ask Gemini to write the ad copy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Video URL or ID</Label>
              <Input
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-hint">
                Brand hint (optional)
                <span className="text-muted-foreground font-normal ml-2">
                  Describe the angle or audience
                </span>
              </Label>
              <Textarea
                id="brand-hint"
                placeholder="e.g. Technical deep-dives for senior engineers. Avoid clickbait."
                value={brandHint}
                onChange={(e) => setBrandHint(e.target.value)}
                rows={3}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={generating || !url} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating creative…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate creative with Gemini
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP 2: Review + launch ────────────────────────────────────────
  if ((step === "review" || step === "launching") && meta && creative) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.thumbnailUrl}
              alt={meta.title}
              className="w-40 aspect-video object-cover rounded-md border border-border"
            />
            <div className="flex-1">
              <div className="font-medium">{meta.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{meta.channelName}</div>
              <Badge variant="secondary" className="mt-2 font-mono text-xs">
                {meta.videoId}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ad creative</CardTitle>
            <CardDescription>Edit anything before launching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreativeList
              label="Headlines (max 40 chars each)"
              items={creative.headlines}
              onChange={(items) => updateCreativeField("headlines", items)}
              maxLength={40}
            />
            <Separator />
            <CreativeList
              label="Long headlines (max 90 chars each)"
              items={creative.longHeadlines}
              onChange={(items) => updateCreativeField("longHeadlines", items)}
              maxLength={90}
            />
            <Separator />
            <CreativeList
              label="Descriptions (max 90 chars each)"
              items={creative.descriptions}
              onChange={(items) => updateCreativeField("descriptions", items)}
              maxLength={90}
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business name (max 25)</Label>
                <Input
                  value={creative.businessName}
                  maxLength={25}
                  onChange={(e) => updateCreativeField("businessName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Call to action</Label>
                <Input
                  value={creative.callToAction}
                  onChange={(e) => updateCreativeField("callToAction", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget &amp; logo</CardTitle>
            <CardDescription>
              Campaign launches PAUSED — enable from the dashboard when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Daily budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="1"
                  step="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">
                Logo image (square, min 300×300 PNG or JPG, max 5MB)
              </Label>
              <Input
                id="logo"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
              />
              {logoFile && (
                <p className="text-xs text-muted-foreground">
                  {logoFile.name} — {(logoFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Launch failed</AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setStep("url")}>
            Back
          </Button>
          <Button onClick={handleLaunch} disabled={launching || !logoBase64}>
            {launching ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Launching…
              </>
            ) : (
              <>
                <Rocket className="size-4" />
                Launch campaign (PAUSED)
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ─── STEP 3: Done ───────────────────────────────────────────────────
  if (step === "done" && createdCampaignId) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Rocket className="size-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Campaign created</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Campaign ID{" "}
              <span className="font-mono">{createdCampaignId}</span> is PAUSED and ready
              for review.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setStep("url");
                setUrl("");
                setMeta(null);
                setCreative(null);
                setCreatedCampaignId(null);
                setLogoFile(null);
                setLogoBase64(null);
              }}
            >
              Launch another
            </Button>
            <Button onClick={() => router.push(`/campaigns/${createdCampaignId}`)}>
              View campaign
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

function CreativeList({
  label,
  items,
  onChange,
  maxLength,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxLength: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={item}
            maxLength={maxLength}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <span className="text-xs text-muted-foreground font-mono w-12 text-right">
            {item.length}/{maxLength}
          </span>
        </div>
      ))}
    </div>
  );
}

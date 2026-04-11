"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";

interface Props {
  campaignId: string;
  currentStatus: string;
  channelType: string;
}

export function CampaignActions({ campaignId, currentStatus, channelType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<string | null>(null);

  // Legacy VIDEO campaigns are read-only via API — don't show action buttons
  const isReadOnly = channelType === "VIDEO";

  async function toggleStatus() {
    setError(null);
    const target = currentStatus === "ENABLED" ? "pause" : "enable";
    const optimisticNext = target === "pause" ? "PAUSED" : "ENABLED";
    setOptimistic(optimisticNext);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/${target}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      setOptimistic(null);
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (isReadOnly) {
    return (
      <div className="text-xs text-muted-foreground max-w-xs text-right">
        Legacy Video campaigns are read-only via API. Manage in the Google Ads UI.
      </div>
    );
  }

  const displayStatus = optimistic ?? currentStatus;

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={toggleStatus} disabled={isPending} variant="outline">
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : displayStatus === "ENABLED" ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
        {displayStatus === "ENABLED" ? "Pause" : "Enable"}
      </Button>
      {error && (
        <p className="text-xs text-destructive font-mono max-w-xs break-all">
          {error}
        </p>
      )}
    </div>
  );
}

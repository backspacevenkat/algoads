import { LaunchFlow } from "./launch-flow";

export const metadata = {
  title: "Launch campaign — AlgoAds",
};

export default function LaunchPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Launch new campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a YouTube URL, review the AI-generated creative, and launch a retention-safe
          Demand Gen campaign — all in one flow.
        </p>
      </div>
      <LaunchFlow />
    </div>
  );
}

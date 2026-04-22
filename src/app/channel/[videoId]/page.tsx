import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { VideoDetail } from "./video-detail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Details",
};

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth.user) redirect("/login?next=/channel");

  const { videoId } = await params;

  return (
    <div className="space-y-8">
      <VideoDetail videoId={videoId} />
    </div>
  );
}

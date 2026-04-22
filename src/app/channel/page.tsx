import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { ChannelDashboard } from "./channel-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Channel",
};

export default async function ChannelPage() {
  const auth = await getAuthContext();
  if (!auth.user) redirect("/login?next=/channel");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Channel</h1>
        <p className="text-[15px] text-muted-foreground mt-2">
          Your YouTube channel stats and recent uploads
        </p>
      </div>
      <ChannelDashboard />
    </div>
  );
}

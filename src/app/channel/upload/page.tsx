import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Upload Video",
};

export default async function UploadPage() {
  const auth = await getAuthContext();
  if (!auth.user) redirect("/login?next=/channel/upload");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Video</h1>
        <p className="text-[15px] text-muted-foreground mt-2">
          Upload a video directly to your YouTube channel
        </p>
      </div>
      <UploadForm />
    </div>
  );
}

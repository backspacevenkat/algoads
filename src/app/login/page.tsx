import Link from "next/link";
import { LoginForm } from "./login-form";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const targetNext = next ?? "/campaigns";
  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Sign in</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Welcome back. Sign in to manage your campaigns.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="text-xs font-mono">{error}</AlertDescription>
        </Alert>
      )}

      <GoogleAuthButton label="Sign in with Google" next={targetNext} />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <LoginForm next={targetNext} />

      <p className="text-sm text-muted-foreground mt-6 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-cyan-700 hover:text-cyan-600 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}

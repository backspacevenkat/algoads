import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Sign in</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Welcome back. Sign in to manage your campaigns.
      </p>
      <LoginForm next={next ?? "/campaigns"} />
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-cyan-400 hover:text-cyan-300">
          Sign up
        </Link>
      </p>
    </div>
  );
}

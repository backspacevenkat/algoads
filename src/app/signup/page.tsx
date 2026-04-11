import Link from "next/link";
import { SignupForm } from "./signup-form";
import { GoogleAuthButton } from "@/components/google-auth-button";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        Create your AlgoAds account
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Connect your own Google Ads account and launch retention-safe Demand
        Gen campaigns in minutes.
      </p>

      <GoogleAuthButton label="Sign up with Google" />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <SignupForm />

      <p className="text-sm text-muted-foreground mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}

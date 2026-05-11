"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const redirectTo = "https://credit-card-tracker-sigma.vercel.app/auth/callback";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMessage("Unable to sign in right now. Please try again.");
      setIsLoading(false);
      return;
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-900">
          Card Benefits Tracker
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600">
          Track your credit card benefits in one place
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="mt-8 flex w-full items-center justify-center rounded-lg bg-[#5B3DFF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4D33D9] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Signing in..." : "Sign in with Google"}
        </button>

        {errorMessage ? (
          <p className="mt-3 text-center text-sm text-red-600">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}

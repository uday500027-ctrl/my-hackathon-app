"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FieldErrors {
  email?: string[];
  password?: string[];
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorBanner, setErrorBanner] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setErrorBanner("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFieldErrors(data.errors as FieldErrors);
        } else {
          setErrorBanner(data.message ?? "Something went wrong.");
        }
        return;
      }

      router.push("/dashboard");
    } catch {
      setErrorBanner("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f4ef] px-4 py-12 dark:bg-neutral-950">
      {/* Wordmark linking to "/" */}
      <Link
        href="/"
        className="font-serif text-2xl font-bold tracking-tight text-neutral-900 transition-colors hover:text-[#2f5e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded dark:text-neutral-100"
      >
        PasteGuard
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-none space-y-6 mt-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-1 text-center">
          <h1 className="font-serif text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sign in
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Enter your email and password to access your dashboard
          </p>
        </div>

        {errorBanner && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          >
            {errorBanner}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-describedby={
                fieldErrors.email ? "login-email-error" : undefined
              }
              className="w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#2f5e3e] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
            {fieldErrors.email && (
              <p
                id="login-email-error"
                role="alert"
                className="text-xs text-red-600 dark:text-red-400"
              >
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
              className="w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#2f5e3e] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
            {fieldErrors.password && (
              <p
                id="login-password-error"
                role="alert"
                className="text-xs text-red-600 dark:text-red-400"
              >
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full inline-flex min-h-[40px] items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="space-y-3 pt-2 text-center text-xs">
          <p className="text-neutral-500 dark:text-neutral-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] rounded"
            >
              Create one
            </Link>
          </p>

          <p className="border-t border-neutral-100 pt-3 text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Judges: demo account details are in the README.
          </p>
        </div>
      </div>
    </div>
  );
}

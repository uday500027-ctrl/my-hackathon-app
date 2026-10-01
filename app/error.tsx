"use client";

import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: ErrorProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f4ef] px-4 py-12 dark:bg-neutral-950 dark:text-neutral-100">
      <Link
        href="/"
        className="font-serif text-2xl font-bold tracking-tight text-neutral-900 transition-colors hover:text-[#2f5e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded dark:text-neutral-100"
      >
        PasteGuard
      </Link>

      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-none space-y-5 mt-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            System Notice
          </p>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Something went wrong
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            An unexpected error occurred while processing your request. Please try again or return to the main page.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-accent inline-flex min-h-[40px] items-center justify-center rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

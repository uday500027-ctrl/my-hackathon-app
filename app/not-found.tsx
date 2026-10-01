import Link from "next/link";

export default function NotFound() {
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
            Error 404
          </p>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Page not found
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="btn-accent inline-flex min-h-[40px] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}

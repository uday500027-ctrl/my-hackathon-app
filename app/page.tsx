import Link from "next/link";
import { getSession } from "@/lib/auth";
import RedactionDemo from "@/components/landing/RedactionDemo";
import Reveal from "@/components/landing/Reveal";

const CATEGORIES = [
  "Email address",
  "Phone number",
  "Aadhaar number (with Verhoeff checksum)",
  "PAN",
  "UPI ID",
  "Credit / debit card number (with Luhn checksum)",
  "API keys and secrets",
  "IP address",
  "Passwords",
  "Custom terms you define",
  "Contextual business and credential risks via AI",
  "Documents (PDF, Word, text) and hidden prompt-injection instructions",
];

const GUARANTEES = [
  "Raw pasted text is never sent to the AI",
  "Raw text is never written to the database",
  "API keys never reach your browser",
  "AI output is validated before it is shown",
];

const STEPS = [
  {
    n: "1",
    heading: "Paste text and choose where it is going",
    body: "Select the destination — AI chatbot, external email, public post, or internal chat — so the risk score is calibrated correctly.",
  },
  {
    n: "2",
    heading: "Sensitive values are masked on the server",
    body: "Regex and checksum detectors run server-side. Emails, phone numbers, Aadhaar, cards, API keys, passwords and more are replaced with labelled placeholders.",
  },
  {
    n: "3",
    heading: "Review the risk score and copy the safe version",
    body: "Gemini evaluates only the masked text for contextual risks such as project names or business details. You see a score, findings, and a safe copy to paste.",
  },
];

/* Shared layout tokens */
const CONTAINER = "mx-auto w-full max-w-5xl px-6";
const SECTION_Y = "py-20";

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session;

  const primaryHref = isLoggedIn ? "/dashboard" : "/register";
  const primaryLabel = isLoggedIn ? "Open dashboard" : "Get started";

  return (
    <div className="flex min-h-full flex-col" style={{ backgroundColor: "var(--land-bg)", color: "#111110" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-[#f7f5f2]">
        <div className={`${CONTAINER} flex items-center justify-between py-4`}>
          <Link
            href="/"
            className="font-serif text-xl font-bold tracking-tight text-neutral-900 transition-colors hover:text-[#2f5e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded"
          >
            PasteGuard
          </Link>

          <nav className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="btn-accent rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section style={{ backgroundColor: "var(--land-bg)" }} className="py-16 md:py-24">
          <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
            {/* Left column: Text */}
            <div className="max-w-xl space-y-6">
              <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-neutral-900 md:text-5xl">
                Check what you paste before you send it.
              </h1>
              <p className="text-base leading-relaxed text-neutral-600 md:text-lg">
                PasteGuard masks personal data, keys and passwords on the
                server, then has Gemini review only the masked text for
                business and context risks — so your raw text is never exposed.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href={primaryHref}
                  className="btn-accent inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2"
                >
                  {primaryLabel}
                </Link>
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>

            {/* Right column: RedactionDemo */}
            <div className="flex items-center justify-center lg:justify-end">
              <RedactionDemo />
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="border-t border-neutral-200 bg-white">
          <div className={`${CONTAINER} ${SECTION_Y}`}>
            <Reveal>
              <h2 className="font-serif mb-12 text-2xl font-bold tracking-tight text-neutral-900">
                How it works
              </h2>
            </Reveal>
            <ol className="grid gap-10 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={i * 80}>
                  <li className="flex flex-col gap-4">
                    {/* Fixed-size circle: shrink-0 prevents any clipping */}
                    <div
                      className="step-circle flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      aria-hidden="true"
                    >
                      {step.n}
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900">
                      {step.heading}
                    </h3>
                    <p className="text-sm leading-relaxed text-neutral-600">
                      {step.body}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Privacy guarantees ────────────────────────────────────────── */}
        <section style={{ backgroundColor: "var(--land-bg)" }}>
          <div className={`${CONTAINER} ${SECTION_Y}`}>
            <Reveal>
              <h2 className="font-serif mb-3 text-2xl font-bold tracking-tight text-neutral-900">
                What PasteGuard never does
              </h2>
              <p className="mb-10 text-sm text-neutral-500">
                Privacy by design — not a disclaimer.
              </p>
            </Reveal>
            <ul className="grid gap-3 sm:grid-cols-2">
              {GUARANTEES.map((g, i) => (
                <Reveal key={g} delay={i * 60}>
                  <li className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3.5 text-sm text-neutral-700">
                    <span
                      className="guarantee-marker mt-0.5 flex-none text-xs font-bold"
                      aria-hidden="true"
                    >
                      ✗
                    </span>
                    {g}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ── What it detects ───────────────────────────────────────────── */}
        <section className="border-t border-neutral-200 bg-white">
          <div className={`${CONTAINER} ${SECTION_Y}`}>
            <Reveal>
              <h2 className="font-serif mb-10 text-2xl font-bold tracking-tight text-neutral-900">
                What it detects
              </h2>
            </Reveal>
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {CATEGORIES.map((cat, i) => (
                <Reveal key={cat} delay={i * 30}>
                  <li className="flex items-center gap-2.5 text-sm text-neutral-700">
                    <span
                      className="category-dot inline-block h-1.5 w-1.5 flex-none rounded-full"
                      aria-hidden="true"
                    />
                    {cat}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ── CTA band ──────────────────────────────────────────────────── */}
        <section style={{ backgroundColor: "var(--land-bg)" }}>
          <div className={`${CONTAINER} ${SECTION_Y} text-center`}>
            <Reveal>
              <h2 className="font-serif mb-4 text-2xl font-bold tracking-tight text-neutral-900">
                Ready to check before you send?
              </h2>
              <p className="mb-8 text-sm text-neutral-500">
                Free to use. No credit card required.
              </p>
              <Link
                href={primaryHref}
                className="btn-accent inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2"
              >
                {primaryLabel}
              </Link>
            </Reveal>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className={`${CONTAINER} flex flex-col items-center justify-between gap-4 py-8 sm:flex-row`}>
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="font-serif text-sm font-semibold text-neutral-700">
              PasteGuard
            </span>
            <span className="text-xs text-neutral-400">
              Check text before you send it
            </span>
          </div>
          <a
            href="https://github.com/uday500027-ctrl/my-hackathon-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded"
          >
            View on GitHub
          </a>
        </div>
      </footer>

    </div>
  );
}

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Brief

## What we're building
PasteGuard: a pre-send redaction and risk-check tool. Users paste text they are about to send to an AI chatbot, an external email, or a public post. The server masks sensitive values with deterministic detectors, then asks Gemini (backend only, JSON mode) to judge contextual risk on the MASKED text. The user gets a risk score, findings, a safe version to copy, and recommended actions.

Privacy by design (never break these):
- Raw pasted text is never sent to Gemini and never stored. Only masked text and findings are saved.
- Auth is custom: bcryptjs password hashes, JWT (jose) in an httpOnly cookie, Zod validation on every route.
- Supabase is accessed only from the server with the service role key. RLS is on for every table with no policies; ownership is enforced in the API by filtering on user_id from the session.
- If Gemini fails, return the deterministic result with ai_status "fallback".
- Scan route is rate limited (10 per minute per user, counted from the scans table).

## Features in priority order
Must-have, in this order:
1. Auth: register, login, logout, protected routes
2. Policies CRUD
3. Scan pipeline: detectors, masking, Gemini JSON analysis, fallback
4. Scan result view with copy-safe-text, plus scan history (list, detail, delete)
5. Dashboard charts
6. Demo account with seed data, and /api/health
Nice-to-have: Markdown report export; "what Gemini saw" panel; Aadhaar (Verhoeff), PAN, UPI detectors.
Data: tables users, policies, scans (see supabase/schema.sql).
Routes: /api/auth/*, /api/policies, /api/scans, /api/stats, /api/health.

## Tech stack (do not change the core; these additions are approved)
- Next.js with App Router and TypeScript
- Tailwind CSS for styling
- shadcn/ui components from components/ui (reuse these, don't write new ones from scratch)
- Spline (@splinetool/react-spline) for the landing hero only
- Supabase Postgres, server-side only (@supabase/supabase-js)
- bcryptjs, jose, zod, server-only
- Recharts for dashboard charts
- Deployed on Vercel from the main branch on GitHub

## Design rules
- Calm neutral palette: warm off-white background, near-black text, ONE forest-green accent.
- Inter plus one serif for headings. Generous whitespace, consistent spacing.
- No neon, no purple or blue gradients, no glow effects, no glassmorphism, no emoji icons.
- No hype copy ("Revolutionize", "Unleash") and no fake stats or testimonials.
- Each screen has one clear purpose.

## Rules
- Make small changes, one feature at a time.
- Never edit, print, or commit .env or .env.local files.
- No secret or key of any kind in client code or in any NEXT_PUBLIC_ variable.
- If a feature needs an API key, tell me the variable name so I can add it to .env.local and to Vercel.
- Validate all inputs on the server; show friendly errors, never raw errors.
- The app must work on mobile and desktop.
- After each change, make sure `npm run build` passes with no errors.
- Explain briefly what you changed and which files you touched.
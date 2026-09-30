<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Brief

## What we're building
(TO FILL TOMORROW: problem statement and app idea in 2-3 lines)

## Features in priority order
(TO FILL TOMORROW: build #1 first, only move on when it works)
1.
2.
3.

## Tech stack (do not change)
- Next.js with App Router and TypeScript
- Tailwind CSS for styling
- shadcn/ui components from components/ui (reuse these, don't write new ones from scratch)
- Spline (@splinetool/react-spline) for 3D visuals
- Deployed on Vercel from the main branch on GitHub

## Rules
- Make small changes, one feature at a time.
- Never edit, print, or commit .env or .env.local files.
- If a feature needs an API key, tell me the variable name so I can add it to .env.local and to Vercel.
- The app must work on mobile and desktop.
- After each change, make sure `npm run build` passes with no errors.
- Explain briefly what you changed and which files you touched.
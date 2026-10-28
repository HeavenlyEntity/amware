# Amware Portfolio Website

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **JavaScript**
- **Supabase** (Postgres, Auth, Storage)
- **Tailwind CSS 4** + Shadcn UI
- **pnpm** as package manager

## Essential Commands

```bash
pnpm dev                          # Start development (Turbopack, now the default)
pnpm build                        # Production build (Turbopack)
pnpm lint                         # eslint . (no lint:fix script exists)
npx eslint <file>                 # Lint one file
npx prettier --write <file>       # Format a file (no format:fix script exists)
```

## Verification

After implementation, always run:

1. `npx eslint <changed files>` (`next lint` was removed in Next 16)
2. `npx prettier --write` on changed files
3. `npx tsc --noEmit`
4. Run code quality reviewer agent

Since Next 16, `next dev` writes to `.next/dev` and `next build` to `.next`, with
a lockfile preventing duplicate instances, so **`pnpm build` while the dev server
runs is now safe.** The old rule against it no longer applies.

## Learned User Preferences

- Follow plans verbatim without editing plan files; trust files and references; implement all proposed changes first, then review together; explore only when absolutely necessary
- `motion` imported from `motion/react`, never `framer-motion`; only use in client components
- When fixing imports or patterns, apply the change across ALL files in the project
- Never start a dev server
- Lint with the ESLint CLI, never `next lint`; flat config lives in `eslint.config.mjs`
- Loading skeletons cover only the main content area, not the nav sidebar
- Graceful error handling on public pages (loadError prop, fallback UI with refresh); throw on staff pages
- Card UIs should be minimal at rest; reveal supplementary details on interaction; show full images without cropping (`object-contain`), keep media flush, and clip media/overlays inside card borders
- About/ProfileCard spotlight UIs should shrink on mobile so the interaction stays playable without filling the viewport
- "Commit and push" means push straight to `main` with gitmoji.dev messages; stage only task-related files, leaving hook state, generated files, screenshots, and design docs uncommitted
- Use `.toFixed(2)` for price display (e.g. `$75.00`)
- Guard empty arrays before `.in('id', [])` — return an empty dataset instead of querying; prefer atomic DB operations (RPC, single UPDATE) over read-then-write patterns

## Learned Workspace Facts

- App Router with route groups `src/app/(site)`, `(payload)`, and `(commerce)` — Pages Router under `src/pages` is gone
- CMS is Payload 3 on Postgres (`@payloadcms/db-postgres`); commerce integrates Creem (`@creem_io/nextjs`)
- Site positioning and meta use a fractional CTO tone; About narrative is engineer → architect → CTO with MBA as the business-technical bridge
- Project cards use `BorderGlow`, sort most-recent-first, and pull cover assets from `src/images/projects/`
- Legal entity name is spelled `AMWARE Technologies LLC` (footer copyright)
- Affiliate tool links on `/uses` open in a new tab with `rel="sponsored"` and a small up-right arrow beside the name
- Deposit-plan service cards use reservation as their primary CTA and offer intro-call scheduling after successful payment; services without a deposit plan retain their direct booking/contact fallback

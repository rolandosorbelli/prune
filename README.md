# Prune

Scan your inbox for newsletter and marketing subscriptions, and unsubscribe in one click.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + auth)
- Deployed on Vercel

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values once Supabase and Google OAuth credentials exist:

```bash
cp .env.example .env.local
```

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — lint the codebase

## Status

Phase 1 (foundations & deployment pipeline) — project scaffolded, not yet deployed.

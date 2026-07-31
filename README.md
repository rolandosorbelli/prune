# Prune

Scan your inbox for newsletter and marketing subscriptions, and unsubscribe in one click.

**Live:** https://prune-mu.vercel.app

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + auth + edge functions)
- Deployed on Vercel

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the values once a Supabase project exists:

```bash
cp .env.example .env.local
```

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — lint the codebase

Edge function unit tests (needs the [Deno CLI](https://deno.com)):

```bash
cd supabase/functions && deno task test
```

## Backend setup (Supabase + Google)

One-time setup, done through the Supabase Dashboard and Google Cloud Console:

1. **Supabase project** — create one at supabase.com, then run `supabase/schema.sql`
   in the SQL Editor to create the `connected_accounts`, `subscriptions`, and
   `scan_jobs` tables with RLS enabled. Also run any files in
   `supabase/migrations/` that were added after your initial setup.
2. **Google Cloud project** — enable the **Gmail API**, configure the OAuth
   consent screen (External, Testing is fine for now) with the
   `.../auth/gmail.readonly` scope added, and create an OAuth 2.0 Client ID
   (Web application) with redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Supabase Auth → Providers → Google** — paste the Google Client ID and
   Secret in.
4. **Supabase Auth → URL Configuration → Redirect URLs** — add every origin
   the app will run on, e.g. `http://localhost:5173/**` and
   `https://<your-vercel-domain>/**`.
5. **Edge function secrets** — set these via `supabase secrets set` or the
   Dashboard:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — same values as step 2, used
     to refresh Gmail access tokens server-side.
   - `TOKEN_ENCRYPTION_KEY` — a base64-encoded 32-byte key
     (`openssl rand -base64 32`) used to encrypt refresh tokens at rest.
6. **Deploy the edge functions**:
   ```bash
   supabase functions deploy connect-gmail
   supabase functions deploy scan-gmail
   supabase functions deploy update-subscription
   ```
7. **Frontend env** — add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to
   `.env.local` (see `.env.example`), and to your Vercel project's
   environment variables for the deployed site.

## How it works

- **`connect-gmail`** runs once, right after a user's first Google sign-in,
  to store their encrypted Gmail refresh token.
- **`scan-gmail`** uses that token to list inbox messages from the last 90
  days (capped at 300) in the Promotions, Social, Updates, and Forums
  categories, keeps only the ones with a `List-Unsubscribe` header, and
  aggregates them by sender into the `subscriptions` table.
- **`update-subscription`** handles the Unsubscribe and Ignore buttons. When
  a sender supports RFC 8058 one-click unsubscribe (`List-Unsubscribe-Post`
  header), it's done entirely server-side with no tab opening. Otherwise the
  client opens the sender's unsubscribe link or mail client to finish the
  job.

## Deployment

Deployed on Vercel, linked to this GitHub repo for auto-deploys on push to
`main` (preview deployments on other branches/PRs). Vite env vars
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set per-environment in
the Vercel project settings.

## Status

Phases 1–7 complete: sign-in, Gmail scanning, the subscriptions dashboard,
unsubscribe/ignore actions, and a deployed test URL are all live. Next up:
a second email provider (Outlook/Microsoft Graph) and broader polish based
on tester feedback.

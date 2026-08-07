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

## Backend setup (Supabase + Google + Microsoft)

One-time setup, done through the Supabase Dashboard, Google Cloud Console,
and Azure Portal:

1. **Supabase project** — create one at supabase.com, then run `supabase/schema.sql`
   in the SQL Editor to create the `connected_accounts`, `subscriptions`, and
   `scan_jobs` tables with RLS enabled. Also run any files in
   `supabase/migrations/` that were added after your initial setup.
2. **Google Cloud project** — enable the **Gmail API**, configure the OAuth
   consent screen (External, Testing is fine for now) with the
   `.../auth/gmail.readonly` scope added, and create an OAuth 2.0 Client ID
   (Web application) with redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Azure app registration** — in Entra ID, register an app with
   "Accounts in any organizational directory and personal Microsoft
   accounts" as the supported account type, the same redirect URI as
   above, and the **Mail.Read** delegated Graph API permission.
4. **Supabase Auth → Providers** — enable **Google** and **Azure**, pasting
   in each provider's Client ID and Secret. Leave the Azure tenant field
   blank/default (`common`) so any Microsoft account can sign in, not just
   one organization.
5. **Supabase Auth → Settings** — enable **manual linking**. This is what
   lets a signed-in user connect a second provider from the account menu
   instead of only being able to sign in with one.
6. **Supabase Auth → URL Configuration → Redirect URLs** — add every origin
   the app will run on, e.g. `http://localhost:5173/**` and
   `https://<your-vercel-domain>/**`.
7. **Edge function secrets** — set these via `supabase secrets set` or the
   Dashboard:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — same values as step 2, used
     to refresh Gmail access tokens server-side.
   - `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` — same values as step 3, used
     to refresh Outlook access tokens server-side.
   - `TOKEN_ENCRYPTION_KEY` — a base64-encoded 32-byte key
     (`openssl rand -base64 32`) used to encrypt refresh tokens at rest.
8. **Deploy the edge functions**:
   ```bash
   supabase functions deploy connect-gmail
   supabase functions deploy connect-outlook
   supabase functions deploy scan-gmail
   supabase functions deploy scan-outlook
   supabase functions deploy update-subscription
   ```
9. **Frontend env** — add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to
   `.env.local` (see `.env.example`), and to your Vercel project's
   environment variables for the deployed site.

## How it works

- **`connect-gmail`/`connect-outlook`** run once, right after a user first
  signs in with (or links) that provider, to store their encrypted refresh
  token. `connect-outlook` also validates the token against Microsoft
  immediately, so a bad token fails loudly at connect time instead of
  silently during a later scan.
- **`scan-gmail`** lists inbox messages from the last 90 days (capped at
  300) in the Promotions, Social, Updates, and Forums categories.
  **`scan-outlook`** does the same over Microsoft Graph, but since Outlook
  has no equivalent of Gmail's category labels, it classifies senders with
  a domain/keyword heuristic (`_shared/categorize.ts`) instead. Both keep
  only messages with a `List-Unsubscribe` header and aggregate them by
  sender into the `subscriptions` table, tagged with which provider they
  came from.
- **`update-subscription`** handles the Unsubscribe and Ignore buttons. When
  a sender supports RFC 8058 one-click unsubscribe (`List-Unsubscribe-Post`
  header), it's done entirely server-side with no tab opening. Otherwise the
  client opens the sender's unsubscribe link or mail client to finish the
  job.
- A user can connect **both** Gmail and Outlook to the same account (sign in
  with one, then "Connect Outlook"/"Connect Gmail" from the account menu —
  this uses Supabase's identity linking, not a second sign-in). "Scan inbox"
  fans out to every connected provider at once.

## Deployment

Deployed on Vercel, linked to this GitHub repo for auto-deploys on push to
`main` (preview deployments on other branches/PRs). Vite env vars
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set per-environment in
the Vercel project settings.

## Status

Sign-in, Gmail and Outlook scanning, multi-provider account linking, the
subscriptions dashboard, unsubscribe/ignore actions, light/dark theming,
and a deployed test URL are all live. Next up: broader polish based on
tester feedback, and possibly a third provider.

# Changelog

Notable changes to Prune, in reverse chronological order, grouped by month.

## July 2026

### 2026-07-31 — Unsubscribed and ignored subscriptions get their own section
The main list now shows only active subscriptions by default. Anything you've
already unsubscribed from or ignored moves into a smaller, clearly labeled
section underneath, so it doesn't clutter the list of things still worth
reviewing.

### 2026-07-31 — Design refresh: sidebar filters, colors, and bigger buttons
Reworked the dashboard into a sidebar (search, category, and status filters)
plus a main results column, added color-coded category icons, a custom
scissors favicon, and a subtle dot-grid background. Buttons got bigger and
bolder after early feedback that the first color pass was too low-contrast.

### 2026-07-31 — Unsubscribe and Ignore actions
Added the ability to actually unsubscribe from a sender: true one-click
(RFC 8058) where the sender supports it, handled entirely server-side, with
a fallback that opens the sender's link or mail client otherwise. Ignore
lets you dismiss a sender without unsubscribing.

### 2026-07-31 — Google sign-in, Gmail scanning, and the dashboard
Launched the core product loop: sign in with Google, scan the inbox for
newsletters and marketing lists with a `List-Unsubscribe` header, and see
them listed on a dashboard with search and category filtering.

### 2026-07-31 — First deploy
Project scaffolded with React, Vite, TypeScript, Tailwind, and shadcn/ui,
then pushed to GitHub and deployed to Vercel with auto-deploys on every
push to `main`.

---

## Format for future entries

```
### YYYY-MM-DD — Short headline
2–3 sentences describing what changed and why it matters to someone using
the app, not implementation detail. Group entries under a "## Month YYYY"
heading, newest month and newest entry first.
```

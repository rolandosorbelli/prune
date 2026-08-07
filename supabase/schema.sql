-- Prune database schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

create extension if not exists pgcrypto;

-- One row per email account a user has connected (Gmail for now).
-- The refresh token is encrypted application-side (see supabase/functions)
-- before it ever reaches this table; only edge functions using the
-- service role key can read or write it.
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'gmail',
  provider_account_email text,
  encrypted_refresh_token text not null,
  token_iv text not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts (id) on delete cascade,
  -- Denormalized from connected_accounts.provider for simple filtering
  -- without a join. The same sender is a separate subscription per
  -- provider: unsubscribing in one connected mailbox should not silently
  -- affect the same sender received via a different one.
  provider text not null default 'gmail',
  sender_email text not null,
  sender_name text,
  category text not null default 'other'
    check (category in ('promotions', 'social', 'updates', 'forums', 'other')),
  email_count integer not null default 0,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'unsubscribed', 'ignored')),
  unsubscribe_method text
    check (unsubscribe_method in ('link', 'mailto', 'manual')),
  unsubscribe_target text,
  supports_one_click boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sender_email, provider)
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  messages_scanned integer not null default 0,
  error text
);

create index scan_jobs_user_id_idx on public.scan_jobs (user_id);

-- Row Level Security: users can only ever read their own data. All writes
-- happen from edge functions using the service role key, which bypasses
-- RLS, so no insert/update/delete policies are needed for regular users.
alter table public.connected_accounts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.scan_jobs enable row level security;

-- Deliberately no select policy on connected_accounts: it holds encrypted
-- tokens and the client never needs to read it directly.

create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can view their own scan jobs"
  on public.scan_jobs for select
  using (auth.uid() = user_id);

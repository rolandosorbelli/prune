-- Adds one-click (RFC 8058) unsubscribe support.
-- Run this in the Supabase SQL Editor.

alter table public.subscriptions
  add column supports_one_click boolean not null default false;

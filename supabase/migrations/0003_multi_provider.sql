-- Adds multi-provider support.
-- Run this in the Supabase SQL Editor.
--
-- Tracks which provider each subscription came from, and treats the same
-- sender as a separate subscription per provider: unsubscribing from a
-- newsletter received in Gmail should not silently affect the same
-- newsletter received via a different connected mailbox.

alter table public.subscriptions
  add column provider text not null default 'gmail';

-- Drop the old (user_id, sender_email) uniqueness in favor of
-- (user_id, sender_email, provider). Found dynamically rather than by a
-- hardcoded constraint name, in case Postgres auto-named it differently.
do $$
declare
  old_constraint text;
begin
  select conname into old_constraint
  from pg_constraint
  where conrelid = 'public.subscriptions'::regclass
    and contype = 'u'
    and array_length(conkey, 1) = 2;

  if old_constraint is not null then
    execute format('alter table public.subscriptions drop constraint %I', old_constraint);
  end if;
end $$;

alter table public.subscriptions
  add constraint subscriptions_user_sender_provider_key
  unique (user_id, sender_email, provider);

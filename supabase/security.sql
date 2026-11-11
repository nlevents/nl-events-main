-- Run in the Supabase SQL editor ONLY AFTER confirming SUPABASE_SERVICE_ROLE_KEY
-- is set in the production (Netlify) environment: the server uses that key,
-- which bypasses RLS. Without it the API falls back to the public key and would
-- stop working once RLS is on.
--
-- Effect: the public anon key (visible in the browser bundle) gets NO direct
-- access to these tables. All reads/writes go through the /api functions.

alter table if exists public.inquiries              enable row level security;
alter table if exists public.bookings               enable row level security;
alter table if exists public.booking_notifications  enable row level security;
alter table if exists public.app_state              enable row level security;

-- No policies are created on purpose (default deny for anon/authenticated).
-- Remove any existing permissive policies that allow anon or authenticated access:
--   select schemaname, tablename, policyname, roles, cmd from pg_policies
--   where schemaname = 'public';
-- then drop the ones you do not recognise:  drop policy "<name>" on public.<table>;

revoke all on public.inquiries, public.bookings, public.booking_notifications, public.app_state from anon, authenticated;

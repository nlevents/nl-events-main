-- Fix: allow arbitrary custom lead sources.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

alter table public.inquiries
  drop constraint if exists inquiries_lead_source_check;

-- lead_source remains a text field and can contain predefined or custom values.
-- Example: Instagram, Referral, ABC, Wedding Planner, Local Vendor, etc.

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'inquiries_lead_source_check';

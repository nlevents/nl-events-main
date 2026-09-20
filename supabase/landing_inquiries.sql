-- Next Level Events — /landing inquiry migration
-- Run this once in Supabase Dashboard → SQL Editor.
-- The migration is safe to re-run.

alter table public.inquiries
  add column if not exists whatsapp_number text not null default '';

alter table public.inquiries
  add column if not exists source text not null default 'inquiry';

alter table public.inquiries
  add column if not exists lead_source text not null default 'Website';

alter table public.inquiries
  add column if not exists source_type text not null default 'AUTO';

alter table public.inquiries drop constraint if exists inquiries_lead_source_check;
alter table public.inquiries add constraint inquiries_lead_source_check check (lead_source in ('Website','Meta Ads','Google Ads','Organic Social','Google Organic','WhatsApp','Referral','Venue','Vendor','Direct','Repeat Client','Other'));
alter table public.inquiries drop constraint if exists inquiries_source_type_check;
alter table public.inquiries add constraint inquiries_source_type_check check (source_type in ('AUTO','MANUAL'));

create index if not exists inquiries_source_idx
  on public.inquiries(source);

create index if not exists inquiries_lead_source_idx
  on public.inquiries(lead_source);

-- Optional: verify the migration after running it.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'inquiries'
  and column_name in ('whatsapp_number', 'source', 'lead_source', 'source_type')
order by column_name;

-- CRM functional fields
alter table public.inquiries add column if not exists next_follow_up timestamptz null;
alter table public.inquiries add column if not exists assigned_to_name text not null default '';
create index if not exists inquiries_next_follow_up_idx on public.inquiries(next_follow_up);
create index if not exists inquiries_source_idx on public.inquiries(source);

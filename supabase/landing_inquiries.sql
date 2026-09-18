-- Next Level Events — /landing inquiry migration
-- Run this once in Supabase Dashboard → SQL Editor.
-- The migration is safe to re-run.

alter table public.inquiries
  add column if not exists whatsapp_number text not null default '';

alter table public.inquiries
  add column if not exists source text not null default 'inquiry';

create index if not exists inquiries_source_idx
  on public.inquiries(source);

-- Optional: verify the migration after running it.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'inquiries'
  and column_name in ('whatsapp_number', 'source')
order by column_name;

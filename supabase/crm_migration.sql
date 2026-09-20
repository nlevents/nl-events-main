-- CRM functional/source attribution migration. Safe to re-run.
alter table public.inquiries add column if not exists next_follow_up timestamptz null;
alter table public.inquiries add column if not exists assigned_to_name text not null default '';
alter table public.inquiries add column if not exists source text not null default 'Inquiry Form';
alter table public.inquiries add column if not exists source_type text not null default 'AUTO';
create index if not exists inquiries_next_follow_up_idx on public.inquiries(next_follow_up);
create index if not exists inquiries_source_idx on public.inquiries(source);

-- Normalize the existing website entry points without changing lead_source marketing attribution.
update public.inquiries
set source = case
  when source in ('landing', 'Landing') then 'Landing Page'
  when source in ('contact', 'Contact', 'inquiry') then 'Inquiry Form'
  when source = 'manual' then 'CRM'
  else source
end
where source is not null;

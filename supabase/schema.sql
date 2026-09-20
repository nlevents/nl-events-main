-- Next Level Events — production database schema
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  key text primary key,
  data jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null default '',
  name text not null default '',
  email text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  request_id text not null unique,
  ref text not null unique,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  alt_phone text not null default '',
  city text not null default '',
  notes text not null default '',
  items_json jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status text not null default 'not_required' check (payment_status in ('not_required','pending','paid','failed','refunded')),
  booking_status text not null default 'pending' check (booking_status in ('pending','confirmed','cancelled','completed')),
  -- Legacy payment columns retained only for backwards-compatible migrations.
  -- The current application does not create or process online payments.
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_request_id_idx on public.bookings(request_id);
create index if not exists bookings_status_idx on public.bookings(booking_status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);

-- Safe migration for projects that already have the bookings table.
alter table public.bookings add column if not exists request_id text;
update public.bookings set request_id = 'legacy-' || id::text where request_id is null;
alter table public.bookings alter column request_id set not null;
create unique index if not exists bookings_request_id_unique on public.bookings(request_id);
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check check (payment_status in ('not_required','pending','paid','failed','refunded'));
alter table public.bookings alter column payment_status set default 'not_required';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid null references public.bookings(id) on delete set null,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null,
  raw_event_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payments_booking_id_idx on public.payments(booking_id);
create unique index if not exists payments_razorpay_payment_unique on public.payments(razorpay_payment_id) where razorpay_payment_id is not null;

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  whatsapp_number text not null default '',
  city text not null default '',
  event_type text not null default '',
  event_date date null,
  event_time text not null default '',
  event_venue text not null default '',
  event_location text not null default '',
  guest_count text not null default '',
  budget text not null default '', -- legacy field retained for old records
  message text not null default '',
  status text not null default 'new',
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_id text null
);
create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiries_created_at_idx on public.inquiries(created_at desc);
alter table public.inquiries add column if not exists request_id text null;
create unique index if not exists inquiries_request_id_unique on public.inquiries(request_id) where request_id is not null;

alter table public.app_state enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.inquiries enable row level security;

-- The application talks to these tables through trusted Vercel functions.
-- No anonymous browser role can read/write business data directly.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings for select to authenticated using (auth.uid() = user_id);

revoke all on table public.app_state, public.payments, public.inquiries, public.booking_notifications, public.inquiry_notifications from anon, authenticated;
revoke insert, update, delete on table public.bookings from anon, authenticated;

-- Keep service-role access available to server functions while blocking the
-- anon/authenticated roles from directly modifying business data.

-- Helpful timestamps for future direct updates.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at before update on public.inquiries for each row execute function public.set_updated_at();

-- Booking notification delivery log. The booking itself remains the authoritative
-- record; this table tracks optional email/WhatsApp delivery independently.
create table if not exists public.booking_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, channel)
);
create index if not exists booking_notifications_booking_id_idx on public.booking_notifications(booking_id);
create index if not exists booking_notifications_status_idx on public.booking_notifications(status);
alter table public.booking_notifications enable row level security;

-- Inquiry CRM fields and accounting linkage for the final inquiry flow.
alter table public.inquiries add column if not exists whatsapp_number text not null default '';
alter table public.inquiries add column if not exists event_time text not null default '';
alter table public.inquiries add column if not exists event_venue text not null default '';
alter table public.inquiries add column if not exists event_location text not null default '';
alter table public.inquiries add column if not exists quotation_id text not null default '';
alter table public.inquiries add column if not exists invoice_id text not null default '';
alter table public.inquiries add column if not exists payment_status text not null default 'pending';
alter table public.inquiries add column if not exists source text not null default 'inquiry';
alter table public.inquiries add column if not exists lead_source text not null default 'Website';
alter table public.inquiries add column if not exists source_type text not null default 'AUTO';
alter table public.inquiries add column if not exists booking_id uuid null references public.bookings(id) on delete set null;

-- Unified lead-source attribution. The legacy source column continues to identify
-- the originating application view; lead_source/source_type are the CRM attribution fields.
update public.inquiries set lead_source = case
  when lower(source) in ('landing','contact','inquiry') then 'Website'
  when source = 'booking' then 'Website'
  else 'Website'
end where lead_source is null or lead_source = '';
update public.inquiries set source_type = 'AUTO' where source_type is null or source_type = '';
alter table public.inquiries drop constraint if exists inquiries_lead_source_check;
alter table public.inquiries add constraint inquiries_lead_source_check check (lead_source in ('Website','Meta Ads','Google Ads','Organic Social','Google Organic','WhatsApp','Referral','Venue','Vendor','Direct','Repeat Client','Other'));
alter table public.inquiries drop constraint if exists inquiries_source_type_check;
alter table public.inquiries add constraint inquiries_source_type_check check (source_type in ('AUTO','MANUAL'));
create index if not exists inquiries_lead_source_idx on public.inquiries(lead_source);
create unique index if not exists inquiries_booking_id_unique on public.inquiries(booking_id) where booking_id is not null;

-- New CRM stages: New Lead -> Discovery Call -> Meeting Scheduled -> Quotation Sent -> Deal Closed.
-- The status column remains the single source of truth for the lead pipeline.
update public.inquiries set status = 'new_lead' where status in ('new', 'contacted');
update public.inquiries set status = 'quotation_sent' where status = 'quoted';
update public.inquiries set status = 'deal_closed' where status = 'won';
update public.inquiries set status = 'new_lead' where status is null or status = '';

create table if not exists public.inquiry_notifications (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (inquiry_id, channel)
);
create index if not exists inquiry_notifications_inquiry_id_idx on public.inquiry_notifications(inquiry_id);
alter table public.inquiry_notifications enable row level security;

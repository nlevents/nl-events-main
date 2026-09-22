-- NLE Catalog reset + verification
-- Run this in Supabase SQL Editor before the first production catalog launch.
-- IMPORTANT: the current application stores catalog state in public.app_state
-- JSONB for compatibility with the existing admin panel. Supabase is the
-- source of truth; browser localStorage is only a cache.

-- 0) BACKUP/CHECK: inspect the current product bucket before deleting it.
select key, data, updated_at
from public.app_state
where key = 'nle_catalog_v2_products';

-- 1) Remove ALL existing sellable products/packages.
--    This does not remove occasions/categories, media, invoices, clients, etc.
insert into public.app_state (key, data, updated_at)
values ('nle_catalog_v2_products', '[]'::jsonb, now())
on conflict (key) do update
set data = excluded.data,
    updated_at = excluded.updated_at;

-- 2) Keep exactly the six public Shop-by-Occasion families at the top level.
--    Nested categories/subcategories inside them are preserved.
update public.app_state
set data = coalesce((
  select jsonb_agg(value order by value->>'slug')
  from jsonb_array_elements(coalesce(data, '[]'::jsonb)) as value
  where value->>'slug' in (
    'wedding', 'birthday', 'corporate', 'kids-family',
    'anniversary', 'festivals-culture'
  )
), '[]'::jsonb),
updated_at = now()
where key = 'nle_catalog_v2_occasions';

-- 3) Verify the product bucket is empty.
select key,
       jsonb_array_length(coalesce(data, '[]'::jsonb)) as product_count,
       updated_at
from public.app_state
where key = 'nle_catalog_v2_products';

-- 4) Verify there are six public top-level occasion families.
select key,
       jsonb_array_length(coalesce(data, '[]'::jsonb)) as top_level_count,
       updated_at
from public.app_state
where key = 'nle_catalog_v2_occasions';

-- 5) Optional: inspect product records without deleting them.
-- select jsonb_array_elements(data) as product
-- from public.app_state
-- where key = 'nle_catalog_v2_products';

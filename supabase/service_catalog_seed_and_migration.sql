-- Next Level Events: Service Catalog source-of-truth migration
-- Run once in Supabase SQL Editor.
-- This creates the Event Services category tree in app_state so the Admin
-- Panel can own it. The React runtime no longer seeds this branch.

create table if not exists public.app_state (
  key text primary key,
  data jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

-- Seed/replace ONLY the event-services branch while preserving every other
-- occasion/category already stored in nle_catalog_v2_occasions.
do $$
declare
  service_tree jsonb := jsonb_build_object(
    'id', 'event-services',
    'slug', 'event-services',
    'label', 'Event Services',
    'tagline', 'Everything you need for your event',
    'description', 'Admin-controlled event services catalog.',
    'addonOnly', true,
    'children', jsonb_build_array(
      jsonb_build_object('id','svc-decor','slug','decor','label','Décor','type','category','description','Decoration packages, backdrops, stages and styling.','children',jsonb_build_array()),
      jsonb_build_object('id','svc-entry','slug','entry','label','Entry','type','category','description','Grand and unique event entries.','children',jsonb_build_array()),
      jsonb_build_object('id','svc-entertainment','slug','entertainment','label','Entertainment','type','category','description','Artists, DJs, live bands and guest entertainment.','children',jsonb_build_array(
        jsonb_build_object('id','svc-artists','slug','artists','label','Artists','type','category','description','Anchors, dancers and live performers.','children',jsonb_build_array()),
        jsonb_build_object('id','svc-dj-live-bands','slug','dj-live-bands','label','DJ & Live Bands','type','category','description','DJ, live band and music entertainment.','children',jsonb_build_array()),
        jsonb_build_object('id','svc-wedding-activity','slug','wedding-activity','label','Wedding Activity','type','category','description','Games and guest activities.','children',jsonb_build_array())
      )),
      jsonb_build_object('id','svc-sound-technical','slug','sound-technical','label','Sound & Technical','type','category','description','Lighting, AV, sound and special effects.','children',jsonb_build_array(
        jsonb_build_object('id','svc-sound','slug','sound','label','Sound','type','category','description','Professional sound systems and operators.','children',jsonb_build_array()),
        jsonb_build_object('id','svc-lighting','slug','lighting','label','Lighting','type','category','description','Decorative, stage and event lighting.','children',jsonb_build_array()),
        jsonb_build_object('id','svc-av-technical','slug','av-technical','label','AV & Technical','type','category','description','Screens, projectors, trussing and technical production.','children',jsonb_build_array()),
        jsonb_build_object('id','svc-sfx','slug','sfx','label','SFX','type','category','description','Special effects and production effects.','children',jsonb_build_array(
          jsonb_build_object('id','svc-cold-pyro','slug','cold-pyro','label','Cold Pyro','type','category','children',jsonb_build_array()),
          jsonb_build_object('id','svc-fog','slug','fog','label','Fog','type','category','children',jsonb_build_array()),
          jsonb_build_object('id','svc-fireworks','slug','fireworks','label','Fireworks','type','category','children',jsonb_build_array())
        ))
      )),
      jsonb_build_object('id','svc-tent-furniture','slug','tent-furniture','label','Tent & Furniture','type','category','description','Tents, seating, tables and event furniture.','children',jsonb_build_array()),
      jsonb_build_object('id','svc-photography-videography','slug','photography-videography','label','Photography & Videography','type','category','description','Photography and video coverage.','children',jsonb_build_array(
        jsonb_build_object('id','svc-photography','slug','photography','label','Photography','type','category','description','Professional event photography.','children',jsonb_build_array()),
        jsonb_build_object('id','svc-videography','slug','videography','label','Videography','type','category','description','Professional event videography.','children',jsonb_build_array())
      )),
      jsonb_build_object('id','svc-catering','slug','catering','label','Catering','type','category','description','Food and beverage experiences for events.','children',jsonb_build_array()),
      jsonb_build_object('id','svc-baraat-procession','slug','baraat-procession','label','Baraat / Procession','type','category','description','Dhol, band and baraat procession services.','children',jsonb_build_array())
    )
  );
  current jsonb;
  next_data jsonb;
begin
  select data into current from public.app_state where key = 'nle_catalog_v2_occasions' for update;

  if current is null or jsonb_typeof(current) <> 'array' then
    current := '[]'::jsonb;
  end if;

  next_data := (
    select jsonb_agg(item order by ord)
    from jsonb_array_elements(current) with ordinality as x(item, ord)
    where item->>'slug' <> 'event-services'
  );
  next_data := coalesce(next_data, '[]'::jsonb) || jsonb_build_array(service_tree);

  insert into public.app_state(key, data, updated_at)
  values ('nle_catalog_v2_occasions', next_data, now())
  on conflict (key) do update
    set data = excluded.data,
        updated_at = now();
end $$;

-- Verify the stored service branch.
select
  key,
  jsonb_path_query_first(data, '$[*] ? (@.slug == "event-services")') as event_services
from public.app_state
where key = 'nle_catalog_v2_occasions';

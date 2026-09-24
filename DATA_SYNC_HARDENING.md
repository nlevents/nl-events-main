# Data sync hardening

- Admin cloud writes are serialized per state key so an older request cannot overwrite a newer edit.
- Catalog/admin state writes use an atomic Supabase upsert on `app_state.key`.
- Admin state GET responses are explicitly non-cacheable.
- The public catalog still excludes the admin media library; media remains admin-only.
- No storefront UI/layout/styles were changed.

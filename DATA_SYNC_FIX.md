# Catalog Image Sync Fix

This build fixes a data-persistence/synchronization issue where category/occasion image changes could appear in the admin UI but disappear after refresh, or fail to appear on the public website.

## Changes

- Admin occasion and category edits now use the authenticated cloud save/delete APIs.
- Media-library uploads and URL imports now wait for the Supabase cloud save before reporting success.
- Media-library delete operations now persist to cloud state.
- Public gallery add/delete operations now persist to cloud state.
- Public catalog API responses are no longer cached, so refreshed storefronts get the latest catalog immediately after an admin update.
- Client catalog hydration explicitly bypasses browser cache.
- Existing UI, CSS, layout, routes, and catalog structure were not intentionally changed.

## Deploy

1. Run `npm install`.
2. Run `npm run build`.
3. Deploy the generated `dist` using the existing hosting setup.
4. Do not delete or reset the existing Supabase `app_state` data.

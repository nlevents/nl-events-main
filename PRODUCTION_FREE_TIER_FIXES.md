# Production / Free-Tier Fixes

This release keeps the existing Netlify + Supabase architecture and does not add a paid service.

## Catalog source of truth
- Removed the wedding PDF/reference product fallback.
- Removed the legacy static event-service fallback from category pages and birthday/home service sections.
- Removed legacy seeded service-card creation from the catalog store and purge known launch seed cards once on upgrade.
- Removed unused reference/demo product data from the runtime catalog code.
- Package/product storefront data now comes from the admin-managed catalog bucket.

## Package integrity
- Packages must contain at least one real product.
- Package items store a product ID and are rehydrated from the current product record, keeping names/prices/images current.
- A product cannot be deleted while a package references it.
- Bulk deletion applies the same protection.
- Server-side admin validation rejects empty packages, missing product references, and package-inside-package references.

## Admin persistence / concurrency
- Product delete, duplicate, and bulk update/delete operations now await cloud persistence.
- Admin state writes use optimistic concurrency based on `updated_at`, preventing one admin from silently overwriting another admin's newer catalog.
- The Admin Panel refreshes cloud versions during authentication hydration.

## Free-tier synchronization / bandwidth
- Public catalog polling changed from 30 seconds to 5 seconds.
- Repeated polling requests only fetch tiny version metadata.
- The large product catalog is fetched only when its cloud version changes.
- Hidden tabs do not poll; focus/visibility changes trigger an immediate refresh.
- No new paid API, database, CDN, or realtime provider was introduced.

## Accessibility / safety
- Meaningful product/category/review thumbnails now have descriptive alt text.
- Existing decorative hero imagery keeps empty alt text where the surrounding text already conveys the content.
- Legacy Admin Product Form defaults no longer contain example product names, prices, inclusions, add-ons, or cities.

## Database migration
No new database table or paid service is required for this release. Existing `app_state` storage and the existing Netlify Function/Supabase bridge remain in use.

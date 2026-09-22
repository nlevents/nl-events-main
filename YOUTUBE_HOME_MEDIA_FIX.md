# YouTube Shorts + Review Videos Home Page Fix

## Home page order
1. YouTube Shorts
2. Customer Reviews
3. Customer Review Videos

## Fixes
- Removed the `display: contents` IntersectionObserver wrapper around the Shorts and Review Video sections. Those sections now render directly through `Suspense`, so they cannot be skipped on the homepage.
- Fixed catalog initialization so the real YouTube launch seed is not skipped merely because the main catalog version is already current.
- Admin-managed records continue to come from the catalog store and respond to `nle-catalog-updated`.

## Seeded YouTube content
The existing real launch links are preserved:
- 5 YouTube Shorts
- 1 customer review video

Admins can edit/delete these from Admin → YouTube Shorts & Reviews.

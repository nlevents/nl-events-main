# Performance hardening — no UI changes

This pass targets the browser/main-thread lag seen when navigating the storefront.

## Changes

- Removed the admin media library from the public `/api/catalog` payload.
  Uploaded base64/WebP media remains available to the admin panel but is no longer
  downloaded and JSON-parsed by every public visitor.
- Added short public catalog caching (`15s` browser/CDN cache with stale-while-revalidate).
- Delayed background catalog hydration until the browser has had time to become
  interactive, then only dispatches a catalog update event when cached data actually changed.
- Prevented repeated catalog seed/migration checks from running on every catalog read.
- Added memoized catalog caches for birthday age categories and event services.
- Removed the full admin catalog store from the initial public bundle path:
  the header now starts with the lightweight static city list and loads live city
  data only when idle.
- Removed the catalog-store dependency from the chatbot's static product data module.
- Birthday pages now render from lightweight public fallback data first and load
  admin-managed catalog data during idle time.
- Occasion category pages render their lightweight service fallback first and
  load the full admin catalog store during idle time.
- Product/category templates in `OccasionBrowser` are route-lazy-loaded separately.
- Added route prefetching on pointer/focus for category cards so navigation can
  begin before the click.
- Reduced remote Unsplash image request sizes/quality while keeping the same
  image source and visual presentation.
- Added Unsplash preconnect/DNS prefetch.
- Added lazy loading + asynchronous decoding to remaining non-hero page images.
- Removed an O(n²) trail lookup in occasion recommendation rails.

## UI guarantee

No layout, colors, typography, spacing, routes, visible components, or styling
were intentionally redesigned. The changes are intended to preserve the existing
UI while reducing network, parsing, main-thread, and image-decoding work.

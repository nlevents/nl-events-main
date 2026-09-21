# Performance optimizations

These changes are intended to improve the `/` homepage's initial load without changing the visual design:

- Corrected the homepage hero preload (the old preload pointed at a different image).
- Reduced the critical hero image request from 1800px/q80 to 1600px/q75.
- Added `fetchPriority="high"` and async decoding to the hero image.
- Added native lazy loading + async decoding to below-the-fold home images.
- Deferred cloud catalog hydration until browser idle time.
- Split heavy catalogue data (`occasions`) out of the initial homepage chunk.
- Deferred Shorts and YouTube review code until the user approaches those sections.
- Removed admin/account CSS from the public initial bundle; those styles now load with their respective areas.
- Added long-lived caching for hashed/static `/assets/*` files.

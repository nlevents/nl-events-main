# Shop by Occasion landing pages

Implemented four new inner landing pages without changing the existing Header or Footer:

- `/occasion/anniversary` — Anniversary Moments That Last Forever
- `/occasion/festivals-culture` — Festivals & Other Celebrations
- `/occasion/kids-family` — Kids & Family Events
- `/occasion/corporate` — Corporate Events

Each page has its own content and layout inspired by the supplied reference images. The shared implementation is in `src/pages/OccasionLanding.jsx` with page-specific configuration, and styling is isolated in `src/styles/occasion-landing.css`.

The legacy `/corporate` URL now opens the new Corporate landing page. A Kids & Family top-level occasion was also added to the occasion data tree.

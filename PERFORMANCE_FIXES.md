# NLE local performance fix

Changes are performance-only; no layout, content, routes, or component styling redesign was made.

## Fixed
- Removed the expensive `backdrop-filter: blur(14px)` from the sticky global header.
  This can cause heavy repaint/compositing work while scrolling, especially in Chrome on Linux.
- Removed the same unnecessary blur from the mobile bottom CTA.
- Added `decoding="async"` to image-heavy UI images so image decoding is less likely to block the main thread.
- Added compositor hinting to the hero crossfade.
- Added paint containment to repeated card components to reduce repaint area.

## Run
```bash
npm install
npm run dev
```

The app should still run on the normal Vite local URL (usually http://localhost:5173).

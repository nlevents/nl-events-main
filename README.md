# Next Level Events

Production website and administration application for Next Level Events.

## Website

- Website: https://nextlevelevents.in/
- Admin: `/admin`
- Business: Next Level Events
- Location: Ranchi, Jharkhand, India
- Email: nextlevel.events25@gmail.com
- Phone: +91 7903 133 317

## Developer

- Developer: Ankit Kumar
- Project: Next Level Events website and admin system

## Design / Development Credit

- PixelBytes: https://www.pixelbytes.online

## Technology

- React
- Vite
- React Router
- Supabase
- Cloudinary
- Netlify

## Project Structure

- `src/` — React application, pages, components, state, catalog and styling
- `api/` — serverless API handlers
- `shared/` — authentication, Supabase and shared utilities
- `supabase/` — database schema and migrations
- `public/` — static web assets and routing files
- `scripts/` — asset and Cloudinary migration utilities

## Catalog

The Admin Catalog is the source of truth for products, services and packages. Service categories and service products are stored in the catalog state and synchronized with Supabase. Packages reference catalog products and services instead of maintaining a separate package product list.

## Environment

Use a local `.env` file for development secrets. Do not commit secrets. Server-only credentials must never be exposed through `VITE_*` variables.

## Deployment

The project uses Vite and is configured for Netlify deployment.

## Free-Tier Optimization

- Supabase is used as the durable catalog source; browser storage is only a cache.
- Public catalog version checks run in the background at a low frequency and on browser focus/visibility changes instead of polling every few seconds.
- Public catalog API responses use short CDN caching with stale-while-revalidate behavior.
- The large product catalog is downloaded only when its stored cloud version is missing or has changed.
- Cloudinary is used for image delivery and responsive transformations instead of storing large image files in the application bundle.
- Static Vite assets use long-lived immutable caching.
- Vercel/Netlify SPA fallbacks do not rewrite missing `/assets/*` files to `index.html`, preventing stale-chunk MIME errors.
- Server-only Supabase and Cloudinary credentials are expected through deployment environment variables and are not stored in the repository.

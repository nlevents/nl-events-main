# NLE performance cleanup

## What was changed

- Removed 33 image files that were unused or exact duplicates.
- Reduced `public/assets/images` from 149 files to 116 files.
- Reduced the local image bundle from about 18 MB to about 8 MB.
- Recompressed/resized catalog and category artwork to a maximum of 640px.
- Recompressed/resized client gallery artwork to a maximum of 960px.
- Reduced the logo to 192px for the local fallback bundle.
- Consolidated the duplicate landing logo into `brand/logo.png`.
- Kept all three favicon sizes because they are referenced by `index.html`.
- Kept the client gallery images that are still referenced by `src/data/clientImages.js`.
- Deduplicated identical Diwali and New Year client images without changing the visible image sets.
- Updated Cloudinary delivery to use `f_auto,q_auto,c_limit,w_*,dpr_auto` with smaller width caps by asset type.
- Kept lazy loading on below-the-fold image components already present in the project.
- Added `npm run assets:check` for future asset audits.

## Cloudinary migration

Run:

```bash
npm install
npm run migrate:assets
```

The migration uploads only the cleaned `public/assets/images` tree. Cloudinary upload configuration remains in `.env.local`; secrets must never be committed or exposed through `VITE_*` variables.

## Verification note

The asset cleanup and JavaScript syntax checks were completed here. A full Vite production build could not be executed in this environment because the npm registry package tarballs were not available in the local npm cache. Run `npm install` and `npm run build` on Fedora before deployment.

# NLE — Cloudinary asset deployment

The deployment copy of this project intentionally contains **no local image assets**.
The storefront uses the existing Cloudinary public IDs under `nle-assets/`, with
Cloudinary delivery transformations (`f_auto`, `q_auto`, responsive width limits).

## Netlify environment variables

Set:
- `VITE_CLOUDINARY_CLOUD_NAME=jh0tqpsv`
- `VITE_USE_CLOUDINARY_ASSETS=true`

The upload preset is only needed by the asset migration script.

## Before deploying

1. Run the separate asset migration package against the Cloudinary account.
2. Confirm the `nle-assets/` images load.
3. Deploy this ZIP to Netlify.

No component layout, styling, image selection, or UX was intentionally changed.

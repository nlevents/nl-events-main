# NLE Cloudinary migration + asset optimization

The public image bundle has been cleaned before migration: unused catalog artwork was removed, exact duplicate files were deduplicated, the duplicate landing logo was consolidated into the brand logo, and remaining local images were recompressed/resized for fallback/admin use.

Production storefront image URLs are generated through `cloudinaryAsset()` and use Cloudinary `f_auto,q_auto,c_limit,w_* ,dpr_auto` delivery. Card-sized artwork is capped at 640px, client gallery images at 960px, and the logo at 192px.

## Configure

Create `.env.local` from `.env.local.example`:

```text
VITE_CLOUDINARY_CLOUD_NAME=jh0tqpsv
VITE_CLOUDINARY_UPLOAD_PRESET=nle_development
VITE_USE_CLOUDINARY_ASSETS=true
```

The upload preset must be an unsigned image upload preset.

## Upload the cleaned assets

```bash
npm install
npm run migrate:assets
```

The migration scans only `public/assets/images`, which now contains the cleaned production fallback set. The uploader uses deterministic public IDs and deliberately does not send `overwrite`, because unsigned Cloudinary uploads reject that parameter.

## Test

```bash
npm run dev
```

If Cloudinary has not been populated yet, set `VITE_USE_CLOUDINARY_ASSETS=false` temporarily to test the local fallback bundle.

## Deploy

After confirming the Cloudinary URLs load correctly, deploy with the public `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`, and `VITE_USE_CLOUDINARY_ASSETS=true` variables.

Never put `CLOUDINARY_API_SECRET` or a Supabase service-role key in a `VITE_*` variable.

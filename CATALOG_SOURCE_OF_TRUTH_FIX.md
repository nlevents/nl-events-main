# Catalog source-of-truth fix

## What changed
- Sellable packages/products are now admin/database-owned only.
- Built-in occasion/category data is treated as navigation/reference data; embedded example products are stripped before rendering.
- Legacy seeded `demo-prod-*`, `addon-prod-*`, and `isDemo` product records are removed from the browser catalog.
- Admin catalog hydration cleans those legacy records from Supabase `app_state`.
- Public product API filters legacy seed records.
- Product/catalog API responses are `no-store` to avoid stale package data.
- Cross-device public catalog synchronization checks for changes every 5 seconds instead of 30 seconds.
- Admin add/edit/delete flows continue to persist through the existing Supabase-backed catalog state.

## Admin workflow
Use **Admin → Products & Packages → Add New Product** to create the packages that should appear on the storefront. Editing/deleting there updates the database-backed catalog and the public storefront syncs the change.

## Important
The category/occasion hierarchy remains available as structural navigation. It no longer makes embedded example products appear as sellable packages.

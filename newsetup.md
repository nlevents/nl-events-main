# Setup Guide — Cross-Device Admin Sync

## Why products only showed on one device
The code already has full cloud-sync built (Supabase + Vercel API routes). It just needs its keys. Without them, admin changes only save to that browser's local storage — other devices never see them.

## What you need to do

### 1. Create a Supabase project
- Go to supabase.com → New Project.
- Open **SQL Editor** → paste the contents of `supabase/schema.sql` (already in this repo) → Run.

### 2. Get your Supabase keys
Supabase Dashboard → **Settings → API**:
- `Project URL` → use for `VITE_SUPABASE_URL` and `SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only)

### 3. Create your admin login
Supabase Dashboard → **Authentication → Users → Add user** → set your email + password.
Put that exact email in `SUPABASE_ADMIN_EMAILS` (comma-separate if more than one admin).

### 4. Fill `.env`
Open `.env` in this folder and fill every value. This file is for your **local machine only** — it is git-ignored and never uploaded.

### 5. Add the same values in Vercel
Vercel does **not** read your local `.env`. On your Vercel project:
**Settings → Environment Variables** → add every key from `.env` with the same values (Production + Preview).

Redeploy after adding them (Vercel → Deployments → ⋯ → Redeploy).

### 7. Test it
1. Open your live site → `/admin` → log in with the email/password from step 3.
2. Add or edit a product.
3. Open the site on your phone (or any other device/browser) → refresh → the change should appear.

That's it — no code changes needed. Once the env vars are set on Vercel, every admin change is saved to Supabase and every visitor's browser pulls from Supabase.

## If it's still not syncing
- Double-check the admin email in Supabase Auth matches `SUPABASE_ADMIN_EMAILS` exactly (case-insensitive, but no typos/extra spaces).
- Confirm `supabase/schema.sql` ran without errors (check **Table Editor** for an `app_state` table).
- Vercel → your project → **Deployments** → latest deployment → **Functions** tab: check `/api/admin/state` and `/api/catalog` for error logs.
- Make sure you redeployed *after* adding the Vercel env vars — old deployments don't pick up new env vars automatically.

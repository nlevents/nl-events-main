# Next Level Events — Setup Guide

This project keeps the existing UI and routes while using a clean deployment/media architecture:

- **Supabase** — application database and authentication/state.
- **Cloudinary** — images and videos, CDN delivery, optimization, and media migration.
- **Netlify** — current frontend deployment.
- **Vercel** — recommended future deployment for the same project because the existing `api/` serverless endpoints use the Vercel handler format.
- **Stripe** — optional payment integration; the current checkout still intentionally does not take online payment.

## 1. Requirements

- Node.js 20+ recommended.
- npm 10+ recommended.
- A Supabase project.
- A Cloudinary account.
- A GitHub repository for deployment.
- A Netlify account for the current deployment.
- A Vercel account for the later migration.
- A Stripe account only if online payments are enabled later.

## 2. Install locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## 3. Environment variables

Create `.env` in the project root. A placeholder `.env` is included for local setup and is gitignored.

### Browser-safe variables

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
VITE_API_URL=/api
VITE_CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET=nle_development
VITE_STRIPE_PUBLISHABLE_KEY=
```

Never put service-role, Cloudinary API secret, or Stripe secret values in a `VITE_*` variable.

### Server-only variables

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ADMIN_EMAILS=your-admin-email@example.com

CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=
BOOKING_NOTIFICATION_EMAIL=nextlevel.events25@gmail.com
BOOKING_FROM_EMAIL=Next Level Events <bookings@your-verified-domain.com>
```

## 4. Supabase setup

Keep the existing Supabase project and existing data.

Do not create a new database just for Cloudinary. Cloudinary is media storage/CDN; Supabase remains the database.

Required browser values:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Required server values:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ADMIN_EMAILS
```

Run the SQL files in `supabase/` only when the corresponding feature is being installed or migrated. Do not drop existing tables or production data.

## 5. Cloudinary setup

1. Create/login to Cloudinary.
2. Open **Settings → Upload → Upload Presets**.
3. Create an upload preset named `nle_development` for temporary development use.
4. Use an unsigned preset for direct browser uploads, or replace the upload flow with signed server uploads before production if stricter control is required.
5. Put the Cloudinary cloud name and preset in `.env`:

```env
VITE_CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET=nle_development
```

Server/migration credentials stay server-side:

```env
CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
```

### Media architecture

Do not store new image binaries/base64 strings inside catalog JSON.

The intended flow is:

```text
Admin image
  → Cloudinary upload
  → Cloudinary URL + public ID
  → Supabase stores URL/metadata only
  → Public website loads optimized media from Cloudinary CDN
```

The public catalog API deliberately does not return the admin media library.

## 6. Existing base64 media migration

The project includes:

```bash
npm run migrate:cloudinary
```

The migration requires server-only Supabase and Cloudinary credentials.

Example:

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
CLOUDINARY_CLOUD_NAME="YOUR_CLOUD_NAME" \
CLOUDINARY_API_KEY="YOUR_CLOUDINARY_API_KEY" \
CLOUDINARY_API_SECRET="YOUR_CLOUDINARY_API_SECRET" \
npm run migrate:cloudinary
```

Back up important catalog data before a bulk migration. The migration is intended to replace legacy base64 media references with Cloudinary URLs while preserving catalog metadata.

## 7. Netlify — current deployment

The repository includes `netlify.toml`.

Connect the GitHub repository to Netlify.

Build settings:

```text
Build command: npm run build
Publish directory: dist
```

Add the browser-safe variables in **Netlify → Project configuration → Environment variables**:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
VITE_STRIPE_PUBLISHABLE_KEY   (only if Stripe is enabled)
VITE_API_URL
```

### Important Netlify/API note

The existing `api/` directory contains Vercel-style serverless handlers. Netlify can host the frontend immediately, but those handlers should either:

1. remain hosted at the existing compatible API host and be referenced through `VITE_API_URL`, or
2. be explicitly migrated to Netlify Functions.

Do not assume that a Netlify static deployment automatically executes the Vercel-style `api/*.js` handlers.

For a clean temporary setup, keep the frontend on Netlify and point `VITE_API_URL` at the working API deployment.

## 8. Vercel — later deployment

The project already contains `vercel.json` and the existing `api/` handlers use the Vercel serverless format.

When moving to Vercel:

1. Import the same GitHub repository.
2. Add the same environment variables.
3. Keep `npm run build` as the build command.
4. Deploy.
5. Change `VITE_API_URL` from the temporary API host to the Vercel deployment if necessary.
6. Test catalog reads, admin writes, bookings, inquiries, and authentication before switching the production domain.

## 9. Stripe — optional future payment setup

Stripe is **not currently enabled in checkout**. The current website intentionally submits booking requests without collecting online payment.

When online payment is approved for the project:

Browser:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Server:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Use test keys during development and live keys only after the payment flow, refund flow, webhook handling, order state changes, and legal/payment pages have been tested.

Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the browser.

## 10. Temporary developer account

It is fine to use the developer's own email temporarily while the client's email account is unavailable.

Keep infrastructure ownership separate from the login account:

```text
Supabase project  → existing project
Cloudinary        → development account/project
Netlify           → developer account temporarily
Admin login       → developer email temporarily
```

When the client's email becomes available, transfer access/ownership rather than changing application code to hard-code an email address.

Never hard-code an admin email in React components.

## 11. Catalog routing rules

The storefront uses the catalog tree as the source of truth.

Every category/theme has its own route:

```text
/occasion/birthday/teen-birthday
/occasion/birthday/adult-birthday
/occasion/birthday/milestone-birthday
/occasion/kids-family/baby-shower
/occasion/kids-family/procession
/occasion/kids-family/modern-ceremony
/occasion/kids-family/naming-ceremony
/occasion/corporate/product-launch
/occasion/festivals-culture/diwali
```

Products are added from Admin and appear under the category/theme to which they are assigned.

Static fake package cards are not used on the Birthday and professional occasion landing pages. Package/product listings should come from the live Admin catalog.

## 12. Verify before delivery

Run:

```bash
npm install
npm run lint
npm run build
```

Then test:

- Homepage → Shop Occasion.
- Birthday age cards.
- Birthday themes.
- Wedding → Haldi / Mehndi / Sangeet / Reception.
- Kids & Family → Baby Shower / Annaprashan / Mundan / Naming / Modern Ceremony / Procession.
- Corporate event types.
- Festival event types.
- Admin category creation/editing.
- Admin product creation and category assignment.
- Admin image upload.
- Cloudinary media creation.
- Refresh admin and confirm the new image remains.
- Open the public site in a private window and confirm the new image.
- Confirm the public API does not return the admin media library.
- Test booking/inquiry submission against the active API host.

## 13. Security checklist

Never commit:

```text
.env
SUPABASE_SERVICE_ROLE_KEY
CLOUDINARY_API_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
WHATSAPP_ACCESS_TOKEN
```

Use publishable/browser-safe keys only in frontend code.

## 14. Client handover

Before handover:

1. Move infrastructure access to the client's email/account.
2. Replace development Cloudinary credentials/preset with the client's production Cloudinary environment.
3. Replace development Stripe keys with the client's keys if Stripe is enabled.
4. Set production Supabase/Netlify/Vercel environment variables.
5. Rotate any temporary development secrets.
6. Test the production domain with a private browser window.
7. Confirm the admin login belongs to the client.

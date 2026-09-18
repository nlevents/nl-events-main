# `/landing` — Next Level Events enquiry form

This update adds a standalone five-step enquiry experience at:

`/landing`

It does **not** use the normal website `Header`, `Footer`, chatbot, cart, or bottom navigation. The only branding shown is the custom branding built into the supplied landing-form design.

## What was added

- Five-step responsive form matching the supplied screenshots:
  1. Event type
  2. Guest count
  3. Event date
  4. Event location + required services + optional requirements
  5. Contact details + review
- Animated success checkmark and success state.
- No normal site navigation/header/footer components are mounted on `/landing`.
- Landing submissions use `source = 'landing'` so they are separated from normal CRM records.
- New admin navigation item: **Landing Inquiries**.
- Admin page supports search, opening an enquiry, viewing all submitted data, internal notes, refresh, and delete.
- WhatsApp number is stored separately in `inquiries.whatsapp_number`.
- Existing server-side rate limiting, honeypot protection, Supabase service-role access, and admin authentication remain in use.

## 1. Supabase SQL

If the project already has the current `inquiries` table from `supabase/schema.sql`, run:

`supabase/landing_inquiries.sql`

in **Supabase Dashboard → SQL Editor → Run**.

You do **not** need to create a second inquiry table. The existing `public.inquiries` table is reused and filtered by `source = 'landing'`.

If you have not installed the project's main schema yet, run the complete `supabase/schema.sql` first. It already contains the migration for `whatsapp_number` and `source`.

## 2. Environment variables

Use `.env.local` for local development and Vercel Environment Variables for production.

Required server values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ADMIN_EMAILS`

Required browser values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL=/api`

Optional notifications:

- `RESEND_API_KEY`
- `BOOKING_NOTIFICATION_EMAIL`
- `BOOKING_FROM_EMAIL`
- WhatsApp Cloud API variables listed in `.env.example`

**Never put the Supabase service-role key in frontend code, GitHub, or a public `.env` file.**

## 3. Vercel deployment

Push the project to GitHub and deploy the repository to Vercel as usual.

In Vercel:

1. Open the project.
2. Go to **Settings → Environment Variables**.
3. Add the required variables above.
4. Redeploy after saving them.
5. Open `/landing` on the deployed domain.
6. Submit a test enquiry.
7. Log in to `/admin`.
8. Open **Landing Inquiries**.
9. Confirm the test enquiry appears there.

The `/landing` route is a normal React Router route, so the supplied Vercel configuration must continue rewriting application routes to the SPA entry point.

## 4. How the data flows

Browser `/landing` → `POST /api/inquiry` → server validates/rate-limits → Supabase `public.inquiries` → record gets `source = 'landing'` → admin reads it through authenticated `/api/admin/inquiries` → **Landing Inquiries** displays only those records.

The browser never writes directly to Supabase business tables.

## 5. Data stored

The landing form stores:

- Full name
- Mobile number
- WhatsApp number, if different
- Email, if provided
- Event type
- Guest range
- Event date
- Event location
- Selected services
- Additional requirements
- Submission source (`landing`)
- Request ID for duplicate-submission protection
- Created/updated timestamps
- Admin notes

Selected services and optional requirements are stored together in the existing `message` field to avoid creating unnecessary CRM tables.

## 6. Existing records

Existing CRM inquiries are unaffected. They keep their existing `source` values. The admin page **Landing Inquiries** only shows rows where `source = 'landing'`.

## 7. Test checklist

- `/landing` loads without the main website header/footer.
- Step 1 selection works.
- Step 2 selection works.
- Date cannot be selected in the past.
- Location is required.
- Services can be selected independently.
- Requirements are optional.
- Name and mobile are required.
- WhatsApp and email are optional.
- Back navigation works.
- Review shows the entered information.
- Submit creates one Supabase record.
- Refreshing/retrying the same request ID does not create a duplicate.
- Success checkmark animates.
- Admin → Landing Inquiries shows the submission.
- Admin authentication is required to view or delete submissions.

## 8. Important security note

The project should use environment variables for production secrets. The committed `.env.example` contains placeholders only. If any service-role credential was previously committed to a public repository, rotate that credential in Supabase before production use.

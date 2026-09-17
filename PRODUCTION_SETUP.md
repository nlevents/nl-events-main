# Next Level Events — Production Deployment

## Architecture

- Frontend: React + Vite
- Hosting/API: Vercel
- Database: Supabase Postgres
- Customer login: Supabase Email/password authentication
- Admin login: Supabase Email/Password + server-side admin allow-list
- Booking requests: server-validated cart → Supabase booking record → unique booking reference
- Online payments: intentionally not used; payment is coordinated separately by the client/team
- Media: use Supabase Storage or a CDN for uploaded production photos

Browser localStorage remains only a fast cache for the existing admin UI. The durable copy is the Supabase database through `/api/*`.

## 1. Create Supabase project

Create a project in Supabase and open **SQL Editor**.
Run:

`supabase/schema.sql`

Then in **Authentication → Providers → Phone**, enable Phone and configure a real SMS provider (not required for customer login). Do not use a development/test OTP setup for the client launch.

For admin access, create the owner's account under **Authentication → Users** using Email/Password. Put the exact admin email in `SUPABASE_ADMIN_EMAILS` on Vercel.

## 2. First production catalog bootstrap

The first admin login automatically:

1. loads any existing cloud state;
2. inserts only missing state buckets from the current local demo/catalog cache;
3. reloads the cloud copy.

This means the current catalog/categories/products can be carried into Supabase without opening the database to anonymous writes.

After the first bootstrap, admin changes are persisted to Supabase automatically.

## 3. Vercel environment variables

### Browser-safe variables

- `VITE_SUPABASE_URL` = Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase publishable/anon key

### Server-only variables

- `SUPABASE_URL` = same Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role key
- `SUPABASE_ADMIN_EMAILS` = comma-separated authorized admin emails

Do not add payment gateway credentials. The production booking flow does not process online payments.

## 4. Deploy

Push this project to GitHub and import the repository into Vercel.

Build settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Add the environment variables before the first production deployment.

## 5. Domain

After deployment, add the client's domain in Vercel and update DNS as Vercel instructs.

## 6. Production acceptance checklist

- [ ] Supabase SQL migration completed
- [ ] Email/password authentication provider tested with a real Indian phone number
- [ ] Admin email/password login tested
- [ ] Admin bootstrap completed
- [ ] Products/categories edited from one browser and visible after a fresh browser reload
- [ ] Customer enquiry reaches Admin → Inquiries
- [ ] Customer can log in with OTP
- [ ] Customer can add packages and add-ons to cart
- [ ] Customer can submit a booking from checkout
- [ ] Server recalculates package/add-on pricing before saving
- [ ] Unique booking reference is shown after submission
- [ ] Booking appears in the customer account
- [ ] Admin can see and update booking status
- [ ] Double-click / repeated submission does not result in a payment flow (there is no online payment flow)
- [ ] Admin can see and update bookings
- [ ] Excel/JSON backups downloaded and stored outside the browser
- [ ] Custom domain + HTTPS tested
- [ ] Mobile checkout tested
- [ ] 404/refresh on `/occasion/...` works on Vercel
- [ ] No secrets committed to Git

## Important launch note

The existing admin catalog is intentionally preserved through a compatibility layer so the current UI does not need to be rewritten all at once. For a larger operation, the next backend evolution should split `app_state` JSON into dedicated relational tables for products, categories, media, coupons, clients and invoices. The booking/payment tables are already relational and are the authoritative transaction records.

# Next Level Events — Complete Setup Guide

This is the only setup document you need for the project.

The project is a React + Vite frontend with server-side API functions and Supabase as the database/authentication layer. Vercel is the recommended production host because the `/api/*` functions run there. Local development uses a Vite API bridge so the same API code works on your Fedora/Linux machine.

## 1. What you need

Install these first:

- Node.js 20 or newer
- npm
- A Supabase project
- A Vercel account for production
- Optional: Resend for email notifications
- Optional: Meta WhatsApp Cloud API for WhatsApp notifications

Do **not** install a separate Express/Node backend. You do not need one.

---

## 2. Install the project locally

Open a terminal in the project folder:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Admin:

```text
http://localhost:5173/admin
```

The Vite development server runs the project's `/api/*` handlers locally. You do not need `vercel dev` for normal local testing.

---

## 3. Create the local environment file

Copy the example file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill the values below.

### Required variables

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=/api

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ADMIN_EMAILS=your-admin-email@example.com
```

### Where to get the Supabase values

Supabase Dashboard → **Project Settings → API**.

Use:

- Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
- Publishable/anon key → `VITE_SUPABASE_ANON_KEY`
- Service-role key → `SUPABASE_SERVICE_ROLE_KEY`

### Important security rule

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable.

Never commit `.env.local` to GitHub.

The service-role key bypasses normal Supabase RLS and is used only by the server-side API functions.

After changing `.env.local`, stop Vite with `Ctrl+C` and start it again:

```bash
npm run dev
```

---

## 4. Set up the Supabase database

This project has one SQL file:

```text
supabase/schema.sql
```

You should run the **entire file**. Do not run old migration files; they have been removed from this project.

### Steps

1. Open Supabase Dashboard.
2. Open your project.
3. Go to **SQL Editor**.
4. Click **New query**.
5. Open `supabase/schema.sql` from this project.
6. Copy the complete file.
7. Paste it into the Supabase SQL Editor.
8. Click **Run**.

The schema creates/updates the tables needed by the application, including:

- `app_state` — catalog/admin state
- `profiles` — user profile data
- `bookings` — product/package bookings
- `payments` — accounting/payment records
- `inquiries` — contact inquiries, sales leads and booking CRM records
- `booking_notifications` — email/WhatsApp delivery log for bookings
- `inquiry_notifications` — email/WhatsApp delivery log for inquiries

It also creates indexes, timestamps, unique request IDs, and row-level security settings.

If you already have data, the SQL uses `create table if not exists` and `alter table ... add column if not exists` for the important migrations. Still, take a Supabase backup before applying schema changes to a production database.

---

## 5. Create the admin account

In Supabase:

**Authentication → Users → Add user**

Create an email/password user.

Example:

```text
Email: admin@yourdomain.com
Password: use-a-strong-password
```

Then put the same email in `.env.local`:

```env
SUPABASE_ADMIN_EMAILS=admin@yourdomain.com
```

For multiple admins:

```env
SUPABASE_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Restart Vite after changing the file.

Now open:

```text
http://localhost:5173/admin
```

Login with the Supabase user you created.

### If admin login works but the panel shows an old login error

1. Log out.
2. Close the admin tab.
3. Open `/admin` again.
4. Log in again.
5. If necessary, clear the site's browser storage for `localhost:5173` and retry.

The current code treats authentication and optional cloud-state hydration separately, so a temporary catalog-sync failure should not log out a valid admin.

---

## 6. Test the three important flows locally

### A. Contact inquiry

Open:

```text
http://localhost:5173/contact
```

Submit the form.

Expected result:

1. Form succeeds.
2. A record is inserted into Supabase `inquiries` with `source = contact`.
3. It appears in Admin → **CRM → Inquiries**.
4. If email/WhatsApp are configured, notification attempts are made.

### B. Event lead

Open:

```text
http://localhost:5173/book-event
```

Complete:

```text
Event Type
→ Event Details + Vision
→ Contact
→ Review
→ Submit Inquiry
```

Expected result:

1. Inquiry is inserted into `inquiries`.
2. It uses `source = inquiry`.
3. It appears in Admin → **CRM → Leads**.
4. It starts at `New Lead`.
5. Email/WhatsApp notification attempts are made if configured.

### C. Product/package booking

Add a product/package to the cart and complete checkout.

Expected result:

1. Booking is inserted into `bookings`.
2. A CRM record is created in `inquiries` with `source = booking` and `booking_id` pointing to the booking.
3. It appears in Admin → **CRM → Bookings**.
4. Email/WhatsApp notification attempts are made if configured.
5. The customer's success/printable booking flow continues even if a notification provider is temporarily unavailable.

---

## 7. Admin CRM structure

The old combined "Inquiries & Leads" view has been separated.

Open:

```text
Admin → CRM
```

You will see three main tabs:

### Inquiries

These are submissions from the public Contact page.

They are **not** part of the sales pipeline by default.

### Leads

These are event inquiry submissions from the event inquiry flow.

They use the sales pipeline:

```text
New Lead
→ Discovery Call
→ Meeting Scheduled
→ Quotation Sent
→ Deal Closed
```

### Bookings

These are product/package bookings made through checkout.

They remain separate from general inquiries and leads.

---

## 8. Email notifications

Yes. After the setup is complete, when somebody submits a contact inquiry, event inquiry, or product booking, the server attempts to send an email notification to your business email.

The project uses the Resend HTTP API from the server-side function. Resend supports sending through Vercel Functions without a separate backend service.

### Step 1 — Create a Resend account

Create an account at Resend.

### Step 2 — Verify your sending domain

In Resend, add the domain you own and add the DNS records Resend gives you. Resend's current domain flow uses DNS verification and provides the SPF/DKIM records required for sending.

For example, if the business owns:

```text
nextlevelevents.in
```

you can eventually send from something like:

```text
bookings@nextlevelevents.in
```

Do not use a random unverified address in `BOOKING_FROM_EMAIL`.

### Step 3 — Create a sending API key

In Resend → API Keys, create a key with the minimum permissions needed for sending. Resend supports sending-only API keys and domain restrictions.

Copy the key immediately.

### Step 4 — Add these environment variables

Local `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
BOOKING_NOTIFICATION_EMAIL=nextlevel.events25@gmail.com
BOOKING_FROM_EMAIL=Next Level Events <bookings@nextlevelevents.in>
```

`BOOKING_NOTIFICATION_EMAIL` is the email address that should receive new-lead and new-booking alerts.

### What the email contains

For a new inquiry, the email contains information such as:

- Customer name
- Mobile number
- Event type
- Date/time
- Venue/location
- Guest count
- Vision/requirements

For a booking, it contains the booking reference, customer, event and total details.

### Important

Email notification failure does **not** cancel the inquiry or booking. The database record is created first and notification delivery is tracked separately.

---

## 9. WhatsApp notifications

Yes. The project is already prepared so a new inquiry or booking can trigger an automatic WhatsApp notification to the business WhatsApp number.

However, this is **not** the same as opening a `wa.me` link.

Automatic server-to-WhatsApp notifications require the WhatsApp Business Platform / Cloud API. Meta's Cloud API requires a Meta business portfolio, a WhatsApp Business Account and a business phone number.

### Step 1 — Create/configure Meta Business + WhatsApp

Use Meta's WhatsApp Business Platform / Cloud API setup.

You need:

- Meta developer account
- Meta business portfolio
- WhatsApp Business Account (WABA)
- Business phone number
- Meta app with WhatsApp enabled

### Step 2 — Get the WhatsApp phone number ID

In the WhatsApp setup/Getting Started area, find the **Phone Number ID**.

Put it into:

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Step 3 — Create a long-lived/system-user access token

Meta supports user and system-user access tokens. Temporary user tokens are not appropriate for a production server because they expire; use a suitable system-user token for production.

Put the token into:

```env
WHATSAPP_ACCESS_TOKEN=your_long_lived_or_system_user_token
```

Do not expose this token to React or any `VITE_*` variable.

### Step 4 — Get the recipient number

This is the WhatsApp number where your company wants to receive alerts.

Use international digits only:

```env
WHATSAPP_NOTIFICATION_TO=917903133317
```

Do not write `+`, spaces or brackets in this variable.

### Step 5 — Create WhatsApp templates

The project uses template messages because business-initiated notifications should use approved templates where required.

Create two templates in WhatsApp Manager:

```text
new_inquiry_alert
new_booking_alert
```

Keep the template names exactly the same as the environment variables.

Templates need to be submitted/reviewed before they can be used. Meta's WhatsApp documentation provides the template workflow and approval process.

### Suggested inquiry template

Use a simple utility-style notification such as:

```text
New inquiry received.

Name: {{1}}
Phone: {{2}}
Event: {{3}}
Date: {{4}}
Time: {{5}}
Venue: {{6}}
Location: {{7}}
Guests: {{8}}
```

### Suggested booking template

```text
New booking received.

Booking: {{1}}
Customer: {{2}}
Phone: {{3}}
Event: {{4}}
Date: {{5}}
Time: {{6}}
City: {{7}}
Venue: {{8}}
Total: {{9}}
```

The number/order of variables must match what the project sends.

### Step 6 — Add the environment variables

```env
WHATSAPP_ACCESS_TOKEN=your_meta_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_NOTIFICATION_TO=917903133317
WHATSAPP_GRAPH_VERSION=vXX.X
WHATSAPP_TEMPLATE_NAME=new_booking_alert
WHATSAPP_INQUIRY_TEMPLATE_NAME=new_inquiry_alert
WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

Use the current Graph API version shown in your Meta developer dashboard rather than copying an old version number from an example.

### What happens after setup

```text
Customer submits form
        ↓
Supabase record created
        ↓
Email notification attempted
        ↓
WhatsApp notification attempted
        ↓
Notification result logged
```

If WhatsApp is not configured, the form still works; the notification is recorded as `skipped` rather than making the customer-facing submission fail.

---

## 10. Protection/security system

The project includes several layers of protection while keeping setup simple.

### Layer 1 — Supabase service-role key stays server-side

Only server API files use:

```env
SUPABASE_SERVICE_ROLE_KEY
```

Never rename it to `VITE_SUPABASE_SERVICE_ROLE_KEY`.

### Layer 2 — Supabase RLS

Business tables have RLS enabled. Anonymous browser users do not directly write business data.

The website sends public submissions to `/api/*`; the server then writes them to Supabase using the server-only service role.

### Layer 3 — Admin authentication

Admin API routes require:

1. A valid Supabase access token.
2. The account's email to be listed in `SUPABASE_ADMIN_EMAILS`.

### Layer 4 — Input validation

The API validates:

- Name length
- Phone format
- Event type
- Date
- Venue/location
- Guest count
- Booking items
- Product availability
- Add-ons
- Booking request ID

### Layer 5 — Duplicate submission protection

Bookings already use a unique request ID.

Public inquiries also use a request ID so accidental double-clicks can be detected.

### Layer 6 — Spam protection

Public inquiry and booking endpoints have:

- A hidden honeypot field
- Per-IP best-effort rate limiting
- Maximum field lengths
- Server-side validation

The rate limiter is intentionally dependency-free. Because serverless instances can be replaced, it is best-effort rather than a replacement for a full WAF/CDN rate limiter.

### Layer 7 — Notification isolation

If Resend or WhatsApp fails:

```text
Database write = still successful
Customer booking = still successful
Notification = logged as failed
```

This prevents the dangerous situation where the customer sees "booking failed" even though the booking was actually saved.

### Layer 8 — Security headers

For production, keep the site's security headers enabled in `vercel.json`. Do not remove them unless you have a specific reason.

---

## 11. Production deployment on Vercel

Vercel is the recommended production host for this project because it runs the `/api/*.js` functions alongside the Vite frontend.

### Step 1 — Push the project to GitHub

Do not commit `.env.local`.

Check:

```bash
git status
```

Make sure no secret file is listed.

### Step 2 — Import into Vercel

Vercel → Add New Project → Import your GitHub repository.

Build settings:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
```

### Step 3 — Add production environment variables

Vercel → Project → **Settings → Environment Variables**.

Add the same variables used locally.

Required:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ADMIN_EMAILS
```

Optional notifications:

```text
RESEND_API_KEY
BOOKING_NOTIFICATION_EMAIL
BOOKING_FROM_EMAIL
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_NOTIFICATION_TO
WHATSAPP_GRAPH_VERSION
WHATSAPP_TEMPLATE_NAME
WHATSAPP_INQUIRY_TEMPLATE_NAME
WHATSAPP_TEMPLATE_LANGUAGE
```

Vercel allows environment variables to be scoped to Production, Preview and Development. After changing variables, redeploy because the new values are applied to a new deployment.

### Step 4 — Deploy

Deploy the project.

Then test the production URLs:

```text
https://your-domain.com/contact
https://your-domain.com/book-event
https://your-domain.com/checkout
https://your-domain.com/admin
```

---

## 12. If the client wants to keep the domain at Hostinger

That is fine.

The domain can remain at Hostinger while the actual application is deployed to Vercel.

You would point the domain's DNS to Vercel according to the DNS values Vercel gives you.

Do **not** put this project on ordinary WordPress hosting just because the domain was purchased from Hostinger. The project needs the server-side `/api` functions, and Vercel is the simpler deployment for them.

---

## 13. Final test checklist

Before handing the project to the client, test all of these.

### Database

- [ ] `supabase/schema.sql` executed successfully
- [ ] `inquiries` table exists
- [ ] `bookings` table exists
- [ ] notification tables exist
- [ ] RLS is enabled

### Admin

- [ ] Admin user exists in Supabase Auth
- [ ] Admin email is in `SUPABASE_ADMIN_EMAILS`
- [ ] Admin login works
- [ ] CRM opens after login
- [ ] Inquiries tab shows Contact-page submissions
- [ ] Leads tab shows event inquiry submissions
- [ ] Bookings tab shows product bookings
- [ ] Lead stages can be changed
- [ ] Quotation creation works
- [ ] Invoice creation works

### Public forms

- [ ] Contact form submits successfully
- [ ] Event inquiry form submits successfully
- [ ] No public customer email field is required
- [ ] Product checkout submits successfully
- [ ] Printable booking confirmation works

### Notifications

- [ ] Test inquiry email received
- [ ] Test booking email received
- [ ] Test inquiry WhatsApp received
- [ ] Test booking WhatsApp received
- [ ] `inquiry_notifications` shows delivery status
- [ ] `booking_notifications` shows delivery status

### Security

- [ ] `.env.local` is not committed
- [ ] Service-role key is server-only
- [ ] Admin cannot be accessed without authentication
- [ ] Public forms reject invalid input
- [ ] Repeated spam submissions are rate-limited

---

## 14. The simplest order to follow

If all of this looks complicated, do only these steps in order:

```text
1. npm install
2. Copy .env.example → .env.local
3. Fill Supabase values
4. Run supabase/schema.sql in Supabase SQL Editor
5. Create admin user in Supabase Auth
6. Put admin email in SUPABASE_ADMIN_EMAILS
7. npm run dev
8. Test Contact
9. Test Book Event
10. Test Checkout
11. Set up Resend
12. Add email variables
13. Set up WhatsApp Cloud API
14. Create/approve the two WhatsApp templates
15. Add WhatsApp variables
16. Test notifications
17. Push to GitHub
18. Deploy to Vercel
19. Add the same environment variables to Vercel
20. Redeploy
21. Test the production domain
```

If you are not ready for WhatsApp yet, stop after step 12. The website and CRM still work; only WhatsApp notifications will be skipped.


## Vercel routing and booking-form notes

- This project is a Vite SPA. `vercel.json` rewrites non-API routes to `/index.html`, so direct URLs such as `/admin`, `/admin/login`, `/checkout`, and `/book-event` must load the React application instead of a Vercel 404 page.
- API routes under `/api/*` are handled by Vercel serverless functions and are intentionally excluded from the SPA rewrite.
- Venue / Address and Event Time are optional throughout the booking flow. A blank venue/address or blank time must not cause a server validation error.
- After pushing changes to GitHub, verify the Vercel deployment is using the same repository, production branch, and latest commit. If the domain still shows a Vercel 404 at `/admin`, the custom domain is serving a different/older Vercel project or deployment; check Vercel Project → Settings → Domains and Deployments.
- If `/book-event` still shows `Unable to submit your inquiry right now`, check Vercel Functions logs for `/api/inquiry` and confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in the Production environment, then redeploy.

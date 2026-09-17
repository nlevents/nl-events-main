# Next Level Events — React Website

This is your original static site (14 HTML pages + vanilla JS) rebuilt as a single React
application using **Vite** and **React Router**. Every page, feature and interaction from the
original site is preserved — theme toggle, city selector with live search, header search
suggestions, hero/promo carousels, sortable & filterable package grids, the enquiry cart with
WhatsApp/email checkout, the 5-step booking form, the gallery lightbox, the FAQ accordion, and the
full reviews system.

It's optimized for production: pages are code-split (each page's JS loads only when you visit it),
CSS/JS/images are minified and long-term cacheable, and this frontend builds down to plain static
files — so it runs on **any** standard web host, including Hostinger, with no Node.js server
required at runtime.

> **Read this first:** this file covers the React frontend only. For the full picture — including
> the real WordPress/PHP backend that now powers login, bookings and payments — start with
> **`/SETUP.md`** at the repo root, which is the canonical, up-to-date setup guide. `AUTH_README.md`,
> `PAYMENT_README.md`, `ADMIN_README.md`, `CHATBOT_README.md` and `/wp-backend/README.md` cover
> each subsystem in depth; `PRODUCTION_READINESS.md` is the short "what's real vs. still needs
> config" checklist.

---

## 1. What's in this folder

```
nle-react/
├── dist/                ← READY-TO-UPLOAD static site (this is what goes on your host)
├── src/                  ← React source code (edit this to change the site)
│   ├── pages/              one file per page (Home, Services, Packages, Gallery, ...)
│   ├── components/         Header, Footer, BottomNav, cart, carousels, modals, icons
│   ├── context/            theme / city / cart / toast state (React Context)
│   ├── data/               all editable content: images, prices, package copy, nav links, cities
│   ├── hooks/              small reusable hooks (scroll-reveal, page title/meta)
│   ├── styles/             style.css, shop.css, responsive.css (all site styling)
│   ├── App.jsx             route definitions
│   └── main.jsx            React entry point, loads the styles above
├── public/               static assets copied as-is into the build
│   ├── .htaccess           Apache rewrite rule (required for page routing on Hostinger)
│   └── assets/images/      brand logo/favicons + category photos
├── index.html            the HTML shell Vite builds around
├── vite.config.js        build configuration
├── package.json          dependencies & npm scripts
└── README.md             this file
```

Only the files actually used by the site are included — unused default Vite scaffold files,
unused favicon sizes, and empty asset folders have been removed to keep the project tidy.

You do **not** need to run anything to deploy — `dist/` is already built and ready. You only need
Node.js if you want to **edit the site and rebuild it**.

---

## 2. Deploying to Hostinger (no WordPress, no Node.js needed on the server)

Hostinger's "WordPress hosting" plans are still just standard Apache web hosting under the hood —
you can serve any static files on them, you're simply not using WordPress's CMS for this site.

### Step-by-step

1. Log in to **hPanel** → go to **Files** → **File Manager** (or use FTP — details below).
2. Open the `public_html` folder for your domain (or the correct subfolder if this site lives in
   a subdirectory / subdomain).
3. If a WordPress install currently lives there and you want this React site to fully replace it
   at that address, **back up and remove the old WordPress files first** (wp-admin, wp-content,
   wp-config.php, etc.) — don't mix the two in the same folder.
4. Upload the **contents of the `dist/` folder** — not the folder itself, everything *inside* it
   (`index.html`, `assets/`, `.htaccess`, favicon files, etc.) — directly into `public_html`.
   - In File Manager: select all files inside `dist/` on your computer, zip them, upload the zip
     into `public_html`, then use File Manager's "Extract" option, then delete the uploaded zip.
   - Or drag-and-drop everything inside `dist/` directly if your browser/File Manager allows it.
5. **Important:** make sure `.htaccess` was uploaded. It's a hidden file (starts with a dot), so:
   - In hPanel File Manager, click **Settings** (top right) → enable **"Show Hidden Files"**.
   - Confirm `.htaccess` sits next to `index.html` inside `public_html`.
   - This file is what makes clean URLs like `yoursite.com/packages` or `yoursite.com/gallery`
     work correctly on a hard refresh or a shared link — without it, only the homepage will load
     and other pages will 404 on direct visits.
6. Visit your domain. The homepage should load. Click around, then try refreshing on an inner page
   (e.g. `/packages`) to confirm the `.htaccess` rewrite is working.

### Deploying via FTP instead

1. In hPanel, go to **Files → FTP Accounts** to get your FTP host, username, and password (or use
   your existing Hostinger account credentials).
2. Open an FTP client (e.g. **FileZilla** — free, all platforms).
3. Connect using the host/username/password from hPanel.
4. Navigate to `public_html` on the remote side.
5. On the local side, open the `dist/` folder from this project.
6. Select everything **inside** `dist/` and upload it into `public_html`. Enable "show hidden
   files" in FileZilla's server settings so `.htaccess` transfers too.

### Deploying to a subdomain or subfolder instead of the root domain

If this site will live at e.g. `events.yourdomain.com` or `yourdomain.com/events/` rather than at
the domain root, create that subdomain/subfolder in hPanel first, then upload the same `dist/`
contents into *that* folder instead of the root `public_html`. No code changes are needed — the
build uses absolute paths (`/assets/...`) that work as long as the site is served from the folder
you point the domain/subdomain at.

---

## 3. Editing the site and rebuilding

You'll need **Node.js 18 or newer** installed on your computer ([nodejs.org](https://nodejs.org)).

### One-time setup

```bash
cd nle-react
npm install
```

### Preview changes locally while editing

```bash
npm run dev
```

This starts a local dev server (usually `http://localhost:5173`) with hot-reload — edit any file
in `src/` and the browser updates instantly. Press `Ctrl+C` to stop it.

### Build the final static files

```bash
npm run build
```

This regenerates the `dist/` folder. Re-upload its contents to Hostinger (Step 2 above) to publish
your changes. You can also run `npm run preview` to sanity-check the production build locally on
`http://localhost:4173` before uploading.

### Where to make common changes

| I want to change...                          | Edit this file                              |
|-----------------------------------------------|----------------------------------------------|
| Package names, prices, inclusions, reviews    | `src/data/products.js`                        |
| Weddings / Birthdays / Concerts / Corporate / Custom Events page copy | `src/data/categories.js` |
| Navigation links, cities list, search index   | `src/data/nav.js`                             |
| Images (stock photos, category tiles)         | `src/data/images.js` and `public/assets/images/` |
| WhatsApp number / default message             | `src/data/images.js` (`WHATSAPP_NUMBER`)      |
| Contact email                                 | search for `pixelbytes.work@gmail.com` across `src/pages/` and `src/components/` |
| Homepage sections (hero, FAQ, reviews, stats) | `src/pages/Home.jsx`                          |
| Header / footer / bottom nav                  | `src/components/Header.jsx`, `Footer.jsx`, `BottomNav.jsx` |
| Colors, fonts, spacing                        | `src/style.css`, `src/shop.css`, `src/responsive.css` |

---

## 4. Notes on functionality

- **Bookings are real and server-backed.** Customers configure packages and add-ons, review the cart, enter their contact details, and submit a booking request. The server validates the selected catalog items and recalculates the total before saving the booking to Supabase.
- **Every booking gets a unique reference** such as `NLE-2026-XXXXXXXXXX`. The reference is shown on confirmation and in the customer/admin booking records.
- **No online payment is processed.** Payment is intentionally outside the website checkout. The booking remains `pending` until the team reviews availability and confirms it.
- **Booking submission is retry-safe.** A unique request ID prevents accidental duplicate records if a customer double-clicks or retries after a network interruption.
- **Login, accounts and bookings are backed by Supabase.** Customer bookings are linked to the authenticated customer and appear under Account → My Bookings.
- **General enquiries** outside checkout still use WhatsApp/email links for a fast way to reach the team.
- **Client-side routing** is a single-page app; Vercel/Cloudflare rewrites send application routes to the SPA entry point.
- **Theme, city, and cart** choices are remembered locally per visitor.
- **Performance:** pages are code-split so visitors do not download the entire application on the first page load.

## 5. Troubleshooting

**Homepage loads but every other page shows a 404 on Hostinger.**
`.htaccess` didn't upload, or your hosting doesn't have `mod_rewrite` enabled (rare on Hostinger,
but check with support if this persists after confirming the file is present).

**Site loads but images are broken.**
Double-check you uploaded the entire `assets/` folder from inside `dist/`, including its `images/`
and `icons/` subfolders, and that folder structure was preserved during upload/extraction.

**I see an old cached version after uploading changes.**
Hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R). `index.html` is set to never be cached
(see `.htaccess`), but your browser or Hostinger's CDN (if enabled) may still cache old assets for
a bit — the built filenames change automatically on every rebuild, so this normally clears itself
on the next deploy.

**`npm install` or `npm run build` fails.**
Confirm you're using Node.js 18+ (`node -v`). Delete `node_modules` and `package-lock.json` if
present, then run `npm install` again.
# nl-events-main

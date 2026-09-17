# Chatbot — Setup & Notes

This site has a **guided, premium event-planning assistant**, reachable from:
- **Mobile / tablet** — the "Assistant" button on the floating bottom nav.
- **Desktop** (≥1180px, where the bottom nav is hidden) — an animated round launcher in the bottom-right corner (soft pulsing glow ring + twinkling sparkle badge, no looping bounce/sound — attention-grabbing without being annoying).

## TL;DR — it costs ₹0 / $0, forever

There is **no API key, no AI subscription, no backend server, and no usage limit** to worry about. The chatbot runs entirely in the visitor's browser, using data that already lives in this repo (your occasions/categories/products, services, packages, prices and FAQs). It:

- Needs **zero setup** — it works as soon as the site is built and deployed, exactly like the rest of this static React site.
- Makes **zero network requests** — no third-party API calls, so there's nothing to rate-limit, meter, or bill.
- Has **no ongoing cost**, no matter how many visitors chat with it or how many messages they send.
- Can never "break" because a free API tier expired, changed terms, or started charging — because there is no external API involved at all.

---

## Two conversation modes, one panel

### 1. Guided mode (the default) — "What are you planning?"

Inspired by the guided-picker UX pattern (options first, typing optional), not any particular brand's look. The flow:

1. **Occasion** — Wedding / Birthdays / Anniversary / Baby Shower / Kids' Birthday / Newborn Welcome / Other Event. This list is **not hard-coded** — it's read live from `src/data/occasions.js` (`listOccasions()`), so it always matches whatever's on the Shop-by-Occasion pages.
2. **Who's it for?** — a tailored question per occasion (e.g. Wife / Husband / Parents for a birthday), with a "Skip this" option.
3. **What kind of setup?** — Simple / Premium / Romantic / Theme-based / Surprise Setup (the subset offered is tailored per occasion), with a "surprise me" option.
4. **Recommendations** — the bot scores every real product under that occasion against the chosen style (keyword match + price tier vs. the occasion's own median price, falling back to popularity), and shows the top 4 as tappable product cards (image, price, discount badge, real link to the actual product page) — plus chips to drill into a specific category, which recurses through the same category → theme → product tree using `childrenOf()` / `productsOf()` from `occasions.js`.

**Back** (top-left, appears once you're past the first question) and **Restart** (top-right) are always available — Back re-asks the previous question, Restart clears the conversation back to "What are you planning?".

"Other Event" branches to the site's other service categories (Corporate, Concerts, Custom Events) since those live outside the occasions tree.

### 2. Freeform fallback — typed questions

Typing still works at any point. The bot first checks if what you typed matches one of the options currently on screen (so typing "wedding" advances the guided flow same as tapping it); if not, it falls back to the original rule-based engine for things like pricing, contact info, city coverage, or booking — with a "Back to guided suggestions" chip to hop back into the guided flow afterwards.

```
src/data/chatbotFlow.js        → guided-flow copy: whom/style questions & options, per occasion
src/lib/chatbotFlowEngine.js   → turns occasion/whom/style/trail selections into chat screens,
                                   reading live from src/data/occasions.js (the real product tree)
src/data/chatbotKnowledge.js   → freeform knowledge base (services/packages/FAQs/contact)
src/lib/chatbotEngine.js       → freeform "brain": matches typed text to an intent
src/context/ChatbotContext.jsx → chat state: messages, guided screen-stack (for Back), freeform fallback
src/components/Chatbot.jsx     → panel orchestrator
src/components/chatbot/        → ChatLauncher, ChatHeader, ChatMessage, ChatOption, ChatProductCard, TypingIndicator
src/styles/chatbot.css         → launcher animation, chips, product cards, mobile-friendly panel
```

### Adding/editing the guided flow

- **New occasion**: nothing to do — it's picked up automatically from `occasions.js`/`OccasionBrowser`. Optionally add a `WHOM_QUESTIONS[slug]` entry in `chatbotFlow.js` for a tailored "who's it for?" question (falls back to a generic one otherwise), and/or a `STYLE_OPTIONS_BY_OCCASION[slug]` entry to control which of the 5 styles are offered and in what order.
- **New style**: add a key to `STYLE_LIBRARY` in `chatbotFlow.js` with a `label`, `keywords` (matched against product/category name & description to rank recommendations) and a `blurb` (used in the recommendation sentence).
- **Recommendation ranking**: see `scoreProductForStyle()` in `chatbotFlowEngine.js` — keyword overlap first, then a price-tier bonus for the "simple"/"premium" styles (compared against the occasion's median price), then site popularity as a tiebreaker.

### Freeform: adding or editing what the fallback engine can answer

**To change wording of an existing answer:** edit the relevant `text` in `src/lib/chatbotEngine.js` (for the built-in intents) or `FAQS` in `src/data/chatbotKnowledge.js`.

**To teach it a new topic**, add a new entry to the `INTENTS` array in `chatbotEngine.js`:

```js
{
  id: "refund_policy",
  keywords: ["refund", "cancel", "cancellation", "reschedule"],
  reply() {
    return {
      text: "Your reply text here.",
      quickReplies: [{ label: "Main menu", message: "menu" }],
    };
  },
},
```

- `keywords` — words/phrases that should trigger this intent. Multi-word phrases (e.g. `"how do i book"`) score higher than single words, so use them for more specific matches.
- `reply(text)` — returns `{ text, quickReplies }`. `text` supports `\n` for line breaks (rendered as separate paragraphs).
- `quickReplies` items can be:
  - `{ label, message }` — tapping it sends that message into the chat (chains to another intent).
  - `{ label, href }` — tapping it navigates to that page (e.g. `/packages`). Add `external: true` for `tel:`/`mailto:` links.
  - `{ label, whatsapp: "message text" }` — opens WhatsApp with that pre-filled message.

### Escalation to a human

Every guided screen and most freeform replies include a "Talk to a human" / "Chat on WhatsApp" option, pre-filled with context about what the visitor was looking at. This uses the existing `waLink()`-style helper (`whatsappHandoffLink()` in `chatbotEngine.js`) and `WHATSAPP_NUMBER` from `src/data/images.js` — no separate setup needed.

---

## Security & reliability

A few things worth knowing:

- **No secrets, no attack surface.** There's no API key anywhere in this feature, no server, no database — nothing to leak or misuse.
- **Not vulnerable to injection/XSS.** Everything a visitor types is treated as plain text (React escapes it automatically) — it's never inserted as HTML and never used to build a link's URL scheme. When a message is handed off to WhatsApp, it only ever fills the `text=` query parameter of a fixed `wa.me/<number>` link, and is properly URL-encoded first.
- **Can't crash the site.** The chatbot is wrapped in its own error boundary (`src/components/ErrorBoundary.jsx`) in `Layout.jsx`. If a future edit introduces a bug in the chatbot, it will quietly disable itself — the rest of the site (header, pages, footer, WhatsApp button, cart) keeps working normally. There's also a site-wide error boundary in `main.jsx` as a last line of defence, showing a "please refresh" screen instead of a blank page for any unrelated error.
- **Handles bad input gracefully.** Empty messages, very long messages (capped at 500 characters), and unrecognised text are all handled without errors — the bot just falls back to its "not sure, here's WhatsApp" reply.
- **Fixed a latent infinite-loop bug while wiring this up.** `buildGallery()` in `src/data/occasions.js` used to pick 4 "also see" images by stepping through a pool with a fixed stride of 7; because a few of the stock photo URLs in the pool are accidental duplicates, the pool size after de-duplication could land on a multiple of 7 (e.g. 21), which made the stride only ever visit 3 distinct slots — an infinite loop for any product hitting that case. It never surfaced before because `occasions.js` was only pulled in by the occasion-browsing pages; the guided chatbot now reads the same product tree from the app root, so this was replaced with a seeded Fisher–Yates shuffle that's guaranteed to terminate (and still gives each product a stable, repeatable gallery order).

---

## SEO

The site now has a full, zero-cost SEO setup:

- **Every page has its own `<title>` and meta description** (via `usePageMeta`), not just the homepage — set in each page file (e.g. `src/pages/Contact.jsx`). Previously these only ever updated the browser tab; they now also drive the canonical URL, Open Graph and Twitter Card tags below.
- **Open Graph + Twitter Card tags** — so links shared on WhatsApp, Facebook, Instagram, LinkedIn, etc. show a proper title, description and image instead of a blank/generic preview.
- **JSON-LD structured data** (`EventPlanner` schema in `index.html`) — tells Google your business name, phone, address, and the exact 25 Jharkhand districts you serve, for local search / Google Business-style results.
- **`robots.txt`** and **`sitemap.xml`** in `public/` — tell search engines every page exists and how often to recheck it.
- **`noindex` on thin pages** — the booking-confirmation and 404 pages are excluded from search results (they're not useful landing pages), while every real content page stays indexable.

### ⚠️ One thing you must update

Every canonical/OG/sitemap/robots URL currently points to the placeholder domain `https://nextlevelevents.in`. **Before this goes live, update `SITE_URL` in `src/hooks/usePageMeta.js`, and the URLs in `index.html`, `public/robots.txt` and `public/sitemap.xml`, to your actual live domain** — otherwise search engines and social previews will point back to the wrong address. A find-and-replace of `nextlevelevents.in` across those four files is all it takes.

Two more things worth doing once the site is live (not code changes, just admin steps — free):
- Submit `https://<yourdomain>/sitemap.xml` to [Google Search Console](https://search.google.com/search-console) so Google indexes it faster.
- Add a proper 1200×630 `og-image.jpg` in `public/assets/images/brand/` (the current OG image is the small logo, which works but isn't ideal for link-preview cropping) and point `DEFAULT_IMAGE` in `usePageMeta.js` at it.

---

## City-based pricing

Prices now vary by the visitor's selected city (top of the site). Ranchi is the base/HQ city with no surcharge; the other 24 Jharkhand districts each carry a small placeholder multiplier reflecting travel/logistics difficulty — see `src/lib/pricing.js`.

- **This affects every price shown site-wide**: package cards, package details, add-ons, the cart, the payment modal, occasion product pages, and the chatbot's product recommendations and pricing answers.
- **The multipliers are placeholders** ("add price by your choice as of now, I'll provide the original pricing later") — open `src/lib/pricing.js` and edit the `CITY_MULTIPLIERS` map with real numbers whenever you have them. Every price on the site updates automatically from that one file.
- Base prices themselves (the Ranchi numbers) live in `src/data/products.js`, `src/data/categories.js` and `src/data/occasions.js`, unchanged from before — the multiplier is applied on top at display time, it doesn't touch the stored base price.
- If you'd rather set an exact price per package per city instead of a percentage multiplier, that's also easy to switch to later — replace the body of `cityPrice()` in `src/lib/pricing.js` with a lookup table, and every call site keeps working unchanged.

---

## Testing it locally

```bash
npm install
npm run dev
```

Open the site, then either resize your browser below ~1180px and use the bottom nav's "Assistant" button, or (on a wider screen) use the round animated launcher in the bottom-right corner.

Try the guided flow:
- Tap **Wedding** → tap a "who's it for" option → tap **Premium** → see 4 real product cards with working links, plus category chips (Mandap & Ceremony Decor, Reception Styling, Haldi & Mehendi) to drill deeper.
- Tap **Back** partway through — it re-asks the previous question.
- Tap **Restart** (top-right) — resets to the first question.
- Tap **Other Event** — see Weddings/Birthdays/Concerts/Corporate/Custom links.

Some things to try typing (freeform fallback):
- "Hi"
- "What services do you offer?"
- "Tell me about the Dream Wedding package"
- "How much does a wedding cost?"
- "Do you serve Mumbai?"
- "How do I book an event?"
- "I want to talk to a human"

## Deploying

No change to your deployment process. This is still a plain static build:

```bash
npm run build
```

`dist/` is produced exactly as before (same `.htaccess`, same static hosting) — the chatbot is just more JS/CSS bundled into the existing `index-*.js` / `index-*.css` files. There is no server, function, or environment variable to configure.

---

## Optional: upgrading to a hosted AI model later

If you ever *do* want the bot to hold open-ended, free-text conversations (not just your site's content), you can layer a hosted AI model on top of this later. A few notes if you go that route:

- **This is optional and not enabled** — the current setup already fully works and costs nothing. Only consider this if you specifically want free-form AI chat beyond guided occasion/style browsing plus services/pricing/booking.
- Providers with a genuinely free tier as of writing include Groq (fast, generous free rate limits) and Google's Gemini API (free tier). Terms and limits change over time, so check current pricing before relying on one.
- **Never call a paid/keyed API directly from this client-side app.** Any API key placed in frontend code is publicly visible in the browser and can be stolen and abused, potentially running up a bill on your account. You'd need a small serverless function (e.g. a free Cloudflare Worker or Vercel Function) to hold the key and proxy requests — which is a real backend, unlike everything described above.
- A sensible middle ground: keep the guided flow + rule-based engine as the first responder (fast, free, accurate about your business), and only fall back to a hosted model for messages it doesn't recognise — capping the number of AI calls per visitor to control cost.

None of this is required to use the chatbot as shipped — it's fully functional today.


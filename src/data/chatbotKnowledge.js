// Knowledge base for the on-site chatbot.
// Everything here is plain data — no API keys, no network calls, no cost.
// It reuses the site's own CATEGORIES/PRODUCTS data so answers stay in sync
// with what's actually on the pages.

import { CATEGORIES } from "./categories";
import { PRODUCTS } from "./products";
import { CITIES } from "./nav";
import { WHATSAPP_NUMBER } from "./images";

export const BRAND_NAME = "Next Level Events";

export const CONTACT = {
  phone: "+91 7903 133 317",
  phoneHref: "tel:+917903133317",
  email: "nextlevel.events25@gmail.com",
  instagram: "@nextlevelevents.in",
  facebook: "https://www.facebook.com/nextlevelevents.in",
  youtube: "https://www.youtube.com/@nextlevelevents25",
  linkedin: "https://www.linkedin.com/in/sumit-verma-kumar/",
  studio: "Kanke Road, Beside Chef's Chaupati, Jhigra Toli, Gandhi Nagar, Ranchi, Jharkhand 834002",
  whatsappNumber: WHATSAPP_NUMBER,
};

// Short, chat-friendly summaries of each event category (built from categories.js
// so the chatbot never says something that contradicts the Services pages).
// basePrice is the Ranchi (home-city) price, in rupees — null means bespoke/
// "Contact for pricing". Actual city-adjusted prices are computed at
// display/reply time via src/lib/pricing.js, using the visitor's selected city.
export const CATEGORY_SUMMARY = Object.entries(CATEGORIES).map(([slug, c]) => ({
  slug,
  href: "/" + slug,
  name: c.eyebrow,
  lead: c.lead,
  basePrice: (c.packages || []).map((p) => p.price).find((p) => typeof p === "number") ?? null,
}));

// Flat, searchable list of every package (built from products.js).
export const PACKAGE_SUMMARY = Object.values(PRODUCTS).map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  basePrice: p.price,
  tagline: p.tagline,
  includes: p.includes,
  href: "/package-details?id=" + p.id,
}));

export const FAQS = [
  { q: "How far in advance should I book?", a: "We recommend booking 6–8 weeks ahead for weddings and 2–3 weeks for birthdays or smaller celebrations, though shorter timelines can often be accommodated." },
  { q: "Can packages be customised?", a: "Yes — every package is a starting point. Décor, catering, entertainment and guest count are all tailored to your budget and vision." },
  { q: "Which cities do you operate in?", a: "We're based in Ranchi and primarily serve events across Jharkhand, with select bookings taken in nearby states and cities like " + CITIES.slice(0, 6).join(", ") + " and more." },
  { q: "What is the payment structure?", a: "A booking advance confirms your date, with the balance split across milestones leading up to your event. Full details are shared in your quote." },
  { q: "Do you handle vendor coordination?", a: "Yes — décor, catering, lighting and entertainment are all coordinated through one dedicated point of contact." },
  { q: "Do you travel outside Ranchi for events?", a: "Yes, we regularly take bookings across Jharkhand and select nearby states. Share your city and we'll confirm availability and any travel cost." },
  { q: "Does pricing change by city?", a: "Yes — Ranchi is our base city with no travel surcharge. Other Jharkhand districts carry a small logistics adjustment on top of the base price, shown automatically for whichever city you've selected at the top of the site." },
  { q: "How do I get a quote?", a: "Use the \"Book Event\" page or tell me your event type, date, guest count and budget here, and our team will follow up with a tailored quote — usually within a couple of hours." },
  { q: "Where can I read your terms and privacy policy?", a: "You'll find our Terms of Service and Privacy Policy linked at the bottom of every page (footer)." },
];

export const QUICK_MENU = [
  { label: "See our services", message: "What services do you offer?" },
  { label: "Packages & pricing", message: "Show me packages and pricing" },
  { label: "Book an event", message: "How do I book an event?" },
  { label: "Talk to a human", message: "I want to talk to a human" },
];

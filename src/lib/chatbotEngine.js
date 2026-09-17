// Fully client-side, rule-based chatbot "brain".
//
// The event planning chat runs locally in the visitor's browser, so it can
// provide quick answers without requiring a separate service.

import { CATEGORY_SUMMARY, PACKAGE_SUMMARY, FAQS, CONTACT, BRAND_NAME } from "../data/chatbotKnowledge";
import { CITIES } from "../data/nav";
import { waLink } from "../data/images";
import { cityPrice, fmtINR } from "./pricing";

function norm(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9\s₹]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreKeywords(text, keywords) {
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) score += kw.split(" ").length; // multi-word keywords score higher
  }
  return score;
}

// City-adjusted price for a base rupee amount, or "Contact for pricing" if
// there's no fixed base price (bespoke packages).
function money(basePrice, city) {
  if (typeof basePrice !== "number") return "Contact for pricing";
  return fmtINR(cityPrice(basePrice, city));
}

function findPackageMatch(text) {
  return PACKAGE_SUMMARY.find((p) => text.includes(p.name.toLowerCase()));
}

function findCategoryMatch(text) {
  return CATEGORY_SUMMARY.find((c) => {
    const slugWords = c.slug.replace("-", " "); // e.g. "custom events"
    const nameLower = c.name.toLowerCase(); // e.g. "weddings", "concerts & shows"
    const singularSlug = slugWords.replace(/s\b/, ""); // "wedding", "birthday"
    const singularName = nameLower.replace(/s\b/, "");
    return text.includes(slugWords) || text.includes(nameLower) || text.includes(singularSlug) || text.includes(singularName);
  });
}

function findCityMatch(text) {
  return CITIES.find((c) => text.includes(c.toLowerCase()));
}

// A short note appended to price replies when the visitor isn't in Ranchi
// (the base/HQ city), so the price shown is never a surprise.
function cityNote(city) {
  return city && city !== "Ranchi" ? " (price shown for " + city + " — Ranchi is our base city with no travel surcharge)" : "";
}

const INTENTS = [
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "namaste", "good morning", "good evening", "good afternoon"],
    reply() {
      return {
        text: "Hi! I'm the " + BRAND_NAME + " event planner \uD83D\uDC4B I can help with services, packages & pricing, booking, or your city's availability. What are you planning?",
        quickReplies: [
          { label: "Weddings", message: "Tell me about wedding packages" },
          { label: "Birthdays", message: "Tell me about birthday packages" },
          { label: "Corporate", message: "Tell me about corporate events" },
          { label: "Something else", message: "menu" },
        ],
      };
    },
  },
  {
    id: "thanks",
    keywords: ["thank", "thanks", "thank you", "thx", "great", "awesome", "cool"],
    reply() {
      return { text: "Anytime! Anything else I can help you plan?", quickReplies: [{ label: "Main menu", message: "menu" }] };
    },
  },
  {
    id: "menu",
    keywords: ["menu", "help", "options", "what can you do"],
    reply() {
      return {
        text: "Here's what I can help with:",
        quickReplies: [
          { label: "Our services", message: "What services do you offer?" },
          { label: "Packages & pricing", message: "Show me packages and pricing" },
          { label: "Booking process", message: "How do I book an event?" },
          { label: "Cities we cover", message: "Which cities do you cover?" },
          { label: "Contact details", message: "How do I contact you?" },
          { label: "Talk to a human", message: "I want to talk to a human" },
        ],
      };
    },
  },
  {
    id: "services_overview",
    keywords: ["service", "services", "what do you do", "what do you offer", "categories", "event types", "type of event"],
    reply(text, city) {
      const lines = CATEGORY_SUMMARY.map((c) => "• " + c.name + " — from " + money(c.basePrice, city)).join("\n");
      return {
        text: "We plan and produce:\n" + lines + cityNote(city) + "\n\nWhich one would you like to explore?",
        quickReplies: CATEGORY_SUMMARY.map((c) => ({ label: c.name, href: c.href })),
      };
    },
  },
  {
    id: "packages_overview",
    keywords: ["package", "packages", "pricing", "price", "cost", "how much", "rate", "budget", "charges"],
    reply(text, city) {
      const pkg = findPackageMatch(text);
      if (pkg) {
        return {
          text: pkg.name + " — " + money(pkg.basePrice, city) + cityNote(city) + "\n" + pkg.tagline + "\n\nIncludes: " + pkg.includes.slice(0, 5).join(", ") + (pkg.includes.length > 5 ? " and more." : "."),
          quickReplies: [
            { label: "View full package", href: pkg.href },
            { label: "Enquire on WhatsApp", whatsapp: "Hi! I'm interested in the " + pkg.name + " package." },
            { label: "See other packages", message: "Show me packages and pricing" },
          ],
        };
      }
      const cat = findCategoryMatch(text);
      const list = cat
        ? PACKAGE_SUMMARY.filter((p) => p.category === cat.slug.replace(/s$/, ""))
        : PACKAGE_SUMMARY.slice(0, 6);

      if (cat && list.length === 0) {
        // e.g. "Custom Events" — genuinely bespoke, priced only after a chat, so
        // there's no fixed-price package list to show. Don't render an empty list.
        const priceNote = cat.basePrice != null ? " starting from " + money(cat.basePrice, city) + cityNote(city) : "";
        return {
          text: cat.name + " are fully bespoke, so pricing is quoted after a quick chat about your idea" + priceNote + ".",
          quickReplies: [
            { label: "See " + cat.name, href: cat.href },
            { label: "Chat on WhatsApp", whatsapp: "Hi! I'd like a quote for a " + cat.name.toLowerCase() + " event." },
          ],
        };
      }

      const lines = list.map((p) => "• " + p.name + " — " + money(p.basePrice, city)).join("\n");
      return {
        text: (cat ? cat.name + " packages start from:\n" : "Popular packages:\n") + lines + cityNote(city) + "\n\nWant details on any of these, or see the full list?",
        quickReplies: [
          { label: "See all packages", href: "/packages" },
          { label: "Talk to a human", message: "I want to talk to a human" },
        ],
      };
    },
  },
  {
    id: "booking_process",
    keywords: ["book", "booking", "how do i book", "reserve", "how to book", "quote", "enquire", "enquiry"],
    reply() {
      return {
        text: "Booking is simple: open \"Book Event\", tell us your event type, date, guest count and budget, and our team replies with a tailored quote — usually within a couple of hours. A booking advance then confirms your date.",
        quickReplies: [
          { label: "Book an event", href: "/book-event" },
          { label: "Chat on WhatsApp instead", whatsapp: "Hi! I'd like to enquire about booking an event." },
        ],
      };
    },
  },
  {
    id: "cities",
    keywords: ["city", "cities", "location", "where are you", "based in", "cover", "travel to", "serve"],
    reply(text) {
      const matchedCity = findCityMatch(text);
      if (matchedCity) {
        return {
          text: "Yes, we take bookings in " + matchedCity + "! Pricing there includes a small travel/logistics adjustment over our Ranchi base rate. Share your event date and guest count and we'll confirm availability.",
          quickReplies: [{ label: "Book an event", href: "/book-event" }, { label: "Chat on WhatsApp", whatsapp: "Hi! I'd like to check availability in " + matchedCity + "." }],
        };
      }
      return {
        text: "We're based in Ranchi (our HQ, no travel surcharge) and take bookings across all of Jharkhand's districts — including " + CITIES.slice(1, 9).join(", ") + " and more. Prices outside Ranchi include a small logistics adjustment. Tell me your city and I'll check.",
        quickReplies: [{ label: "Book an event", href: "/book-event" }],
      };
    },
  },
  {
    id: "contact",
    keywords: ["contact", "phone", "number", "email", "call you", "reach you", "address", "studio", "instagram", "facebook", "youtube", "linkedin", "social"],
    reply() {
      return {
        text: "You can reach us at:\nPhone/WhatsApp: " + CONTACT.phone + "\nEmail: " + CONTACT.email + "\nInstagram: " + CONTACT.instagram + "\nStudio: " + CONTACT.studio + "\n\nWe're also on Facebook, YouTube and LinkedIn — links on our Contact page.",
        quickReplies: [
          { label: "Call now", href: CONTACT.phoneHref, external: true },
          { label: "Chat on WhatsApp", whatsapp: "Hi! I have a question for the Next Level Events team." },
          { label: "Contact page", href: "/contact" },
        ],
      };
    },
  },
  {
    id: "human_handoff",
    keywords: ["human", "agent", "real person", "talk to someone", "representative", "not helpful", "speak to"],
    reply() {
      return {
        text: "Of course — our team is happy to take it from here on WhatsApp or by phone.",
        quickReplies: [
          { label: "Chat on WhatsApp", whatsapp: "Hi! I'd like to speak with your team." },
          { label: "Call " + CONTACT.phone, href: CONTACT.phoneHref, external: true },
        ],
      };
    },
  },
  {
    id: "gallery",
    keywords: ["gallery", "photos", "portfolio", "past events", "examples", "see your work"],
    reply() {
      return { text: "You can browse real setups from past weddings, birthdays, concerts and corporate events in our gallery.", quickReplies: [{ label: "Open gallery", href: "/gallery" }] };
    },
  },
  {
    id: "about",
    keywords: ["about", "who are you", "company", "your team", "based"],
    reply() {
      return { text: BRAND_NAME + " is an event planning & production studio based in Ranchi, Jharkhand — we design and run weddings, birthdays, concerts, corporate events and fully custom celebrations end-to-end.", quickReplies: [{ label: "About us", href: "/about" }] };
    },
  },
];

function faqMatch(text) {
  let best = null;
  let bestScore = 0;
  for (const f of FAQS) {
    const score = scoreKeywords(text, norm(f.q).split(" ").filter((w) => w.length > 3));
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return { faq: bestScore >= 2 ? best : null, score: bestScore };
}

const GREETED_KEY = "chatbot-menu-shown";

export function getBotReply(rawText, city) {
  const text = norm(rawText);
  if (!text) return { text: "Could you type that again? I didn't catch anything.", quickReplies: [] };

  // Score both a specific intent and a close-worded FAQ, then take whichever
  // is the stronger, more specific match for this message.
  const { faq, score: faqScore } = faqMatch(text);

  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = scoreKeywords(text, intent.keywords);
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  if (faq && faqScore > bestScore) {
    return { text: faq.a, quickReplies: [{ label: "Main menu", message: "menu" }] };
  }
  if (best && bestScore >= 1) {
    return best.reply(text, city);
  }
  if (faq) {
    return { text: faq.a, quickReplies: [{ label: "Main menu", message: "menu" }] };
  }

  return {
    text: "I'm not totally sure about that one — but our team can help directly. You can also try asking about services, packages & pricing, booking, or the cities we cover.",
    quickReplies: [
      { label: "Main menu", message: "menu" },
      { label: "Chat on WhatsApp", whatsapp: rawText ? "Hi! " + rawText : "Hi! I have a question." },
    ],
  };
}

export function whatsappHandoffLink(message) {
  return waLink(message);
}

export { GREETED_KEY };

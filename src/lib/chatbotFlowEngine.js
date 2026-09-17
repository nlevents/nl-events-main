// ===========================================================
// Guided chatbot flow engine.
//
// Pure functions that turn { occasion, whom, style, trail } selections into
// the next chat "screen" (question text + quick-reply options + optional
// product recommendations). Everything here reads live from
// src/data/occasions.js, so the bot can never recommend a category or
// product that isn't actually on the site — there is nothing to keep in
// sync by hand.
//
// This module knows nothing about React/UI — src/context/ChatbotContext.jsx
// drives it and turns the return values into chat messages.
// ===========================================================

import {
  listOccasions,
  findOccasion,
  resolvePath,
  childrenOf,
  productsOf,
  allProductsOf,
  pathFor,
  discountPercent,
} from "../data/occasions";
import { CATEGORIES } from "../data/categories";
import { cityPriceLabel } from "./pricing";
import { whomStepFor, styleStepFor, OTHER_EVENT_OPTION, OCCASION_EMOJI, STYLE_LIBRARY } from "../data/chatbotFlow";

const MAX_RECOMMENDATIONS = 4;
const TOTAL_STEPS = 3;

function norm(str) {
  return (str || "").toLowerCase();
}

// ---------- Step 1 ----------
export function occasionOptions() {
  const opts = listOccasions().map((o) => ({ label: o.label, value: o.slug, image: o.image, emoji: OCCASION_EMOJI[o.slug] || "\u2728" }));
  return [...opts, OTHER_EVENT_OPTION];
}

export function occasionGreeting() {
  return {
    text: "First — what are we celebrating?",
    subtitle: "Hi! Let's find your perfect setup \u2728",
    step: 1,
    stepTotal: TOTAL_STEPS,
    options: occasionOptions().map((o) => ({ label: o.label, emoji: o.emoji, action: { type: "occasion", value: o.value } })),
  };
}

// ---------- Step 2: whom ----------
export function whomScreen(occasionSlug) {
  const occasion = findOccasion(occasionSlug);
  const { question, options } = whomStepFor(occasionSlug);
  const emoji = occasion ? OCCASION_EMOJI[occasion.slug] : null;
  return {
    text: question,
    subtitle: occasion ? (emoji ? emoji + " " : "") + occasion.label : null,
    step: 2,
    stepTotal: TOTAL_STEPS,
    options: [
      ...options.map((o) => ({ label: o.label, emoji: o.emoji, action: { type: "whom", value: o.value, label: o.label, phrase: o.phrase } })),
    ],
    skip: { label: "Skip this \u2192", action: { type: "whom", value: null, label: null, phrase: null } },
  };
}

// ---------- Step 3: style ----------
export function styleScreen(occasionSlug, whomPhrase) {
  const styles = styleStepFor(occasionSlug);
  return {
    text: "Last one — what kind of setup are you looking for?",
    subtitle: whomPhrase ? "For " + whomPhrase : null,
    step: 3,
    stepTotal: TOTAL_STEPS,
    options: [
      ...styles.map((s) => ({ label: s.label, emoji: s.emoji, action: { type: "style", value: s.value, label: s.label } })),
    ],
    skip: { label: "Surprise me \u2192", action: { type: "style", value: null, label: null } },
  };
}

// ---------- Scoring helpers ----------
function productText(product) {
  return norm([product.name, product.shortDesc, product.setupType, product.slug].filter(Boolean).join(" "));
}

function keywordScore(text, keywords) {
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) score += 1;
  }
  return score;
}

// Ranks a product against a chosen style: keyword overlap first, then (for
// the "simple"/"premium" price-tier styles) a price comparison against the
// occasion's own median, then falls back to the site's popularity score so
// results are never arbitrary even with zero keyword matches.
function scoreProductForStyle(product, styleKey, medianPrice) {
  if (!styleKey) return product.popularity || 0;
  const meta = STYLE_LIBRARY[styleKey];
  if (!meta) return product.popularity || 0;
  let score = keywordScore(productText(product), meta.keywords) * 20;
  if (meta.priceTier === "low" && typeof product.price === "number" && medianPrice) {
    score += product.price <= medianPrice ? 12 : 0;
  }
  if (meta.priceTier === "high" && typeof product.price === "number" && medianPrice) {
    score += product.price >= medianPrice ? 12 : 0;
  }
  return score + (product.popularity || 0) / 10;
}

function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function toProductCard(product, trail, city) {
  return {
    id: product.id,
    name: product.name,
    image: product.image,
    price: cityPriceLabel(product.price, city),
    originalPrice: typeof product.originalPrice === "number" ? cityPriceLabel(product.originalPrice, city) : null,
    discount: discountPercent(product),
    href: pathFor(trail),
  };
}

// Finds the trail (ancestor chain) to a specific product within a node,
// needed to build a correct href — allProductsOf() only returns products.
function trailToProduct(node, baseTrail, product) {
  if (node === product) return baseTrail;
  for (const p of node.products || []) {
    if (p === product) return [...baseTrail, p];
  }
  for (const child of node.children || []) {
    const found = trailToProduct(child, [...baseTrail, child], product);
    if (found) return found;
  }
  return null;
}

// ---------- Step 4: recommendations at the occasion root, biased by style ----------
export function recommendationScreen({ occasionSlug, whomPhrase, styleKey, styleLabel, city }) {
  const occasion = findOccasion(occasionSlug);
  if (!occasion) return otherEventScreen();

  const all = allProductsOf(occasion);
  const med = median(all.map((p) => p.price).filter((n) => typeof n === "number"));
  const ranked = [...all].sort((a, b) => scoreProductForStyle(b, styleKey, med) - scoreProductForStyle(a, styleKey, med));
  const top = ranked.slice(0, MAX_RECOMMENDATIONS);
  const products = top.map((p) => toProductCard(p, trailToProduct(occasion, [occasion], p) || [occasion], city));

  const categories = childrenOf(occasion).map((c) => ({
    label: c.label,
    action: { type: "browse", trail: [occasionSlug, c.slug], label: c.label },
  }));

  const styleMeta = styleKey ? STYLE_LIBRARY[styleKey] : null;
  const forWhom = whomPhrase ? " for " + whomPhrase : "";
  const styleBit = styleMeta ? " with " + styleMeta.blurb : "";
  const text = "Here's what I'd recommend for the " + occasion.label + forWhom + styleBit + ":";

  return {
    text,
    products,
    trail: [occasionSlug],
    step: TOTAL_STEPS,
    stepTotal: TOTAL_STEPS,
    options: [
      ...categories.map((c) => c.action && ({ label: c.label, action: c.action })),
      { label: "See all " + occasion.label, action: { type: "link", href: pathFor([occasion]) } },
      { label: "Try a different style", action: { type: "style-again", occasionSlug, whomPhrase } },
      { label: "Talk to a human", action: { type: "whatsapp", message: "Hi! I'm planning a " + occasion.label.toLowerCase() + (styleLabel ? " (" + styleLabel + " style)" : "") + " and would love some help." } },
    ].filter(Boolean),
  };
}

// ---------- Browsing deeper into the tree (categories → themes → products) ----------
export function browseScreen(trail, city) {
  const resolved = trail.length === 1 ? { node: findOccasion(trail[0]), trail: [findOccasion(trail[0])] } : resolvePath(trail);
  if (!resolved || !resolved.node) return otherEventScreen();
  const { node, trail: fullTrail } = resolved;

  if (node.type === "product") {
    const card = toProductCard(node, fullTrail, city);
    return {
      text: node.name + " — here's a closer look:",
      products: [card],
      trail,
      options: [
        { label: "View full details", action: { type: "link", href: pathFor(fullTrail) } },
        { label: "See similar options", action: { type: "back" } },
        { label: "Talk to a human", action: { type: "whatsapp", message: "Hi! I'm interested in " + node.name + "." } },
      ],
    };
  }

  const kids = childrenOf(node);
  const directProducts = productsOf(node).slice(0, MAX_RECOMMENDATIONS).map((p) => toProductCard(p, [...fullTrail, p], city));
  const childOptions = kids.map((c) => ({ label: c.label, action: { type: "browse", trail: [...trail, c.slug], label: c.label } }));

  const label = node.label || node.name;
  const text = directProducts.length && kids.length
    ? label + " — here are a few options, or narrow it down further:"
    : directProducts.length
      ? label + " — here's what's available:"
      : "Great choice — " + label + ". What are you drawn to?";

  return {
    text,
    products: directProducts,
    trail,
    options: [
      ...childOptions,
      { label: "See all in " + label, action: { type: "link", href: pathFor(fullTrail) } },
      { label: "Talk to a human", action: { type: "whatsapp", message: "Hi! I'm interested in " + label + "." } },
    ],
  };
}

// ---------- "Other Event" branch (corporate / concerts / custom — outside the occasions tree) ----------
export function otherEventScreen() {
  const others = ["weddings", "birthdays", "concerts", "corporate", "custom-events"];
  const options = others
    .filter((slug) => CATEGORIES[slug])
    .map((slug) => ({ label: CATEGORIES[slug].eyebrow, action: { type: "link", href: "/" + slug } }));
  return {
    text: "No problem — we plan all kinds of events. Which of these is closest, or tell me a bit about it and I'll do my best to help?",
    options: [
      ...options,
      { label: "Talk to a human", action: { type: "whatsapp", message: "Hi! I have an event that doesn't fit a standard category — could you help?" } },
    ],
  };
}

export const _internal = { scoreProductForStyle, median };
